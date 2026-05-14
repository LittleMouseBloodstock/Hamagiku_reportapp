'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Save, Printer, Check, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { generateReportV2, submitReportFeedback, translateText } from '@/lib/api';
import { FEATURE_FLAGS } from '@/lib/featureFlags';
import { getPlanCapabilities, normalizePlan, type Plan } from '@/lib/planCapabilities';
import { extractReportAssetPath, resolveReportAssetUrl, uploadReportAsset } from '@/lib/storage';
import { normalizeHorseSex } from '@/lib/horseProfile';

type OutputMode = 'japanese_only' | 'english_only' | 'bilingual';

type WeightHistoryEntry = ReportData['weightHistory'][number];
type CareRecordEntry = ReportData['careRecords'][number];

function normalizeAssetRef(assetRef?: string | null) {
    if (!assetRef) return '';
    return extractReportAssetPath(assetRef) || assetRef;
}

function sanitizeTranslatedComment(
    sourceText: string,
    translatedText: string,
    targetLang: 'ja' | 'en',
): string {
    const containsJapanese = (value: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(value);
    const containsEnglish = (value: string) => /[A-Za-z]/.test(value);
    const isHorseNameHeading = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return false;
        if (trimmed.length > 60) return false;
        if (/[。！？.!?]/.test(trimmed)) return false;
        const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
        if (wordCount > 6) return false;
        return /^[A-Za-z0-9 .,'’()\-/:&]+(?:\s*\([A-Za-z0-9 .,'’()\-/:&]+\))?$/.test(trimmed);
    };
    const sentenceLikeParts = (value: string) =>
        value
            .replace(/\r\n/g, '\n')
            .split(/(?<=[。！？.!?])\s+|\n+/)
            .map((part) => part.trim())
            .filter(Boolean);

    const sourceLines = new Set(
        sourceText
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean),
    );

    const normalizedText = translatedText
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\*\*/g, '')
        .replace(/^\s*"(generated_text|rationale|internal_notes)"\s*:\s*/gim, '')
        .replace(/^\s*(generated_text|rationale|internal_notes)\s*:\s*/gim, '')
        .replace(/^The [`'"]?draftText[`'"]?.*$/gim, '')
        .replace(/^The user wants.*$/gim, '')
        .replace(/^[*-]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/,\s*$/gm, '')
        .replace(/^"+|"+$/gm, '')
        .replace(/\r\n/g, '\n')
        .trim();

    return sentenceLikeParts(normalizedText)
        .filter((part) => {
            if (!part) return false;
            if (sourceLines.has(part)) return false;
            if (isHorseNameHeading(part)) return false;
            if (/^(generated_text|rationale|internal_notes)\b/i.test(part)) return false;
            if (/^The [`'"]?draftText[`'"]?/i.test(part)) return false;
            if (/^The user wants/i.test(part)) return false;

            if (targetLang === 'ja') {
                if (!containsJapanese(part)) return false;
            }

            if (targetLang === 'en') {
                if (containsJapanese(part)) return false;
                if (!containsEnglish(part)) return false;
            }

            return true;
        })
        .join('\n\n')
        .trim();
}

function sanitizeGeneratedComment(text: string, targetLang: 'ja' | 'en'): string {
    return sanitizeTranslatedComment('', text, targetLang);
}

function formatGenerationError(error: unknown, fallback: string): string {
    if (!(error instanceof Error)) return fallback;

    let message = error.message || fallback;
    message = message.replace(/^JA generation failed:\s*/i, '').replace(/^EN generation failed:\s*/i, '');

    if (/gemini_quota_exceeded|quota exceeded|Too Many Requests/i.test(message)) {
        return 'Gemini API の利用上限に達しました。少し待って再試行するか、利用枠を確認してください。';
    }

    if (/temporarily unavailable|high demand|Service Unavailable|503/i.test(message)) {
        return 'Gemini API が一時的に混雑しています。少し待ってから再試行してください。';
    }

    return message;
}

function formatWeightHistoryLabel(measuredAt: string, language: 'ja' | 'en'): string {
    const [year, month] = measuredAt.split('-').map((value) => parseInt(value, 10));
    if (!year || !month) return measuredAt;
    return language === 'ja'
        ? `${month}月`
        : new Date(year, month - 1, 1).toLocaleString('en-GB', {
            month: 'short',
            year: 'numeric',
        });
}

function buildWeightHistoryFromHorseWeights(
    rows: { measured_at: string; weight: number | null }[] | null | undefined,
    language: 'ja' | 'en',
): WeightHistoryEntry[] {
    return (rows || [])
        .map((row) => {
            const measuredAt = row.measured_at.slice(0, 7);
            return {
                measuredAt,
                label: formatWeightHistoryLabel(measuredAt, language),
                value: row.weight || 0,
            };
        })
        .filter((item) => item.value > 0);
}

function parseReportMonthToMeasuredAt(reportDate: string): string | null {
    const normalized = reportDate.replace(/\//g, '.').replace(/-/g, '.').trim();
    const match = normalized.match(/^(\d{4})\.(\d{1,2})$/);
    if (!match) return null;
    const month = String(parseInt(match[2], 10)).padStart(2, '0');
    return `${match[1]}-${month}`;
}

function buildHorseProfileFields(horse?: {
    birth_date?: string | null;
    sex?: string | null;
    trainers?: {
        trainer_name?: string | null;
        trainer_name_en?: string | null;
    } | null;
} | null, fallback?: Partial<Pick<ReportData, 'birthDate' | 'horseSex' | 'trainerNameJp' | 'trainerNameEn'>>): Pick<ReportData, 'birthDate' | 'horseSex' | 'trainerNameJp' | 'trainerNameEn'> {
    return {
        birthDate: horse?.birth_date || fallback?.birthDate || '',
        horseSex: normalizeHorseSex(horse?.sex) || fallback?.horseSex || '',
        trainerNameJp: horse?.trainers?.trainer_name || fallback?.trainerNameJp || '',
        trainerNameEn: horse?.trainers?.trainer_name_en || fallback?.trainerNameEn || '',
    };
}

function normalizeCareRecord(record: Partial<CareRecordEntry> | null | undefined, fallbackIndex = 0): CareRecordEntry {
    return {
        id: String(record?.id || `care-${fallbackIndex + 1}`),
        date: String(record?.date || ''),
        note: String(record?.note || ''),
        reportMode: record?.reportMode === 'body' || record?.reportMode === 'appendix' ? record.reportMode : 'none',
        images: Array.isArray(record?.images)
            ? record.images.map((image, imageIndex) => ({
                id: String(image?.id || `image-${imageIndex + 1}`),
                path: String(image?.path || ''),
                url: String(image?.url || ''),
                caption: String(image?.caption || ''),
            }))
            : [],
    };
}

function mergeCareRecordsWithSavedModes(latest: CareRecordEntry[], saved: CareRecordEntry[] = []): CareRecordEntry[] {
    const savedMap = new Map(saved.map((record) => [record.id, record]));
    return latest.map((record) => ({
        ...record,
        reportMode: savedMap.get(record.id)?.reportMode || record.reportMode || 'none',
        images: record.images.length > 0 ? record.images : (savedMap.get(record.id)?.images || []),
    }));
}

async function fetchCareRecords(workspaceId: string, horseId: string): Promise<CareRecordEntry[]> {
    const draftKey = `vet-records:${workspaceId}:${horseId}`;
    const { data, error } = await supabase
        .from('report_drafts')
        .select('data')
        .eq('workspace_id', workspaceId)
        .eq('draft_key', draftKey)
        .maybeSingle();

    if (error) throw error;

    const rawRecords = Array.isArray((data as { data?: { records?: Partial<CareRecordEntry>[] } } | null)?.data?.records)
        ? ((data as { data?: { records?: Partial<CareRecordEntry>[] } }).data?.records ?? [])
        : [];

    const normalized = rawRecords.map((record, index) => normalizeCareRecord(record, index));
    return await Promise.all(
        normalized.map(async (record) => ({
            ...record,
            images: await Promise.all(record.images.map(async (image) => ({
                ...image,
                url: image.path ? (await resolveReportAssetUrl(image.path) || image.url || '') : image.url,
            }))),
        }))
    );
}

export default function ReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Initial Data for Template
    const [initialData, setInitialData] = useState<Partial<ReportData>>({});
    const [horseId, setHorseId] = useState<string | null>(null);
    const [clientId, setClientId] = useState<string | null>(null);
    const [existingMainPhotoRef, setExistingMainPhotoRef] = useState<string | null>(null);
    const audienceType = 'owner';
    const reportType = 'monthly_report';
    const [outputMode, setOutputMode] = useState<OutputMode>('bilingual');
    const [lastGenerated, setLastGenerated] = useState<{
        ja: string;
        en: string;
        jaReportDocumentId: string | null;
        enReportDocumentId: string | null;
    } | null>(null);
    const [plan, setPlan] = useState<Plan>('basic');
    const [planStatus, setPlanStatus] = useState<string>('inactive');

    // Horse Selection (for New Reports)
    const [showHorseSelector, setShowHorseSelector] = useState(false);
    const [horses, setHorses] = useState<{ id: string, name: string, name_en: string }[]>([]);

    // Current Data (Synced from Child)
    const reportDataRef = useRef<ReportData | null>(null);

    const { user, session } = useAuth(); // Add useAuth
    const { t, language } = useLanguage();
    const { workspaceId, isWorkspaceLoading, refreshWorkspace } = useWorkspace();
    const planCapabilities = getPlanCapabilities(plan);
    const canUseGenerateV2 = FEATURE_FLAGS.reportGenerationV2 && planCapabilities.canUseGenerateV2;
    const canShowAudienceRouting = FEATURE_FLAGS.reportGenerationV2 && planCapabilities.canUseAudienceRouting;
    const canStoreEditDiffs = planCapabilities.canStoreEditDiffs;
    const hasProductAccess = planStatus === 'active' || planStatus === 'trialing';
    const billingLockMessage = language === 'ja'
        ? 'トライアル終了または課金状態が無効のため、レポート編集機能は停止中です。プラン管理から再契約してください。'
        : 'Report editing is locked because your trial ended or billing is inactive. Please re-subscribe from Billing.';

    const buildClientLocation = (client?: {
        address_city?: string | null;
        address_prefecture?: string | null;
        address_street?: string | null;
        name?: string | null;
    } | null) => {
        if (!client) return '';

        const parts = [
            client.address_street,
            client.address_city,
            client.address_prefecture,
        ]
            .map((value) => value?.trim())
            .filter(Boolean);

        return parts.join(', ') || client.name?.trim() || '';
    };

    useEffect(() => {
        if (!id || !user || !workspaceId) return; // Wait for user

        let isMounted = true;
        const fetchReportData = async (retryCount = 0) => {
            try {
                if (isNew) {
                    // Determine horseId from URL params (if linked from Horse Detail)
                    const params = new URLSearchParams(window.location.search);
                    const paramHorseId = params.get('horseId');
                    const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.'); // yyyy.MM

                    if (paramHorseId) {
                        if (isMounted) setHorseId(paramHorseId);
                        // Fetch horse details to prepopulate
                        const { data: horse, error: hErr } = await supabase.from('horses').select('*, trainers(trainer_name, trainer_name_en)').eq('workspace_id', workspaceId).eq('id', paramHorseId).single();
                        if (hErr) throw hErr;
                        if (isMounted) setClientId(horse?.owner_id || null);

                        let clientLocation = '';
                        if (horse?.owner_id) {
                            const { data: client } = await supabase
                                .from('clients')
                                .select('name, address_prefecture, address_city, address_street')
                                .eq('workspace_id', workspaceId)
                                .eq('id', horse.owner_id)
                                .single();
                            clientLocation = buildClientLocation(client);
                        }

                        const photoRef = normalizeAssetRef(horse?.photo_url);
                        const resolvedHorsePhoto = await resolveReportAssetUrl(photoRef);

                        // Fetch past weight history
                        const { data: horseWeights, error: rErr } = await supabase
                            .from('horse_weights')
                            .select('measured_at, weight')
                            .eq('workspace_id', workspaceId)
                            .eq('horse_id', paramHorseId)
                            .order('measured_at', { ascending: true });
                        if (rErr) throw rErr;

                        const weightHistory = buildWeightHistoryFromHorseWeights(horseWeights, language);
                        const careRecords = await fetchCareRecords(workspaceId, paramHorseId);

                        if (isMounted) {
                            setInitialData({
                                reportDate: defaultDate,
                                clientLocation,
                                horseNameJp: horse?.name || '',
                                horseNameEn: horse?.name_en || '',
                                sire: horse?.sire || '',
                                dam: horse?.dam || '',
                                ...buildHorseProfileFields(horse),
                                mainPhoto: resolvedHorsePhoto || '',
                                originalPhoto: resolvedHorsePhoto || '',
                                statusEn: '', statusJp: '',
                                weight: '', targetEn: '', targetJp: '',
                                commentEn: '', commentJp: '',
                                outputMode: 'bilingual',
                                weightHistory: weightHistory,
                                careRecords,
                            });
                            setExistingMainPhotoRef(photoRef);
                            setLoading(false);
                        }
                    } else {
                        // No horse selected, fetch list and show selector
                        const { data: allHorses, error: ahErr } = await supabase.from('horses').select('id, name, name_en').eq('workspace_id', workspaceId).order('name');
                        if (ahErr) throw ahErr;
                        if (isMounted) {
                            if (allHorses) setHorses(allHorses);
                            setShowHorseSelector(true);
                            setLoading(false);
                        }
                    }
                    return;
                }

                // Existing Report Logic
                const { data: report, error } = await supabase.from('reports').select('*').eq('workspace_id', workspaceId).eq('id', id).single();
                if (error) throw error;
                if (!report) throw new Error("Report not found");
                const metrics = report.metrics_json || {};
                const savedCareRecords = Array.isArray(metrics.careRecords)
                    ? metrics.careRecords.map((record: Partial<CareRecordEntry>, index: number) => normalizeCareRecord(record, index))
                    : [];

                // Fetch Horse Data
                const { data: horse, error: hErr2 } = await supabase.from('horses').select('*, trainers(trainer_name, trainer_name_en)').eq('workspace_id', workspaceId).eq('id', report.horse_id).single();
                if (hErr2) throw hErr2;
                if (isMounted) setClientId(horse?.owner_id || null);

                const { data: horseWeights } = await supabase
                    .from('horse_weights')
                    .select('measured_at, weight')
                    .eq('workspace_id', workspaceId)
                    .eq('horse_id', report.horse_id)
                    .order('measured_at', { ascending: true });
                const liveCareRecords = await fetchCareRecords(workspaceId, report.horse_id);
                const careRecords = mergeCareRecordsWithSavedModes(liveCareRecords, savedCareRecords);

                let clientLocation = metrics.clientLocation || '';
                if (!clientLocation && horse?.owner_id) {
                    const { data: client } = await supabase
                        .from('clients')
                        .select('name, address_prefecture, address_city, address_street')
                        .eq('workspace_id', workspaceId)
                        .eq('id', horse.owner_id)
                        .single();
                    clientLocation = buildClientLocation(client);
                }

                if (isMounted) {
                    const photoRef = normalizeAssetRef(report.main_photo_url || horse?.photo_url || '');
                    const resolvedMainPhoto = await resolveReportAssetUrl(photoRef);
                    setHorseId(report.horse_id);
                    setExistingMainPhotoRef(photoRef);

                    // Map DB to ReportData
                    setInitialData({
                        reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                        clientLocation,
                        horseNameJp: horse?.name || '',
                        horseNameEn: horse?.name_en || '',
                        sire: horse?.sire || '',
                        ...buildHorseProfileFields(horse, {
                            birthDate: metrics.birthDate || '',
                            horseSex: metrics.horseSex || '',
                            trainerNameJp: metrics.trainerNameJp || '',
                            trainerNameEn: metrics.trainerNameEn || '',
                        }),
                        sireEn: metrics.sireEn || '',
                        sireJp: metrics.sireJp || '',
                        dam: horse?.dam || '',
                        damEn: metrics.damEn || '',
                        damJp: metrics.damJp || '',

                        commentJp: metrics.commentJp || (metrics.outputMode === 'english_only' ? '' : (report.body || '')),
                        commentEn: metrics.commentEn || (metrics.outputMode === 'english_only' ? (report.body || '') : ''),
                        outputMode: metrics.outputMode || 'bilingual',

                        weight: report.weight ? `${report.weight} kg` : '',

                        statusJp: report.status_training || '',
                        statusEn: metrics.statusEn || '',

                        targetJp: report.target || '',
                        targetEn: metrics.targetEn || '',

                        weightHistory: buildWeightHistoryFromHorseWeights(horseWeights, language) || metrics.weightHistory || [],
                        careRecords,

                        mainPhoto: resolvedMainPhoto || '',
                        originalPhoto: resolvedMainPhoto || '',
                        logo: null
                    });

                    setLoading(false);
                    setOutputMode(metrics.outputMode || 'bilingual');
                }
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error("Error loading report data:", error);

                // Retry logic
                if (isMounted && retryCount < 2) {
                    console.log(`Retrying report load... (${retryCount + 1})`);
                    setTimeout(() => fetchReportData(retryCount + 1), 500);
                } else if (isMounted && session?.access_token) {
                    // FALLBACK: Raw Fetch
                    try {
                        console.warn('Attempting raw fetch fallback for report editor...');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        if (!supabaseUrl || !anonKey) throw new Error('Missing env vars');

                        const headers = {
                            'apikey': anonKey,
                            'Authorization': `Bearer ${session.access_token}`
                        };

                        if (isNew) {
                            // New Report Fallback
                            const params = new URLSearchParams(window.location.search);
                            const paramHorseId = params.get('horseId');
                            const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.');

                            if (paramHorseId) {
                                if (isMounted) setHorseId(paramHorseId);
                                const [horseRes, weightsRes] = await Promise.all([
                                    fetch(`${supabaseUrl}/rest/v1/horses?workspace_id=eq.${workspaceId}&id=eq.${paramHorseId}&select=*,trainers(trainer_name,trainer_name_en)`, { headers }),
                                    fetch(`${supabaseUrl}/rest/v1/horse_weights?workspace_id=eq.${workspaceId}&horse_id=eq.${paramHorseId}&select=measured_at,weight&order=measured_at.asc`, { headers })
                                ]);

                                if (horseRes.ok && weightsRes.ok) {
                                    const hData = await horseRes.json();
                                    const wData = await weightsRes.json();
                                    const horse = hData[0];
                                    if (isMounted) setClientId(horse?.owner_id || null);
                                    let clientLocation = '';

                                    if (horse?.owner_id) {
                                        const clientRes = await fetch(
                                            `${supabaseUrl}/rest/v1/clients?workspace_id=eq.${workspaceId}&id=eq.${horse.owner_id}&select=name,address_prefecture,address_city,address_street`,
                                            { headers }
                                        );
                                        if (clientRes.ok) {
                                            const clientData = await clientRes.json();
                                            clientLocation = buildClientLocation(clientData[0]);
                                        }
                                    }

                                    const weightHistory = buildWeightHistoryFromHorseWeights(wData, language);
                                    const careRecords = await fetchCareRecords(workspaceId, paramHorseId);

                                    if (isMounted) {
                                        const photoRef = normalizeAssetRef(horse?.photo_url);
                                        const resolvedHorsePhoto = await resolveReportAssetUrl(photoRef);
                                        setInitialData({
                                            reportDate: defaultDate,
                                            clientLocation,
                                            horseNameJp: horse?.name || '',
                                            horseNameEn: horse?.name_en || '',
                                            sire: horse?.sire || '',
                                            dam: horse?.dam || '',
                                            ...buildHorseProfileFields(horse),
                                            mainPhoto: resolvedHorsePhoto || '',
                                            originalPhoto: resolvedHorsePhoto || '',
                                            statusEn: '', statusJp: '',
                                        weight: '', targetEn: '', targetJp: '',
                                            commentEn: '', commentJp: '',
                                            outputMode: 'bilingual',
                                            weightHistory: weightHistory,
                                            careRecords,
                                        });
                                        setExistingMainPhotoRef(photoRef);
                                        setLoading(false);
                                    }
                                }
                            } else {
                                // List horses fallback
                                const res = await fetch(`${supabaseUrl}/rest/v1/horses?workspace_id=eq.${workspaceId}&select=id,name,name_en&order=name`, { headers });
                                if (res.ok) {
                                    const allHorses = await res.json();
                                    if (isMounted) {
                                        setHorses(allHorses);
                                        setShowHorseSelector(true);
                                        setLoading(false);
                                    }
                                }
                            }
                        } else {
                            // Edit Report Fallback
                            const reportRes = await fetch(`${supabaseUrl}/rest/v1/reports?workspace_id=eq.${workspaceId}&id=eq.${id}&select=*`, { headers });
                            if (!reportRes.ok) throw new Error("Report fetch failed");
                            const rData = await reportRes.json();
                            const report = rData[0];
                            if (!report) throw new Error("Report not found");
                            const metrics = report.metrics_json || {};
                            const savedCareRecords = Array.isArray(metrics.careRecords)
                                ? metrics.careRecords.map((record: Partial<CareRecordEntry>, index: number) => normalizeCareRecord(record, index))
                                : [];

                            const horseRes = await fetch(`${supabaseUrl}/rest/v1/horses?workspace_id=eq.${workspaceId}&id=eq.${report.horse_id}&select=*,trainers(trainer_name,trainer_name_en)`, { headers });
                            const hData = await horseRes.json();
                            const horse = hData[0];
                            const horseWeightsRes = await fetch(
                                `${supabaseUrl}/rest/v1/horse_weights?workspace_id=eq.${workspaceId}&horse_id=eq.${report.horse_id}&select=measured_at,weight&order=measured_at.asc`,
                                { headers }
                            );
                            const horseWeightsData = horseWeightsRes.ok ? await horseWeightsRes.json() : [];
                            let clientLocation = metrics.clientLocation || '';
                            const liveCareRecords = await fetchCareRecords(workspaceId, report.horse_id);
                            const careRecords = mergeCareRecordsWithSavedModes(liveCareRecords, savedCareRecords);

                            if (!clientLocation && horse?.owner_id) {
                                const clientRes = await fetch(
                                    `${supabaseUrl}/rest/v1/clients?workspace_id=eq.${workspaceId}&id=eq.${horse.owner_id}&select=name,address_prefecture,address_city,address_street`,
                                    { headers }
                                );
                                if (clientRes.ok) {
                                    const clientData = await clientRes.json();
                                    clientLocation = buildClientLocation(clientData[0]);
                                }
                            }

                            if (isMounted) {
                                const photoRef = normalizeAssetRef(report.main_photo_url || horse?.photo_url || '');
                                const resolvedMainPhoto = await resolveReportAssetUrl(photoRef);
                                setHorseId(report.horse_id);
                                setClientId(horse?.owner_id || null);
                                setExistingMainPhotoRef(photoRef);
                                const metrics = report.metrics_json || {};
                                setInitialData({
                                    reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                                    clientLocation,
                                    horseNameJp: horse?.name || '',
                                    horseNameEn: horse?.name_en || '',
                                    sire: horse?.sire || '',
                                    ...buildHorseProfileFields(horse, {
                                        birthDate: metrics.birthDate || '',
                                        horseSex: metrics.horseSex || '',
                                        trainerNameJp: metrics.trainerNameJp || '',
                                        trainerNameEn: metrics.trainerNameEn || '',
                                    }),
                                    sireEn: metrics.sireEn || '',
                                    sireJp: metrics.sireJp || '',
                                    dam: horse?.dam || '',
                                    damEn: metrics.damEn || '',
                                    damJp: metrics.damJp || '',
                                    commentJp: metrics.commentJp || (metrics.outputMode === 'english_only' ? '' : (report.body || '')),
                                    commentEn: metrics.commentEn || (metrics.outputMode === 'english_only' ? (report.body || '') : ''),
                                    outputMode: metrics.outputMode || 'bilingual',
                                    weight: report.weight ? `${report.weight} kg` : '',
                                    statusJp: report.status_training || '',
                                    statusEn: metrics.statusEn || '',
                                    targetJp: report.target || '',
                                    targetEn: metrics.targetEn || '',
                                    weightHistory: buildWeightHistoryFromHorseWeights(horseWeightsData, language) || metrics.weightHistory || [],
                                    careRecords,
                                    mainPhoto: resolvedMainPhoto || '',
                                    originalPhoto: resolvedMainPhoto || '',
                                    logo: null
                                });
                                setOutputMode(metrics.outputMode || 'bilingual');
                                setLoading(false);
                            }
                        }
                    } catch (fallbackError) {
                        console.error('Fallback failed:', fallbackError);
                        if (isMounted) setLoading(false);
                    }
                } else if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchReportData();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isNew, user?.id, session?.access_token, workspaceId]);

    useEffect(() => {
        let mounted = true;

        async function loadPlan() {
            if (!user) return;

            const { data } = await supabase
                .from('customers')
                .select('plan_status, subscription_plan')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!mounted) return;

            const resolvedPlan = normalizePlan(
                (data?.plan_status === 'active' || data?.plan_status === 'trialing')
                    ? (data?.subscription_plan || 'pro')
                    : 'basic'
            );

            setPlan(resolvedPlan);
            setPlanStatus(data?.plan_status || 'inactive');
        }

        loadPlan();
        return () => { mounted = false; };
    }, [user]);

    const handleSelectHorse = async (selectedHorseId: string) => {
        if (!workspaceId) return;
        setHorseId(selectedHorseId);
        setShowHorseSelector(false);
        setLoading(true);
        const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.');

        // Fetch horse details
        const { data: horse } = await supabase.from('horses').select('*, trainers(trainer_name, trainer_name_en)').eq('workspace_id', workspaceId).eq('id', selectedHorseId).single();
        setClientId(horse?.owner_id || null);
        let clientLocation = '';
        if (horse?.owner_id) {
            const { data: client } = await supabase
                .from('clients')
                .select('name, address_prefecture, address_city, address_street')
                .eq('workspace_id', workspaceId)
                .eq('id', horse.owner_id)
                .single();
            clientLocation = buildClientLocation(client);
        }

        const photoRef = normalizeAssetRef(horse?.photo_url);
        const resolvedHorsePhoto = await resolveReportAssetUrl(photoRef);

        // Fetch past weight history
        const { data: horseWeights } = await supabase
            .from('horse_weights')
            .select('measured_at, weight')
            .eq('workspace_id', workspaceId)
            .eq('horse_id', selectedHorseId)
            .order('measured_at', { ascending: true });

        const weightHistory = buildWeightHistoryFromHorseWeights(horseWeights, language);
        const careRecords = await fetchCareRecords(workspaceId, selectedHorseId);

        setInitialData({
            reportDate: defaultDate,
            clientLocation,
            horseNameJp: horse?.name || '',
            horseNameEn: horse?.name_en || '',
            sire: horse?.sire || '',
            dam: horse?.dam || '',
            ...buildHorseProfileFields(horse),
            mainPhoto: resolvedHorsePhoto || '',
            originalPhoto: resolvedHorsePhoto || '',
            statusEn: '', statusJp: '',
            weight: '', targetEn: '', targetJp: '',
            commentEn: '', commentJp: '',
            outputMode,
            weightHistory: weightHistory,
            careRecords,
        });
        setExistingMainPhotoRef(photoRef);
        setLoading(false);
    };

    const handleDataChange = useCallback((data: ReportData) => {
        reportDataRef.current = data;
    }, []);

    const handleOutputModeChange = useCallback((nextMode: OutputMode) => {
        setOutputMode(nextMode);

        const current = reportDataRef.current;
        if (!current) return;

        const updates: Partial<ReportData> = { outputMode: nextMode };
        setInitialData((prev) => ({ ...prev, ...updates }));
        reportDataRef.current = { ...current, ...updates };
    }, []);

    const handleFillMissingComment = useCallback(async (targetLang: 'ja' | 'en', data: ReportData) => {
        const sourceText = targetLang === 'ja' ? data.commentEn : data.commentJp;
        if (!sourceText?.trim()) return null;
        if (!user?.id) return null;

        const translated = await translateText(sourceText, targetLang, user.id);
        if (!translated?.translatedText) return null;

        return sanitizeTranslatedComment(sourceText, translated.translatedText, targetLang);
    }, [user?.id]);

    async function handleGenerateWithMemory(prompt: string, data: ReportData) {
        if (!hasProductAccess || !canUseGenerateV2) {
            return null;
        }
        if (!workspaceId || !user?.id) {
            alert(t('noActiveWorkspace'));
            return null;
        }

        const sourceFacts = {
            prompt,
            reportDate: data.reportDate,
            horseNameJp: data.horseNameJp,
            horseNameEn: data.horseNameEn,
            trainerNameJp: data.trainerNameJp || '',
            trainerNameEn: data.trainerNameEn || '',
            horseSex: data.horseSex || '',
            birthDate: data.birthDate || '',
            sire: data.sire,
            dam: data.dam,
            trainingStatusJp: data.statusJp || data.trainingStatusJp || '',
            trainingStatusEn: data.statusEn || data.trainingStatusEn || '',
            conditionJp: data.conditionJp || '',
            conditionEn: data.conditionEn || '',
            targetJp: data.targetJp,
            targetEn: data.targetEn,
            weight: data.weight,
            outputMode: data.outputMode,
            careRecordsForBody: data.careRecords
                .filter((record) => record.reportMode === 'body' && (record.date || record.note.trim()))
                .map((record) => ({
                    date: record.date,
                    note: record.note,
                })),
        };

        const commonPayload = {
            workspaceId,
            userId: user.id,
            reportId: isNew ? null : String(id),
            horseId,
            clientId,
            audienceType,
            reportType,
            outputMode,
            recipientName: data.clientLocation || null,
            sourceFacts,
            draftText: prompt,
        };

        let jaResult = null;
        let enResult = null;
        let jaError: unknown = null;
        let enError: unknown = null;

        if (outputMode !== 'english_only') {
            try {
                jaResult = await generateReportV2({ ...commonPayload, language: 'ja' });
            } catch (error) {
                jaError = error;
            }
        }

        if (outputMode !== 'japanese_only') {
            try {
                enResult = await generateReportV2({ ...commonPayload, language: 'en' });
            } catch (error) {
                enError = error;
            }
        }

        const jaSucceeded = outputMode === 'english_only' || Boolean(jaResult?.generatedText);
        const enSucceeded = outputMode === 'japanese_only' || Boolean(enResult?.generatedText);

        if (!jaSucceeded && !enSucceeded) {
            const primaryError = jaError || enError;
            throw new Error(formatGenerationError(primaryError, 'AI generation failed.'));
        }

        const sanitizedJa = outputMode === 'english_only'
            ? ''
            : sanitizeGeneratedComment(jaResult?.generatedText || '', 'ja');
        const sanitizedEn = outputMode === 'japanese_only'
            ? ''
            : sanitizeGeneratedComment(enResult?.generatedText || '', 'en');

        setLastGenerated({
            ja: sanitizedJa,
            en: sanitizedEn,
            jaReportDocumentId: jaResult?.reportDocumentId || null,
            enReportDocumentId: enResult?.reportDocumentId || null,
        });

        setInitialData((prev) => ({
            ...prev,
            commentJp: outputMode === 'english_only'
                ? ''
                : sanitizedJa,
            commentEn: outputMode === 'japanese_only'
                ? ''
                : sanitizedEn,
            outputMode,
        }));

        const warnings: string[] = [];
        if (outputMode !== 'english_only' && !jaSucceeded) {
            warnings.push(`日本語生成に失敗しました: ${formatGenerationError(jaError, 'Japanese generation failed.')}`);
        }
        if (outputMode !== 'japanese_only' && !enSucceeded) {
            warnings.push(`英語生成に失敗しました: ${formatGenerationError(enError, 'English generation failed.')}`);
        }

        if (warnings.length > 0 && typeof window !== 'undefined') {
            window.alert(warnings.join('\n'));
        }

        return {
            ja: sanitizedJa,
            en: sanitizedEn,
        };
    }

    async function uploadImage(base64Data: string, path: string): Promise<{ path: string | null, url: string | null, error: unknown }> {
        try {
            const res = await fetch(base64Data);
            const blob = await res.blob();
            const { path: uploadedPath, signedUrl, error } = await uploadReportAsset(path, blob);
            if (error) {
                console.error("Upload Error:", error);
                return { path: null, url: null, error };
            }
            return { path: uploadedPath, url: signedUrl, error: null };
        } catch (e) {
            console.error("Image Processing Error:", e);
            return { path: null, url: null, error: e };
        }
    }

    async function saveReport() {
        if (!reportDataRef.current || !id) return;
        if (!hasProductAccess) {
            alert(billingLockMessage);
            return;
        }
        if (!workspaceId) {
            alert(t('noActiveWorkspace'));
            return;
        }
        if (!horseId) {
            alert(t('noHorseSelected'));
            return;
        }

        setSaving(true);
        const d = reportDataRef.current;

        let mainPhotoUrl = d.mainPhoto;
        let mainPhotoRef = normalizeAssetRef(existingMainPhotoRef || d.mainPhoto);
        // const logoUrl = d.logo; // Unused

        // Check if mainPhoto is new (Base64 or Blob) - only upload if changed
        if (d.mainPhoto && (d.mainPhoto.startsWith('data:') || d.mainPhoto.startsWith('blob:'))) {
            const fileName = `main_${Date.now()}.jpg`;
            const reportPathId = isNew ? `temp_${Date.now()}` : id;
            const path = `${workspaceId}/${horseId}/${reportPathId}/${fileName}`;

            const { path: uploadedPath, url: uploadedUrl, error: uploadError } = await uploadImage(d.mainPhoto, path);
            if (uploadedUrl && uploadedPath) {
                mainPhotoUrl = uploadedUrl;
                mainPhotoRef = normalizeAssetRef(uploadedPath);
            } else {
                const errorMsg = (uploadError as { message?: string })?.message || JSON.stringify(uploadError) || "Unknown Error";
                alert(`${t('imageUploadFailed')}\nError: ${errorMsg}\n\n${t('checkStoragePolicies')}`);
                setSaving(false);
                return;
            }
        }

        // Pack extra fields into metrics_json
        const metricsJson = {
            commentJp: d.commentJp,
            commentEn: d.commentEn,
            clientLocation: d.clientLocation || '',
            birthDate: d.birthDate || '',
            horseSex: d.horseSex || '',
            trainerNameJp: d.trainerNameJp || '',
            trainerNameEn: d.trainerNameEn || '',
            statusEn: d.statusEn,
            targetEn: d.targetEn,
            outputMode: d.outputMode || outputMode,
            weightHistory: d.weightHistory,
            careRecords: d.careRecords,
            sireEn: d.sireEn,
            sireJp: d.sireJp,
            damEn: d.damEn,
            damJp: d.damJp
        };

        const numericWeight = parseFloat(d.weight.replace(/[^0-9.]/g, '') || '0');

        const payload = {
            workspace_id: workspaceId,
            horse_id: horseId, // Ensure horse_id is set
            title: d.reportDate, // Store report date in title
            body: (d.outputMode || outputMode) === 'english_only' ? d.commentEn : d.commentJp,
            weight: numericWeight,
            status_training: (d.outputMode || outputMode) === 'english_only' ? d.statusEn : d.statusJp,
            target: (d.outputMode || outputMode) === 'english_only' ? d.targetEn : d.targetJp,
            metrics_json: metricsJson,
            main_photo_url: mainPhotoRef,
            updated_at: new Date().toISOString()
        };

        let resultError = null;
        let newReportId = null;

        if (isNew) {
            // INSERT
            const { data, error } = await supabase.from('reports').insert(payload).select().single();
            resultError = error;
            if (data) newReportId = data.id;
        } else {
            // UPDATE
            const { error } = await supabase.from('reports').update(payload).eq('workspace_id', workspaceId).eq('id', id);
            resultError = error;
        }

        if (resultError) {
            console.error("Save Error:", resultError);
            alert(t('errorSavingReport') + resultError.message);
            setSaving(false);
            return;
        }

        if (lastGenerated && user?.id && canStoreEditDiffs) {
            const feedbackBase = {
                workspaceId,
                userId: user.id,
                audienceType,
                reportType,
            };

            if (lastGenerated.jaReportDocumentId && lastGenerated.ja !== d.commentJp) {
                try {
                    await submitReportFeedback(lastGenerated.jaReportDocumentId, {
                        ...feedbackBase,
                        language: 'ja',
                        generatedText: lastGenerated.ja,
                        finalText: d.commentJp,
                    });
                } catch (error) {
                    console.error('JA feedback save failed:', error);
                }
            }

            if (lastGenerated.enReportDocumentId && lastGenerated.en !== d.commentEn) {
                try {
                    await submitReportFeedback(lastGenerated.enReportDocumentId, {
                        ...feedbackBase,
                        language: 'en',
                        generatedText: lastGenerated.en,
                        finalText: d.commentEn,
                    });
                } catch (error) {
                    console.error('EN feedback save failed:', error);
                }
            }
        }

        // Update Horse (Name/Sire/Dam/Photo if changed)
        if (horseId) {
            await supabase.from('horses').update({
                name: d.horseNameJp,
                name_en: d.horseNameEn,
                sire: d.sire,
                dam: d.dam,
                photo_url: mainPhotoRef,
                updated_at: new Date().toISOString()
            }).eq('workspace_id', workspaceId).eq('id', horseId);
        }

        if (horseId) {
            const entriesMap = new Map<string, { workspace_id: string; horse_id: string; measured_at: string; weight: number }>();
            d.weightHistory.forEach((entry) => {
                if (entry.measuredAt && entry.value > 0) {
                    entriesMap.set(entry.measuredAt, {
                        workspace_id: workspaceId,
                        horse_id: horseId,
                        measured_at: `${entry.measuredAt}-01`,
                        weight: entry.value,
                    });
                }
            });

            const reportMeasuredAt = parseReportMonthToMeasuredAt(d.reportDate);
            if (reportMeasuredAt && numericWeight > 0) {
                entriesMap.set(reportMeasuredAt, {
                    workspace_id: workspaceId,
                    horse_id: horseId,
                    measured_at: `${reportMeasuredAt}-01`,
                    weight: numericWeight,
                });
            }

            const horseWeightRows = Array.from(entriesMap.values());
            if (horseWeightRows.length > 0) {
                const { error: horseWeightsError } = await supabase
                    .from('horse_weights')
                    .upsert(horseWeightRows, { onConflict: 'horse_id,measured_at' });

                if (horseWeightsError) {
                    console.error('Horse weight sync error:', horseWeightsError);
                }
            }
        }

        setSaving(false);
        setLastSaved(new Date());
        setExistingMainPhotoRef(mainPhotoRef);
        setInitialData((prev) => ({
            ...prev,
            mainPhoto: mainPhotoUrl || prev.mainPhoto,
            originalPhoto: mainPhotoUrl || prev.originalPhoto,
        }));

        if (reportDataRef.current) {
            reportDataRef.current.mainPhoto = mainPhotoUrl || reportDataRef.current.mainPhoto;
            reportDataRef.current.originalPhoto = mainPhotoUrl || reportDataRef.current.originalPhoto;
        }

        if (isNew && newReportId) {
            router.replace(`/reports/${newReportId}`);
        } else {
            if (d.mainPhoto.startsWith('data:') || d.mainPhoto.startsWith('blob:')) {
                if (reportDataRef.current) reportDataRef.current.mainPhoto = mainPhotoUrl;
            }
        }

    }
    if (loading && isWorkspaceLoading) return <div className="min-h-screen flex items-center justify-center text-gray-400">{t('loadingWorkspace')}</div>;
    if (loading && !isWorkspaceLoading && !workspaceId) {
        return (
            <div className="min-h-screen flex items-start justify-center pt-10 sm:pt-20 bg-gray-100 font-sans px-4">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-2xl border border-stone-200">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-2xl font-bold text-primary">{t('workspaceSetupRequiredTitle')}</h2>
                        <LanguageToggle />
                    </div>
                    <p className="text-stone-500 mb-6 text-sm leading-7">{t('workspaceSetupRequiredBody')}</p>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => void refreshWorkspace()}
                            className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold"
                        >
                            {t('retryWorkspaceLoad')}
                        </button>
                        <Link href="/dashboard" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            {t('backToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }
    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">{t('loadingReport')}</div>;

    if (showHorseSelector) {
        return (
            <div className="min-h-screen flex items-start justify-center pt-10 sm:pt-20 bg-gray-100 font-sans px-4">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-2xl border border-stone-200">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-2xl font-bold text-primary">{t('selectHorse')}</h2>
                        <LanguageToggle />
                    </div>
                    <p className="text-stone-500 mb-6 text-sm">{t('selectHorseBody')}</p>
                    {horses.length > 0 ? (
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            {horses.map(h => (
                                <button
                                    key={h.id}
                                    onClick={() => handleSelectHorse(h.id)}
                                    className="w-full text-left p-4 hover:bg-[color-mix(in_srgb,var(--brand-primary)_5%,white)] border border-stone-200 rounded-lg transition-all duration-200 text-lg text-primary font-medium block group"
                                >
                                    {h.name} <span className="text-sm text-stone-400 ml-2 font-normal">{h.name_en}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
                            <h3 className="text-lg font-bold text-stone-800">{t('noHorsesYetTitle')}</h3>
                            <p className="mt-2 text-sm leading-7 text-stone-600">{t('noHorsesYetBody')}</p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                <Link href="/dashboard/horses/new" className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
                                    {t('goToAddHorse')}
                                </Link>
                                <Link href="/dashboard/clients/new" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                                    {t('goToAddClient')}
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center py-3 sm:py-8 font-sans print:py-0 print:block print:min-h-0 print:h-auto print:bg-white bg-gray-100">
            {/* Control Panel (Hidden in Print) */}
            <div className="control-panel btn-primary w-full max-w-[210mm] px-3 py-3 sm:p-4 rounded-none sm:rounded-md mb-4 sm:mb-6 shadow-lg no-print sticky top-0 sm:top-4 z-50">
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <Link href={`/dashboard`} className="text-white/80 hover:text-white transition-colors flex items-center gap-1 shrink-0">
                                <ArrowLeft size={20} /> <span className="sm:hidden text-xs">{t('backToHome')}</span>
                            </Link>
                            <div className="min-w-0">
                                <div className="font-bold text-sm leading-tight">{isNew ? t('newReportLabel') : t('reportEditorLabel')}</div>
                                {lastSaved && <div className="text-[10px] text-white/70 flex items-center gap-1 mt-1"><Check size={8} /> {t('savedAt')} {lastSaved.toLocaleTimeString()}</div>}
                            </div>
                        </div>
                        <div className="sm:hidden shrink-0">
                            <LanguageToggle />
                        </div>
                    </div>

                    {canShowAudienceRouting ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,220px)_1fr]">
                            <select
                                value={outputMode}
                                onChange={(e) => setOutputMode(e.target.value as OutputMode)}
                                className="rounded border border-white/35 bg-emerald-950 px-3 py-2 text-sm font-semibold text-white shadow-sm focus:border-white/60 focus:outline-none focus:ring-2 focus:ring-white/25"
                                style={{ color: '#ffffff', backgroundColor: '#123f33' }}
                                title="Output mode"
                            >
                                <option value="bilingual" style={{ color: '#ffffff', backgroundColor: '#123f33' }}>Japanese + English</option>
                                <option value="japanese_only" style={{ color: '#ffffff', backgroundColor: '#123f33' }}>Japanese Only</option>
                                <option value="english_only" style={{ color: '#ffffff', backgroundColor: '#123f33' }}>English Only</option>
                            </select>
                            <div className="hidden sm:flex items-center text-[11px] text-white/65">
                                Owner / Monthly Report
                            </div>
                        </div>
                    ) : <div />}

                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                        <div className="hidden sm:block">
                            <LanguageToggle />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={saveReport}
                                disabled={saving || !hasProductAccess}
                                className="btn-primary disabled:opacity-50 px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap"
                                title={!hasProductAccess ? billingLockMessage : undefined}
                            >
                                {saving ? <UploadCloud size={16} className="animate-bounce" /> : <Save size={16} />}
                                {saving ? t('saving') : t('saveReport')}
                            </button>
                            <button
                                onClick={() => {
                                    if (!hasProductAccess) {
                                        window.alert(billingLockMessage);
                                        return;
                                    }
                                    window.print();
                                }}
                                disabled={!hasProductAccess}
                                title={!hasProductAccess ? billingLockMessage : undefined}
                                className="btn-accent disabled:opacity-50 px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap"
                            >
                                <Printer size={16} /> PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {!hasProductAccess && (
                <div className="mb-4 w-full max-w-[210mm] rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 no-print">
                    <div className="font-semibold">{language === 'ja' ? '編集機能は停止中です' : 'Editing is locked'}</div>
                    <div className="mt-1">{billingLockMessage}</div>
                    <div className="mt-3">
                        <Link href="/dashboard/billing" className="inline-flex rounded-lg border border-amber-400 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100">
                            {language === 'ja' ? 'プラン管理を開く' : 'Open Billing'}
                        </Link>
                    </div>
                </div>
            )}

            {/* Main Report Wrapper - Adjusted for Split View Compatibility */}
            {/* The ReportTemplate now has its own split view, so we need to enable full width here and remove centralized scaling for desktop, keep mobile scaling? */}
            {/* Actually ReportTemplate is responsive (stacked on mobile, split on desktop). 
               So we should just let it be full width. */}

            <div className="w-full flex justify-center overflow-x-auto pb-8 print:pb-0 print:overflow-visible">
                <ReportTemplate
                    initialData={initialData}
                    onDataChange={handleDataChange}
                    readOnly={!hasProductAccess}
                    userId={user?.id || null}
                    onGenerateComment={hasProductAccess && canUseGenerateV2 ? handleGenerateWithMemory : undefined}
                    onFillMissingComment={hasProductAccess ? handleFillMissingComment : undefined}
                    outputMode={outputMode}
                    onOutputModeChange={(mode) => {
                        void handleOutputModeChange(mode as OutputMode);
                    }}
                />
            </div>
        </div>
    );
}
