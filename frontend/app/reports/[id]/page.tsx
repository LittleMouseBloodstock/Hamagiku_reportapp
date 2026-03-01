'use client';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import DepartureReportTemplate, { DepartureReportData } from '@/components/DepartureReportTemplate';
import { ArrowLeft, Save, Printer, Check, UploadCloud, Send, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';

const stripDraftImagePayload = <T extends ReportData | DepartureReportData>(data: T): T => {
    if (!data || typeof data !== 'object') return data;
    const next = { ...data } as T & { mainPhoto?: string; originalPhoto?: string | null };
    if ('mainPhoto' in next && typeof next.mainPhoto === 'string' && next.mainPhoto.startsWith('data:')) {
        next.mainPhoto = '';
    }
    if ('originalPhoto' in next && typeof next.originalPhoto === 'string' && next.originalPhoto.startsWith('data:')) {
        next.originalPhoto = '';
    }
    return next;
};

export default function ReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [reviewStatus, setReviewStatus] = useState<string>('draft');
    const [isDirty, setIsDirty] = useState(false);
    const [reportType, setReportType] = useState<'monthly' | 'departure'>('monthly');
    const [draftPromptedKey, setDraftPromptedKey] = useState<string | null>(null);
    const [autosaveStatus, setAutosaveStatus] = useState<string>('');
    const [autosaveStamp, setAutosaveStamp] = useState<number>(0);

    // Initial Data for Template
    const [initialData, setInitialData] = useState<Partial<ReportData | DepartureReportData>>({});
    const [horseId, setHorseId] = useState<string | null>(null);

    // Horse Selection (for New Reports)
    const [showHorseSelector, setShowHorseSelector] = useState(false);
    const [horses, setHorses] = useState<{ id: string, name: string, name_en: string }[]>([]);

    // Current Data (Synced from Child)
    const reportDataRef = useRef<ReportData | DepartureReportData | null>(null);
    const autosaveTimerRef = useRef<number | null>(null);
    const remoteAutosaveTimerRef = useRef<number | null>(null);
    const lastRemoteSaveRef = useRef<number>(0);

    const { user, session } = useAuth(); // Add useAuth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const getRestHeaders = () => {
        if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
            throw new Error('Missing env vars or access token for REST');
        }
        return {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    };

    const draftKey = useMemo(() => {
        const safeId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : 'unknown';
        const horsePart = horseId || 'no-horse';
        return `report-draft:${safeId}:${horsePart}:${reportType}`;
    }, [id, horseId, reportType]);

    const getDraftHeaders = () => {
        if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
            throw new Error('Missing env vars or access token for REST');
        }
        return {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,resolution=merge-duplicates'
        };
    };

    const fetchRemoteDraft = async () => {
        if (!session?.access_token) return null;
        if (!horseId && id === 'new') return null;
        const res = await fetch(`${supabaseUrl}/rest/v1/report_drafts?draft_key=eq.${encodeURIComponent(draftKey)}`, {
            headers: getDraftHeaders()
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.[0] ?? null;
    };

    const saveRemoteDraft = async () => {
        if (!session?.access_token) return;
        if (!reportDataRef.current) return;
        if (!horseId && id === 'new') return;
        if (saving) return;
        const draftData = stripDraftImagePayload(reportDataRef.current);
        const payload = {
            draft_key: draftKey,
            report_id: id !== 'new' ? id : null,
            horse_id: horseId || null,
            report_type: reportType,
            data: draftData,
            updated_at: new Date().toISOString()
        };
        const res = await fetch(`${supabaseUrl}/rest/v1/report_drafts?on_conflict=draft_key`, {
            method: 'POST',
            headers: getDraftHeaders(),
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            const text = await res.text();
            console.warn('Remote draft save failed:', text);
        } else {
            lastRemoteSaveRef.current = Date.now();
            setAutosaveStatus('Saved to server');
            setAutosaveStamp(Date.now());
        }
    };

    const deleteRemoteDraft = async () => {
        if (!session?.access_token) return;
        if (!draftKey) return;
        await fetch(`${supabaseUrl}/rest/v1/report_drafts?draft_key=eq.${encodeURIComponent(draftKey)}`, {
            method: 'DELETE',
            headers: getDraftHeaders()
        });
    };

    const restGet = async (path: string) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
            headers: getRestHeaders()
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST GET failed: ${res.status} ${text}`);
        }
        return res.json();
    };

    const calculateHorseAge = (birthDate?: string | null) => {
        if (!birthDate) return null;
        const year = new Date(birthDate).getFullYear();
        if (Number.isNaN(year)) return null;
        return new Date().getFullYear() - year;
    };

    const formatSexAge = (sex?: string | null, birthDate?: string | null, lang: 'ja' | 'en' = 'ja') => {
        const map: Record<string, { ja: string; en: string }> = {
            Colt: { ja: '牡', en: 'Colt' },
            Filly: { ja: '牝', en: 'Filly' },
            Gelding: { ja: 'セン', en: 'Gelding' },
            Mare: { ja: '繁殖', en: 'Mare' },
            Stallion: { ja: '種牡馬', en: 'Stallion' }
        };
        const sexLabel = sex && map[sex] ? map[sex][lang] : '';
        const age = calculateHorseAge(birthDate);
        const ageLabel = age !== null ? (lang === 'ja' ? `${age}歳` : `${age}yo`) : '';
        if (!sexLabel && !ageLabel) return '';
        if (lang === 'ja') return `${sexLabel}${ageLabel}`;
        return `${sexLabel}${ageLabel ? ` ${ageLabel}` : ''}`.trim();
    };

    const resolveOutputMode = (clientMode?: string | null, trainerMode?: string | null): 'pdf' | 'print' => {
        const normalize = (mode?: string | null) => (mode === 'print' ? 'print' : 'pdf');
        if (clientMode) return normalize(clientMode);
        if (trainerMode) return normalize(trainerMode);
        return 'pdf';
    };

    const fetchLatestWeightEntry = async (horseId: string) => {
        try {
            const data = await restGet(`horse_weights?horse_id=eq.${horseId}&select=weight,measured_at&order=measured_at.desc&limit=1`);
            return data?.[0] ?? null;
        } catch {
            return null;
        }
    };

    const fetchLatestMonthlyReport = async (horseId: string) => {
        try {
            const data = await restGet(`reports?horse_id=eq.${horseId}&select=weight,metrics_json,created_at,title&order=created_at.desc&limit=5`);
            const monthly = (data || []).find((r: { metrics_json?: { reportType?: string } }) => {
                return r?.metrics_json?.reportType !== 'departure';
            });
            return monthly ?? null;
        } catch {
            return null;
        }
    };

    type WeightHistoryPoint = {
        label: string;
        value: number;
        monthKey?: string;
    };

    const getMonthInfo = (value?: string | null) => {
        if (!value) return null;
        const parts = value.replace(/-/g, '.').split('.');
        if (parts.length >= 2) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            if (!Number.isNaN(year) && !Number.isNaN(month) && month >= 1 && month <= 12) {
                return {
                    monthKey: `${year}-${String(month).padStart(2, '0')}`,
                    label: `${month}月`
                };
            }
        }
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
            const year = date.getFullYear();
            const month = date.getMonth() + 1;
            return {
                monthKey: `${year}-${String(month).padStart(2, '0')}`,
                label: `${month}月`
            };
        }
        return null;
    };

    const getMonthKeySortValue = (item: WeightHistoryPoint, index: number) => {
        if (item.monthKey && /^\d{4}-\d{2}$/.test(item.monthKey)) {
            return parseInt(item.monthKey.replace('-', ''), 10);
        }
        const month = parseInt(String(item.label || '').replace(/\D/g, ''), 10);
        if (!Number.isNaN(month)) return 900000 + month * 100 + index;
        return 999999 + index;
    };

    const shiftMonthInfo = (monthKey: string, deltaMonths: number) => {
        const [year, month] = monthKey.split('-').map((part) => parseInt(part, 10));
        if (Number.isNaN(year) || Number.isNaN(month)) return null;
        const date = new Date(year, month - 1 + deltaMonths, 1);
        return {
            monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
            label: `${date.getMonth() + 1}月`
        };
    };

    const normalizeLegacyWeightHistory = (items: WeightHistoryPoint[], reportMonthKey?: string | null) => {
        const anchor = getMonthInfo(reportMonthKey);
        if (!anchor || !items.length) return items;
        const hasLegacy = items.some((item) => !item.monthKey);
        if (!hasLegacy) return items;
        return items.map((item, index) => {
            if (item.monthKey) return item;
            const monthInfo = shiftMonthInfo(anchor.monthKey, index - (items.length - 1));
            return {
                ...item,
                label: monthInfo?.label || item.label,
                monthKey: monthInfo?.monthKey
            };
        });
    };

    const buildWeightHistoryFromWeights = (weights: { measured_at: string; weight: number | null }[]) => {
        return weights?.map((r) => {
            const monthInfo = getMonthInfo(r.measured_at);
            return {
                label: monthInfo?.label || '',
                monthKey: monthInfo?.monthKey,
                value: r.weight || 0
            };
        }).filter((item) => item.value > 0 && item.label) || [];
    };

    const mergeWeightHistory = (
        base: WeightHistoryPoint[],
        override?: WeightHistoryPoint[],
        reportMonthKey?: string | null,
        latestWeightValue?: number | null
    ) => {
        const keyed = new Map<string, WeightHistoryPoint>();
        const legacy: WeightHistoryPoint[] = [];

        const pushItem = (item?: WeightHistoryPoint) => {
            if (!item || !item.label || !(item.value > 0)) return;
            if (item.monthKey && /^\d{4}-\d{2}$/.test(item.monthKey)) {
                keyed.set(item.monthKey, item);
                return;
            }
            legacy.push(item);
        };

        base.forEach(pushItem);
        normalizeLegacyWeightHistory(override || [], reportMonthKey).forEach((item) => {
            const monthInfo = item.monthKey ? { monthKey: item.monthKey, label: item.label } : getMonthInfo(item.label);
            pushItem({
                ...item,
                label: monthInfo?.label || item.label,
                monthKey: monthInfo?.monthKey
            });
        });

        if (reportMonthKey && latestWeightValue && latestWeightValue > 0) {
            const monthInfo = getMonthInfo(reportMonthKey);
            if (monthInfo) {
                keyed.set(monthInfo.monthKey, {
                    label: monthInfo.label,
                    monthKey: monthInfo.monthKey,
                    value: latestWeightValue
                });
            }
        }

        const keyedResult = Array.from(keyed.values()).sort((a, b) => getMonthKeySortValue(a, 0) - getMonthKeySortValue(b, 0));
        return [...keyedResult, ...legacy];
    };

    useEffect(() => {
        if (!id || !user) return; // Wait for user
        if (isDirty) return; // Don't overwrite while editing

        let isMounted = true;
        const fetchReportData = async (retryCount = 0) => {
            try {
                if (isNew) {
                    // Determine horseId from URL params (if linked from Horse Detail)
                    const params = new URLSearchParams(window.location.search);
                    const paramHorseId = params.get('horseId');
                    const reportTypeParam = params.get('reportType');
                    const nextReportType = reportTypeParam === 'departure' ? 'departure' : 'monthly';
                    if (isMounted) setReportType(nextReportType);
                    const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.'); // yyyy.MM
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    const sixMonthsAgoIso = sixMonthsAgo.toISOString();

                    if (paramHorseId) {
                        if (isMounted) setHorseId(paramHorseId);
                        // Fetch horse details to prepopulate
                        const horseArr = await restGet(`horses?id=eq.${paramHorseId}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`);
                        const horse = horseArr?.[0];

                        // Fetch past weight history (last 6 months)
                        const weights = await restGet(`horse_weights?horse_id=eq.${paramHorseId}&measured_at=gte.${encodeURIComponent(sixMonthsAgoIso)}&select=measured_at,weight&order=measured_at.asc`);

                        const latestWeightEntry = await fetchLatestWeightEntry(paramHorseId);
                        const latestMonthlyReport = await fetchLatestMonthlyReport(paramHorseId);

                        const weightHistoryFromWeights = buildWeightHistoryFromWeights(weights || []);

                    if (isMounted) {
                        const latestWeightValue = latestWeightEntry?.weight ?? latestMonthlyReport?.weight ?? null;
                        const latestWeightDate = latestWeightEntry?.measured_at || '';
                        const latestHistory = latestMonthlyReport?.metrics_json?.weightHistory;
                        const weightHistory = mergeWeightHistory(
                            weightHistoryFromWeights,
                            Array.isArray(latestHistory) ? latestHistory : [],
                            defaultDate,
                            latestWeightValue
                        );

                        if (nextReportType === 'departure') {
                            const defaultOutputMode = resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode);
                            setInitialData({
                                reportDate: new Date().toISOString().slice(0, 10),
                                horseNameJp: horse?.name || '',
                                horseNameEn: horse?.name_en || '',
                                sexAgeJp: formatSexAge(horse?.sex, horse?.birth_date, 'ja'),
                                sexAgeEn: formatSexAge(horse?.sex, horse?.birth_date, 'en'),
                                sireJp: horse?.sire || '',
                                sireEn: horse?.sire_en || '',
                                damJp: horse?.dam || '',
                                damEn: horse?.dam_en || '',
                                ownerName: horse?.clients?.name || '',
                                trainerNameJp: horse?.trainers?.trainer_name || '',
                                trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                weight: latestWeightValue !== null ? `${latestWeightValue}kg` : '',
                                weightDate: latestWeightDate || '',
                                farrierJp: horse?.last_farrier_note || '',
                                farrierEn: horse?.last_farrier_note || '',
                                farrierDate: horse?.last_farrier_date || '',
                                wormingJp: horse?.last_worming_note || '',
                                wormingEn: horse?.last_worming_note || '',
                                wormingDate: horse?.last_worming_date || '',
                                feedingJp: '',
                                feedingEn: '',
                                exerciseJp: '',
                                exerciseEn: '',
                                commentJp: '',
                                commentEn: '',
                                outputMode: defaultOutputMode,
                                showLogo: defaultOutputMode !== 'print'
                            });
                        } else {
                            setInitialData({
                                reportDate: defaultDate,
                                horseNameJp: horse?.name || '',
                                horseNameEn: horse?.name_en || '',
                                sire: horse?.sire || '',
                                sireEn: horse?.sire_en || '',
                                sireJp: horse?.sire || '',
                                dam: horse?.dam || '',
                                damEn: horse?.dam_en || '',
                                damJp: horse?.dam || '',
                                ownerName: horse?.clients?.name || '',
                                trainerNameJp: horse?.trainers?.trainer_name || '',
                                trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                trainerLocation: horse?.trainers?.trainer_location || '',
                                birthDate: horse?.birth_date || '',
                                age: calculateHorseAge(horse?.birth_date),
                                sex: horse?.sex || '',
                                outputMode: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode),
                                showLogo: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode) !== 'print',
                                mainPhoto: '',
                                originalPhoto: '',
                                statusEn: 'Training', statusJp: '調整中',
                                weight: latestWeightValue !== null ? `${latestWeightValue} kg` : '',
                                targetEn: '', targetJp: '',
                                commentEn: '', commentJp: '',
                                weightHistory: weightHistory
                            });
                        }
                        setLoading(false);
                        }
                    } else {
                        // No horse selected, fetch list and show selector
                        const allHorses = await restGet('horses?select=id,name,name_en&departure_date=is.null&order=name');
                        if (isMounted) {
                            if (allHorses) setHorses(allHorses);
                            setShowHorseSelector(true);
                            setLoading(false);
                        }
                    }
                    return;
                }

                // Existing Report Logic
                const reportArr = await restGet(`reports?id=eq.${id}&select=*`);
                const report = reportArr?.[0];
                if (!report) throw new Error("Report not found");

                // Fetch Horse Data
                const horseArr = await restGet(`horses?id=eq.${report.horse_id}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`);
                const horse = horseArr?.[0];
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                const sixMonthsAgoIso = sixMonthsAgo.toISOString();
                const weights = await restGet(`horse_weights?horse_id=eq.${report.horse_id}&measured_at=gte.${encodeURIComponent(sixMonthsAgoIso)}&select=measured_at,weight&order=measured_at.asc`);
                const weightHistoryFromWeights = buildWeightHistoryFromWeights(weights || []);

                if (isMounted) {
                    setHorseId(report.horse_id);

                    // Parse metrics_json for extra fields
                    const metrics = report.metrics_json || {};
                    const reportTypeFromMetrics = metrics.reportType === 'departure' ? 'departure' : 'monthly';
                    setReportType(reportTypeFromMetrics);

                    // Map DB to ReportData
                    if (reportTypeFromMetrics === 'departure') {
                        const defaultOutputMode = resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode);
                        const metricsOutputMode = metrics.outputMode === 'print' || metrics.outputMode === 'pdf'
                            ? metrics.outputMode
                            : defaultOutputMode;
                        const metricsShowLogo = typeof metrics.showLogo === 'boolean'
                            ? metrics.showLogo
                            : metricsOutputMode !== 'print';
                        setInitialData({
                            reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 10),
                            horseNameJp: metrics.horseNameJp || horse?.name || '',
                            horseNameEn: metrics.horseNameEn || horse?.name_en || '',
                            sexAgeJp: metrics.sexAgeJp || formatSexAge(horse?.sex, horse?.birth_date, 'ja'),
                            sexAgeEn: metrics.sexAgeEn || formatSexAge(horse?.sex, horse?.birth_date, 'en'),
                            sireJp: metrics.sireJp || horse?.sire || '',
                            sireEn: metrics.sireEn || horse?.sire_en || '',
                            damJp: metrics.damJp || horse?.dam || '',
                            damEn: metrics.damEn || horse?.dam_en || '',
                            ownerName: metrics.ownerName || horse?.clients?.name || '',
                            trainerNameJp: metrics.trainerNameJp || horse?.trainers?.trainer_name || '',
                            trainerNameEn: metrics.trainerNameEn || horse?.trainers?.trainer_name_en || '',
                            weight: report.weight ? `${report.weight}kg` : '',
                            weightDate: metrics.weightDate || '',
                            farrierJp: metrics.farrierJp || '',
                            farrierEn: metrics.farrierEn || '',
                            farrierDate: metrics.farrierDate || '',
                            wormingJp: metrics.wormingJp || '',
                            wormingEn: metrics.wormingEn || '',
                            wormingDate: metrics.wormingDate || '',
                            feedingJp: metrics.feedingJp || '',
                            feedingEn: metrics.feedingEn || '',
                            exerciseJp: metrics.exerciseJp || '',
                            exerciseEn: metrics.exerciseEn || '',
                            commentJp: report.body || metrics.commentJp || '',
                            commentEn: metrics.commentEn || '',
                            outputMode: metricsOutputMode,
                            showLogo: metricsShowLogo
                        });
                    } else {
                        const resolvedMode = resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode);
                        const reportMonthKey = report.title || report.created_at;
                        const baseHistory = Array.isArray(metrics.weightHistory) ? metrics.weightHistory : [];
                        const mergedHistory = mergeWeightHistory(
                            weightHistoryFromWeights,
                            baseHistory,
                            reportMonthKey,
                            report.weight ?? null
                        );
                        const showLogo = metrics.showLogo ?? (resolvedMode !== 'print');
                        setInitialData({
                            reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                            horseNameJp: metrics.horseNameJp || horse?.name || '',
                            horseNameEn: metrics.horseNameEn || horse?.name_en || '',
                            sire: horse?.sire || '',
                            sireEn: metrics.sireEn || horse?.sire_en || '',
                            sireJp: metrics.sireJp || horse?.sire || '',
                            dam: horse?.dam || '',
                            damEn: metrics.damEn || horse?.dam_en || '',
                            damJp: metrics.damJp || horse?.dam || '',
                            conditionJp: metrics.conditionJp || report.condition || '',
                            conditionEn: metrics.conditionEn || '',
                            ownerName: horse?.clients?.name || '',
                            trainerNameJp: horse?.trainers?.trainer_name || '',
                            trainerNameEn: horse?.trainers?.trainer_name_en || '',
                            trainerLocation: horse?.trainers?.trainer_location || '',
                            trainerLocationEn: horse?.trainers?.trainer_location_en || '',
                            birthDate: horse?.birth_date || '',
                            age: calculateHorseAge(horse?.birth_date),
                            sex: metrics.sex || horse?.sex || '',
                            outputMode: resolvedMode,
                            showLogo: showLogo,

                            commentJp: report.body || '',
                            commentEn: metrics.commentEn || '',

                            weight: report.weight ? `${report.weight} kg` : '',

                            statusJp: report.status_training || '',
                            statusEn: metrics.statusEn || '',

                            targetJp: report.target || '',
                            targetEn: metrics.targetEn || '',

                            weightHistory: mergedHistory,

                            mainPhoto: report.main_photo_url || '',
                            originalPhoto: report.main_photo_url || '',
                            logo: null
                        });
                    }

                        setReviewStatus(report.review_status || 'draft');
                        setIsDirty(false);
                        setLoading(false);
                    }
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const msg = String(error?.message || '');
                const isAbort = msg.includes('AbortError');
                if (isAbort && isMounted) {
                    console.warn('Report load aborted; switching to raw fetch fallback');
                } else {
                    console.error("Error loading report data:", error);
                }

                // Retry logic (skip supabase retry if AbortError)
                if (!isAbort && isMounted && retryCount < 2) {
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
                            const sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                            const sixMonthsAgoIso = encodeURIComponent(sixMonthsAgo.toISOString());

                            if (paramHorseId) {
                                if (isMounted) setHorseId(paramHorseId);
                                const [horseRes, reportsRes, latestReportRes] = await Promise.all([
                                    fetch(`${supabaseUrl}/rest/v1/horses?id=eq.${paramHorseId}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`, { headers }),
                                    fetch(`${supabaseUrl}/rest/v1/horse_weights?horse_id=eq.${paramHorseId}&measured_at=gte.${sixMonthsAgoIso}&select=measured_at,weight&order=measured_at.asc`, { headers }),
                                    fetch(`${supabaseUrl}/rest/v1/reports?horse_id=eq.${paramHorseId}&select=weight,metrics_json,created_at,title&order=created_at.desc&limit=5`, { headers })
                                ]);

                                if (horseRes.ok && reportsRes.ok) {
                                    const hData = await horseRes.json();
                                    const rData = await reportsRes.json();
                                    const horse = hData[0];

                                    const weightUrl = `${supabaseUrl}/rest/v1/horse_weights?horse_id=eq.${paramHorseId}&select=weight,measured_at&order=measured_at.desc&limit=1`;
                                    const weightRes = await fetch(weightUrl, { headers });
                                    const weightData = weightRes.ok ? await weightRes.json() : [];
                                    const latestWeight = weightData?.[0]?.weight ?? null;

                                    const latestReportData = latestReportRes.ok ? await latestReportRes.json() : [];
                                    const latestMonthlyReport = (latestReportData || []).find((r: { metrics_json?: { reportType?: string } }) => {
                                        return r?.metrics_json?.reportType !== 'departure';
                                    });
                                    const latestHistory = latestMonthlyReport?.metrics_json?.weightHistory;
                                    const weightHistoryFromWeights = buildWeightHistoryFromWeights(rData || []);
                                    const weightHistory = mergeWeightHistory(
                                        weightHistoryFromWeights,
                                        Array.isArray(latestHistory) ? latestHistory : [],
                                        defaultDate,
                                        latestWeight ?? latestMonthlyReport?.weight
                                    );

                                    if (isMounted) {
                                        setInitialData({
                                            reportDate: defaultDate,
                                            horseNameJp: horse?.name || '',
                                            horseNameEn: horse?.name_en || '',
                                            sire: horse?.sire || '',
                                            sireEn: horse?.sire_en || '',
                                            sireJp: horse?.sire || '',
                                            dam: horse?.dam || '',
                                            damEn: horse?.dam_en || '',
                                            damJp: horse?.dam || '',
                                            conditionJp: '',
                                            conditionEn: '',
                                            ownerName: horse?.clients?.name || '',
                                            trainerNameJp: horse?.trainers?.trainer_name || '',
                                            trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                            trainerLocation: horse?.trainers?.trainer_location || '',
                                            birthDate: horse?.birth_date || '',
                                            age: calculateHorseAge(horse?.birth_date),
                                            sex: horse?.sex || '',
                                            outputMode: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode),
                                            showLogo: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode) !== 'print',
                                            mainPhoto: '',
                                            originalPhoto: '',
                                            statusEn: 'Training', statusJp: '調整中',
                                            weight: latestWeight !== null ? `${latestWeight} kg` : latestMonthlyReport?.weight !== null && latestMonthlyReport?.weight !== undefined ? `${latestMonthlyReport.weight} kg` : '', targetEn: '', targetJp: '',
                                            commentEn: '', commentJp: '',
                                            weightHistory: weightHistory
                                        });
                                        setLoading(false);
                                    }
                                }
                            } else {
                                // List horses fallback
                                const res = await fetch(`${supabaseUrl}/rest/v1/horses?select=id,name,name_en&departure_date=is.null&order=name`, { headers });
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
                            const reportRes = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}&select=*`, { headers });
                            if (!reportRes.ok) throw new Error("Report fetch failed");
                            const rData = await reportRes.json();
                            const report = rData[0];
                            if (!report) throw new Error("Report not found");

                            const horseRes = await fetch(`${supabaseUrl}/rest/v1/horses?id=eq.${report.horse_id}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`, { headers });
                            const hData = await horseRes.json();
                            const horse = hData[0];
                            const sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                            const historyRes = await fetch(`${supabaseUrl}/rest/v1/horse_weights?horse_id=eq.${report.horse_id}&measured_at=gte.${encodeURIComponent(sixMonthsAgo.toISOString())}&select=measured_at,weight&order=measured_at.asc`, { headers });
                            const historyData = historyRes.ok ? await historyRes.json() : [];

                            if (isMounted) {
                                setHorseId(report.horse_id);
                                const metrics = report.metrics_json || {};
                                const resolvedMode = resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode);
                                const showLogo = metrics.showLogo ?? (resolvedMode !== 'print');
                                const mergedHistory = mergeWeightHistory(
                                    buildWeightHistoryFromWeights(historyData || []),
                                    Array.isArray(metrics.weightHistory) ? metrics.weightHistory : [],
                                    report.title || report.created_at,
                                    report.weight ?? null
                                );
                                setInitialData({
                                    reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                                    horseNameJp: metrics.horseNameJp || horse?.name || '',
                                    horseNameEn: metrics.horseNameEn || horse?.name_en || '',
                                    sire: horse?.sire || '',
                                    sireEn: metrics.sireEn || horse?.sire_en || '',
                                    sireJp: metrics.sireJp || horse?.sire || '',
                                    dam: horse?.dam || '',
                                    damEn: metrics.damEn || horse?.dam_en || '',
                                    damJp: metrics.damJp || horse?.dam || '',
                                    conditionJp: metrics.conditionJp || report.condition || '',
                                    conditionEn: metrics.conditionEn || '',
                                    ownerName: horse?.clients?.name || '',
                                    trainerNameJp: horse?.trainers?.trainer_name || '',
                                    trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                    trainerLocation: horse?.trainers?.trainer_location || '',
                                    trainerLocationEn: horse?.trainers?.trainer_location_en || '',
                                    birthDate: horse?.birth_date || '',
                                    age: calculateHorseAge(horse?.birth_date),
                                    sex: metrics.sex || horse?.sex || '',
                                    outputMode: resolvedMode,
                                    showLogo: showLogo,
                                    commentJp: report.body || '',
                                    commentEn: metrics.commentEn || '',
                                    weight: report.weight ? `${report.weight} kg` : '',
                                    statusJp: report.status_training || '',
                                    statusEn: metrics.statusEn || '',
                                    targetJp: report.target || '',
                                    targetEn: metrics.targetEn || '',
                                    weightHistory: mergedHistory,
                                    mainPhoto: report.main_photo_url || horse?.photo_url || '',
                                    originalPhoto: report.main_photo_url || horse?.photo_url || '',
                                    logo: null
                                });
                                setReviewStatus(report.review_status || 'draft');
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
    }, [id, isNew, user?.id, session?.access_token, isDirty]);

    useEffect(() => {
        if (loading) return;
        if (draftPromptedKey === draftKey) return;
        if (typeof window === 'undefined') return;

        const localRaw = window.localStorage.getItem(draftKey);
        let localDraft: { updatedAt?: string; reportType?: 'monthly' | 'departure'; data?: ReportData | DepartureReportData } | null = null;
        if (localRaw) {
            try {
                localDraft = JSON.parse(localRaw);
            } catch (err) {
                console.warn('Failed to parse local draft data', err);
            }
        }

        const load = async () => {
            const remoteDraft = await fetchRemoteDraft();
            const localTime = localDraft?.updatedAt ? new Date(localDraft.updatedAt).getTime() : 0;
            const remoteTime = remoteDraft?.updated_at ? new Date(remoteDraft.updated_at).getTime() : 0;
            const useRemote = remoteTime > localTime;

            const chosen = useRemote ? remoteDraft : localDraft;
            const chosenData = useRemote ? remoteDraft?.data : localDraft?.data;
            const chosenType = useRemote ? remoteDraft?.report_type : localDraft?.reportType;
            const chosenUpdated = useRemote ? remoteDraft?.updated_at : localDraft?.updatedAt;

            const hasData = chosenData && Object.keys(chosenData).length > 0;
            if (!hasData) {
                setDraftPromptedKey(draftKey);
                return;
            }

            const label = chosenUpdated ? new Date(chosenUpdated).toLocaleString() : 'recent';
            if (window.confirm(`Unsaved draft found (${label}). Restore?`)) {
                if (chosenType === 'departure' || chosenType === 'monthly') {
                    setReportType(chosenType);
                }
                setInitialData(chosenData || {});
                reportDataRef.current = chosenData || null;
                setIsDirty(true);
            }
            setDraftPromptedKey(draftKey);
        };

        load().catch(() => setDraftPromptedKey(draftKey));
    }, [draftKey, draftPromptedKey, loading]);

    const handleSelectHorse = async (selectedHorseId: string) => {
        setHorseId(selectedHorseId);
        setShowHorseSelector(false);
        setLoading(true);
        setIsDirty(false);
        const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.');
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoIso = sixMonthsAgo.toISOString();

        // Fetch horse details
        const horseArr = await restGet(`horses?id=eq.${selectedHorseId}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`);
        const horse = horseArr?.[0];

        // Fetch past weight history (last 6 months)
        const weights = await restGet(`horse_weights?horse_id=eq.${selectedHorseId}&measured_at=gte.${encodeURIComponent(sixMonthsAgoIso)}&select=measured_at,weight&order=measured_at.asc`);

        const latestWeightEntry = await fetchLatestWeightEntry(selectedHorseId);
        const latestMonthlyReport = await fetchLatestMonthlyReport(selectedHorseId);

        const weightHistoryFromWeights = buildWeightHistoryFromWeights(weights || []);

        const latestWeightValue = latestWeightEntry?.weight ?? latestMonthlyReport?.weight ?? null;
        const latestWeightDate = latestWeightEntry?.measured_at || '';
        const latestHistory = latestMonthlyReport?.metrics_json?.weightHistory;
        const weightHistory = mergeWeightHistory(
            weightHistoryFromWeights,
            Array.isArray(latestHistory) ? latestHistory : [],
            defaultDate,
            latestWeightValue
        );

        if (reportType === 'departure') {
            setInitialData({
                reportDate: new Date().toISOString().slice(0, 10),
                horseNameJp: horse?.name || '',
                horseNameEn: horse?.name_en || '',
                sexAgeJp: formatSexAge(horse?.sex, horse?.birth_date, 'ja'),
                sexAgeEn: formatSexAge(horse?.sex, horse?.birth_date, 'en'),
                sireJp: horse?.sire || '',
                sireEn: horse?.sire_en || '',
                damJp: horse?.dam || '',
                damEn: horse?.dam_en || '',
                ownerName: horse?.clients?.name || '',
                trainerNameJp: horse?.trainers?.trainer_name || '',
                trainerNameEn: horse?.trainers?.trainer_name_en || '',
                weight: latestWeightValue !== null ? `${latestWeightValue}kg` : '',
                weightDate: latestWeightDate || '',
                farrierJp: horse?.last_farrier_note || '',
                farrierEn: horse?.last_farrier_note || '',
                farrierDate: horse?.last_farrier_date || '',
                wormingJp: horse?.last_worming_note || '',
                wormingEn: horse?.last_worming_note || '',
                wormingDate: horse?.last_worming_date || '',
                feedingJp: '',
                feedingEn: '',
                exerciseJp: '',
                exerciseEn: '',
                commentJp: '',
                commentEn: ''
            });
        } else {
            setInitialData({
                reportDate: defaultDate,
                horseNameJp: horse?.name || '',
                horseNameEn: horse?.name_en || '',
                sire: horse?.sire || '',
                sireEn: horse?.sire_en || '',
                sireJp: horse?.sire || '',
                dam: horse?.dam || '',
                damEn: horse?.dam_en || '',
                damJp: horse?.dam || '',
                ownerName: horse?.clients?.name || '',
                trainerNameJp: horse?.trainers?.trainer_name || '',
                trainerNameEn: horse?.trainers?.trainer_name_en || '',
                trainerLocation: horse?.trainers?.trainer_location || '',
                trainerLocationEn: horse?.trainers?.trainer_location_en || '',
                birthDate: horse?.birth_date || '',
                age: calculateHorseAge(horse?.birth_date),
                sex: horse?.sex || '',
                outputMode: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode),
                showLogo: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode) !== 'print',
                mainPhoto: '',
                originalPhoto: '',
                statusEn: 'Training', statusJp: '調整中',
                weight: latestWeightValue !== null ? `${latestWeightValue} kg` : '', targetEn: '', targetJp: '',
                commentEn: '', commentJp: '',
                weightHistory: weightHistory
            });
        }
        setLoading(false);
    };

    const handleDataChange = useCallback((data: ReportData | DepartureReportData) => {
        reportDataRef.current = data;
        setIsDirty(true);
        setAutosaveStatus('Saving draft...');
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!reportDataRef.current) return;
        if (saving) return;

        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
        }

        autosaveTimerRef.current = window.setTimeout(() => {
            try {
                const draftData = stripDraftImagePayload(reportDataRef.current as ReportData | DepartureReportData);
                const payload = {
                    updatedAt: new Date().toISOString(),
                    reportType,
                    data: draftData
                };
                window.localStorage.setItem(draftKey, JSON.stringify(payload));
                setAutosaveStatus('Saved locally');
                setAutosaveStamp(Date.now());
            } catch (err) {
                console.warn('Failed to store draft', err);
            }
            const now = Date.now();
            const currentData = reportDataRef.current as ReportData | DepartureReportData | null;
            const hasInlinePhoto = !!(currentData && 'mainPhoto' in currentData && typeof currentData.mainPhoto === 'string' && currentData.mainPhoto.startsWith('data:'));
            const remoteInterval = hasInlinePhoto ? 120_000 : 30_000;
            if (now - lastRemoteSaveRef.current >= remoteInterval) {
                void saveRemoteDraft();
            }
        }, 300);

        return () => {
            if (autosaveTimerRef.current) {
                window.clearTimeout(autosaveTimerRef.current);
            }
        };
    }, [draftKey, reportType, isDirty, saving]);

    useEffect(() => {
        if (!session?.access_token) return;
        if (remoteAutosaveTimerRef.current) {
            window.clearInterval(remoteAutosaveTimerRef.current);
        }
        remoteAutosaveTimerRef.current = window.setInterval(() => {
            if (!reportDataRef.current) return;
            if (!isDirty) return;
            if (saving) return;
            const currentData = reportDataRef.current as ReportData | DepartureReportData;
            const hasInlinePhoto = 'mainPhoto' in currentData && typeof currentData.mainPhoto === 'string' && currentData.mainPhoto.startsWith('data:');
            if (hasInlinePhoto && Date.now() - lastRemoteSaveRef.current < 120_000) return;
            void saveRemoteDraft();
        }, 30_000);

        return () => {
            if (remoteAutosaveTimerRef.current) {
                window.clearInterval(remoteAutosaveTimerRef.current);
                remoteAutosaveTimerRef.current = null;
            }
        };
    }, [session?.access_token, isDirty, draftKey, saving]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!isDirty) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    function dataUrlToBlob(dataUrl: string): Blob {
        const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!matches) {
            throw new Error('Invalid image data');
        }
        const mimeType = matches[1];
        const binary = atob(matches[2]);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mimeType });
    }

    async function uploadImage(base64Data: string, path: string): Promise<{ url: string | null, error: unknown }> {
        try {
            if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
                throw new Error('Missing storage configuration');
            }
            const blob = dataUrlToBlob(base64Data);
            const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 90_000);
            const res = await fetch(`${supabaseUrl}/storage/v1/object/report-assets/${encodedPath}`, {
                method: 'POST',
                headers: {
                    apikey: supabaseAnonKey,
                    Authorization: `Bearer ${session.access_token}`,
                    'x-upsert': 'true',
                    'Content-Type': blob.type || 'image/jpeg'
                },
                body: blob,
                signal: controller.signal
            }).finally(() => {
                window.clearTimeout(timeoutId);
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('Upload Error:', text);
                return { url: null, error: new Error(text || `Storage upload failed: ${res.status}`) };
            }

            const { data: { publicUrl } } = supabase.storage
                .from('report-assets')
                .getPublicUrl(path);

            return { url: publicUrl, error: null };
        } catch (e) {
            console.error('Image Processing Error:', e);
            return { url: null, error: e };
        }
    }

    async function saveReport() {
        if (!reportDataRef.current || !id) return;
        if (!horseId) {
            alert("No horse selected!");
            return;
        }

        setSaving(true);
        const d = reportDataRef.current;
        const saveTimeout = window.setTimeout(() => {
            console.warn('Save timed out, resetting UI');
            setSaving(false);
            alert('Save is taking too long. Please try again.');
        }, 90000);

        try {
            if (reportType === 'departure') {
                const dep = d as DepartureReportData;
                const metricsJson = {
                    reportType: 'departure',
                    horseNameJp: dep.horseNameJp,
                    horseNameEn: dep.horseNameEn,
                    sexAgeJp: dep.sexAgeJp,
                    sexAgeEn: dep.sexAgeEn,
                    sireJp: dep.sireJp,
                    sireEn: dep.sireEn,
                    damJp: dep.damJp,
                    damEn: dep.damEn,
                    ownerName: dep.ownerName,
                    trainerNameJp: dep.trainerNameJp,
                    trainerNameEn: dep.trainerNameEn,
                    weightDate: dep.weightDate,
                    farrierJp: dep.farrierJp,
                    farrierEn: dep.farrierEn,
                    farrierDate: dep.farrierDate,
                    wormingJp: dep.wormingJp,
                    wormingEn: dep.wormingEn,
                    wormingDate: dep.wormingDate,
                    feedingJp: dep.feedingJp,
                    feedingEn: dep.feedingEn,
                    exerciseJp: dep.exerciseJp,
                    exerciseEn: dep.exerciseEn,
                    commentJp: dep.commentJp,
                    commentEn: dep.commentEn,
                    outputMode: dep.outputMode || 'pdf',
                    showLogo: dep.showLogo ?? true
                };

                const payload = {
                    horse_id: horseId,
                    title: dep.reportDate,
                    body: dep.commentJp || null,
                    weight: parseFloat(dep.weight.replace(/[^0-9.]/g, '') || '0'),
                    status_training: 'Departed',
                    metrics_json: metricsJson,
                    updated_at: new Date().toISOString()
                };

                let newReportId: string | null = null;
                const controller = new AbortController();
                const abortId = window.setTimeout(() => controller.abort(), 8000);
                const headers = getRestHeaders();
                if (isNew) {
                    const res = await fetch(`${supabaseUrl}/rest/v1/reports`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    window.clearTimeout(abortId);
                    if (!res.ok) {
                        const text = await res.text();
                        throw new Error(`REST insert failed: ${res.status} ${text}`);
                    }
                    const data = await res.json();
                    newReportId = data?.[0]?.id ?? null;
                } else {
                    const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}`, {
                        method: 'PATCH',
                        headers,
                        body: JSON.stringify(payload),
                        signal: controller.signal
                    });
                    window.clearTimeout(abortId);
                    if (!res.ok) {
                        const text = await res.text();
                        throw new Error(`REST update failed: ${res.status} ${text}`);
                    }
                }

                setLastSaved(new Date());
                setIsDirty(false);
                setSaving(false);
                if (typeof window !== 'undefined') {
                    window.localStorage.removeItem(draftKey);
                }
                void deleteRemoteDraft();
                setAutosaveStatus('Saved');
                setAutosaveStamp(Date.now());
                if (isNew && newReportId) {
                    router.replace(`/reports/${newReportId}`);
                }
                return;
            }

            const monthly = d as ReportData;
            let mainPhotoUrl = monthly.mainPhoto;
            const isNewPhoto = !!monthly.mainPhoto && (monthly.mainPhoto.startsWith('data:') || monthly.mainPhoto.startsWith('blob:'));
            const isSameAsOriginal = !!monthly.originalPhoto && monthly.mainPhoto === monthly.originalPhoto;
            // const logoUrl = d.logo; // Unused
            // Check if mainPhoto is new (Base64 or Blob) - only upload if changed
            if (isNewPhoto && !isSameAsOriginal) {
                console.log('[save] uploading photo');
                const fileName = `main_${Date.now()}.jpg`;
                const reportPathId = isNew ? `temp_${Date.now()}` : id;
                const path = `${horseId}/${reportPathId}/${fileName}`;
                const { url: uploadedUrl, error: uploadError } = await uploadImage(monthly.mainPhoto, path);
                if (uploadedUrl) {
                    mainPhotoUrl = uploadedUrl;
                } else {
                    const errorMsg = (uploadError as { message?: string })?.message || JSON.stringify(uploadError) || "Unknown Error";
                    alert(`Failed to upload image.\nError: ${errorMsg}\n\nPlease check Supabase Storage policies.`);
                    setSaving(false);
                    window.clearTimeout(saveTimeout);
                    return;
                }
                console.log('[save] upload done');
            } else if (isSameAsOriginal) {
                mainPhotoUrl = monthly.originalPhoto || monthly.mainPhoto;
            }

        // Pack extra fields into metrics_json
        const metricsJson = {
            reportType: 'monthly',
            commentEn: monthly.commentEn,
            statusEn: monthly.statusEn,
            targetEn: monthly.targetEn,
            weightHistory: monthly.weightHistory,
            sireEn: monthly.sireEn,
            sireJp: monthly.sireJp,
            damEn: monthly.damEn,
            damJp: monthly.damJp,
            sex: monthly.sex || '',
            showLogo: monthly.showLogo ?? true,
            horseNameJp: monthly.horseNameJp,
            horseNameEn: monthly.horseNameEn,
            conditionJp: monthly.conditionJp,
            conditionEn: monthly.conditionEn
        };

        const payload = {
            horse_id: horseId, // Ensure horse_id is set
            title: monthly.reportDate, // Store report date in title
            body: monthly.commentJp,
            weight: parseFloat(monthly.weight.replace(/[^0-9.]/g, '') || '0'),
            status_training: monthly.statusJp, // Map statusJp to status_training
            condition: monthly.conditionJp || null,
            target: monthly.targetJp, // Map targetJp to target
            metrics_json: metricsJson,
            main_photo_url: mainPhotoUrl,
            updated_at: new Date().toISOString()
        };

            let newReportId: string | null = null;
            const controller = new AbortController();
            const abortId = window.setTimeout(() => controller.abort(), 8000);
            const headers = getRestHeaders();
            if (isNew) {
                const res = await fetch(`${supabaseUrl}/rest/v1/reports`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                window.clearTimeout(abortId);
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`REST insert failed: ${res.status} ${text}`);
                }
                const data = await res.json();
                newReportId = data?.[0]?.id ?? null;
            } else {
                const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                window.clearTimeout(abortId);
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`REST update failed: ${res.status} ${text}`);
                }
            }

        setSaving(false);
        setLastSaved(new Date());
        setIsDirty(false);
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem(draftKey);
        }
        void deleteRemoteDraft();
        setAutosaveStatus('Saved');
        setAutosaveStamp(Date.now());

        // Update horse metadata in the background so report save completion is not blocked.
        if (horseId) {
            const horsePayload = {
                name: monthly.horseNameJp,
                name_en: monthly.horseNameEn,
                sire: monthly.sireJp || monthly.sire,
                dam: monthly.damJp || monthly.dam,
                sire_en: monthly.sireEn || null,
                dam_en: monthly.damEn || null,
                birth_date: monthly.birthDate || null,
                sex: monthly.sex || null,
                photo_url: mainPhotoUrl,
                updated_at: new Date().toISOString()
            };
            const horseUpdateController = new AbortController();
            const horseUpdateAbortId = window.setTimeout(() => horseUpdateController.abort(), 8000);
            fetch(`${supabaseUrl}/rest/v1/horses?id=eq.${horseId}`, {
                method: 'PATCH',
                headers: getRestHeaders(),
                body: JSON.stringify(horsePayload),
                signal: horseUpdateController.signal
            }).catch((horseUpdateError) => {
                console.warn('Horse update failed:', horseUpdateError);
            }).finally(() => {
                window.clearTimeout(horseUpdateAbortId);
            });
        }

            if (isNew && newReportId) {
                router.replace(`/reports/${newReportId}`);
            } else {
                if (monthly.mainPhoto.startsWith('data:') || monthly.mainPhoto.startsWith('blob:')) {
                    if (reportDataRef.current && 'mainPhoto' in reportDataRef.current) {
                        reportDataRef.current.mainPhoto = mainPhotoUrl;
                    }
                }
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('Save failed. Please try again.');
            setSaving(false);
        } finally {
            window.clearTimeout(saveTimeout);
        }
    }

    const handleUpdateStatus = async (newStatus: string) => {
        if (!id || isNew) {
            alert("Please save the report first.");
            return;
        }
        if (!confirm(`Change status to "${newStatus}"?`)) return;

        setSaving(true);
        try {
            const headers = getRestHeaders();
            const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ review_status: newStatus })
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Status update failed: ${res.status} ${text}`);
            }
            setReviewStatus(newStatus);
        } catch (error) {
            const msg = (error as { message?: string })?.message || JSON.stringify(error);
            alert("Error updating status: " + msg);
        }
        setSaving(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading Report...</div>;

    if (showHorseSelector) {
        return (
            <div className="min-h-screen flex items-start justify-center pt-10 sm:pt-20 bg-gray-100 font-sans px-4">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-2xl border border-stone-200">
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-2xl font-bold text-[#1a3c34]">Select a Horse</h2>
                        <LanguageToggle />
                    </div>
                    <p className="text-stone-500 mb-6 text-sm">Please select a horse to create a report for.</p>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {horses.map(h => (
                            <button
                                key={h.id}
                                onClick={() => handleSelectHorse(h.id)}
                                className="w-full text-left p-4 hover:bg-[#1a3c34]/5 border border-stone-200 rounded-lg transition-all duration-200 text-lg text-[#1a3c34] font-medium block group"
                            >
                                {h.name} <span className="text-sm text-stone-400 ml-2 font-normal">{h.name_en}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full min-h-0 overflow-y-auto md:overflow-hidden flex flex-col items-stretch md:items-center py-2 sm:py-8 font-sans print:py-0 print:block print:min-h-0 print:h-auto print:bg-white bg-gray-100 md:h-screen">
            {/* Control Panel (Hidden in Print) */}
            <div className="control-panel w-full max-w-[210mm] bg-[#222] text-white p-3 sm:p-4 rounded-none sm:rounded-md mb-3 sm:mb-6 flex flex-col gap-3 sm:gap-4 sm:flex-row sm:justify-between sm:items-center shadow-lg no-print md:sticky md:top-4 z-50">
                <div className="flex items-start w-full sm:w-auto justify-between sm:justify-start gap-3 sm:gap-4">
                    <button
                        type="button"
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.history.length > 1) {
                                router.back();
                                return;
                            }
                            router.push('/dashboard');
                        }}
                        className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                        <ArrowLeft size={20} /> <span className="sm:hidden text-xs">Back</span>
                    </button>
                    <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
                        <span className="font-bold text-sm">{isNew ? 'New Report' : 'Report Editor'}</span>
                        {lastSaved && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Check size={8} /> Saved {lastSaved.toLocaleTimeString()}</span>}
                        {autosaveStatus && (
                            <span className="text-[10px] text-gray-400 break-words">
                                {autosaveStatus} {autosaveStamp ? `· ${new Date(autosaveStamp).toLocaleTimeString()}` : ''}
                            </span>
                        )}
                    </div>
                    <div className="sm:hidden">
                        <LanguageToggle />
                    </div>
                </div>

                <div className="flex w-full flex-wrap items-center gap-2 sm:gap-3 sm:w-auto sm:justify-end">
                    <div className="hidden sm:block">
                        <LanguageToggle />
                    </div>

                    {/* Review Workflow Buttons */}
                    {reviewStatus === 'draft' && (
                        <button
                            onClick={() => handleUpdateStatus('pending_jp_check')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none min-w-[140px]"
                            title="Request Review"
                        >
                            <Send size={16} /> <span className="hidden sm:inline">Request Review</span>
                            <span className="sm:hidden">Review</span>
                        </button>
                    )}

                    {(reviewStatus === 'pending_jp_check' || reviewStatus === 'pending_en_check') && (
                        <>
                            <button
                                onClick={() => handleUpdateStatus('draft')}
                                className="bg-red-500 hover:bg-red-400 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none min-w-[120px]"
                                title="Reject / Back to Draft"
                            >
                                <AlertCircle size={16} /> <span className="hidden sm:inline">Reject</span>
                                <span className="sm:hidden">Reject</span>
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('approved')}
                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none min-w-[120px]"
                                title="Approve"
                            >
                                <ShieldCheck size={16} /> <span className="hidden sm:inline">Approve</span>
                                <span className="sm:hidden">Approve</span>
                            </button>
                        </>
                    )}

                    {reviewStatus === 'approved' && (
                        <div className="px-3 py-2 bg-green-100 text-green-800 rounded font-bold text-sm flex items-center gap-2 border border-green-200">
                            <ShieldCheck size={16} /> Approved
                        </div>
                    )}

                    <button
                        onClick={saveReport}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none min-w-[110px]"
                    >
                        {saving ? <UploadCloud size={16} className="animate-bounce" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--color-accent)] hover:brightness-110 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center justify-center gap-2 transition-all flex-1 sm:flex-none min-w-[90px]"
                    >
                        <Printer size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Main Report Wrapper - Adjusted for Split View Compatibility */}
            {/* The ReportTemplate now has its own split view, so we need to enable full width here and remove centralized scaling for desktop, keep mobile scaling? */}
            {/* Actually ReportTemplate is responsive (stacked on mobile, split on desktop). 
               So we should just let it be full width. */}

            <div className="w-full block md:flex md:flex-1 md:min-h-0 md:justify-center overflow-x-visible overflow-y-visible md:overflow-x-auto md:overflow-y-hidden pb-0 print:pb-0 print:overflow-visible">
                {reportType === 'departure' ? (
                    <DepartureReportTemplate initialData={initialData} onDataChange={handleDataChange} />
                ) : (
                    <ReportTemplate initialData={initialData} onDataChange={handleDataChange} />
                )}
            </div>
        </div>
    );
}
