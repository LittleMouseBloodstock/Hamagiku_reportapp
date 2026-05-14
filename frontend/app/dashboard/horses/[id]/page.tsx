'use client';
import { useEffect, useState } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, FileText, Calendar, User } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useBranding } from '@/contexts/BrandingContext';
import { formatHorseSexAge, normalizeHorseSex } from '@/lib/horseProfile';

import Link from 'next/link';
import { usePlanAccess } from '@/hooks/usePlanAccess';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    photo_url: string | null;
    sire: string;
    sire_en?: string;
    dam: string;
    dam_en?: string;
    updated_at: string;
    owner_id: string | null;
    birth_date?: string | null;
    sex?: string | null;
    trainer_id?: string | null;
    departure_date?: string | null;
    last_farrier_date?: string | null;
    last_farrier_note?: string | null;
    last_worming_date?: string | null;
    last_worming_note?: string | null;
    clients: { id: string, name: string } | null;
    trainers?: {
        id: string;
        trainer_name: string;
        trainer_name_en?: string | null;
        trainer_location?: string | null;
        trainer_location_en?: string | null;
    } | null;
};

type Report = {
    id: string;
    created_at: string;
    title: string | null;
    status_training: string | null;
    weight: number | null;
    horse_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metrics_json?: any;
};

type WeightEntry = {
    id: string;
    measured_at: string;
    weight: number | null;
    created_at?: string | null;
};

type Client = {
    id: string;
    name: string;
};

type Trainer = {
    id: string;
    trainer_name: string;
    trainer_name_en?: string | null;
};

type VetTreatmentRecord = {
    id: string;
    date: string;
    note: string;
    reportMode?: 'none' | 'body' | 'appendix';
    imageCount?: number;
};

function normalizeTreatmentRecords(items: VetTreatmentRecord[]): VetTreatmentRecord[] {
    return items
        .map((item, index) => ({
            id: item.id || `record-${index + 1}`,
            date: item.date || '',
            note: item.note || '',
            reportMode: (item.reportMode === 'body' || item.reportMode === 'appendix' ? item.reportMode : 'none') as VetTreatmentRecord['reportMode'],
            imageCount: Array.isArray((item as VetTreatmentRecord & { images?: unknown[] }).images)
                ? ((item as VetTreatmentRecord & { images?: unknown[] }).images ?? []).length
                : 0,
        }))
        .filter((item) => item.date || item.note || item.imageCount > 0);
}

export default function HorseDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { language, t } = useLanguage();
    const { user, session } = useAuth();
    const { workspaceId } = useWorkspace();
    const { branding } = useBranding();
    const [horse, setHorse] = useState<Horse | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
    const [editingWeightId, setEditingWeightId] = useState<string | null>(null);
    const [weightDraft, setWeightDraft] = useState({ measured_at: '', weight: '' });
    const [editMode, setEditMode] = useState(false);
    const { capabilities } = usePlanAccess();

    // Form & Owner State
    const [clients, setClients] = useState<Client[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [treatmentRecords, setTreatmentRecords] = useState<VetTreatmentRecord[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        sire: '',
        sire_en: '',
        dam: '',
        dam_en: '',
        owner_id: '',
        trainer_id: '',
        birth_date: '',
        sex: '',
        departure_date: '',
        last_farrier_date: '',
        last_farrier_note: '',
        last_worming_date: '',
        last_worming_note: ''
    });

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    const vetDraftKey = workspaceId && id ? `vet-records:${workspaceId}:${id}` : null;

    const formatDateByLanguage = (value?: string | null) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    useEffect(() => {
        if (!user || !id || !workspaceId) return;

        let isMounted = true;
        const fetchData = async (retryCount = 0) => {
            try {
                // 1. Fetch all clients for autocomplete
                const [{ data: clientsData, error: err1 }, { data: trainerData, error: trainerErr }] = await Promise.all([
                    supabase.from('clients').select('id, name').eq('workspace_id', workspaceId).order('name'),
                    supabase.from('trainers').select('id, trainer_name, trainer_name_en').eq('workspace_id', workspaceId).order('trainer_name'),
                ]);
                if (err1) throw err1;
                if (trainerErr) throw trainerErr;
                if (isMounted && clientsData) setClients(clientsData);
                if (isMounted && trainerData) setTrainers(trainerData as Trainer[]);

                // 2. Fetch Horse with Owner Info
                const { data: h, error: err2 } = await supabase
                    .from('horses')
                    .select('*, clients(id, name), trainers(id, trainer_name, trainer_name_en, trainer_location, trainer_location_en)')
                    .eq('workspace_id', workspaceId)
                    .eq('id', id)
                    .single();

                if (err2) throw err2;

                if (h && isMounted) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const horseData = h as any;
                    setHorse(horseData);

                    setFormData({
                        name: horseData.name || '',
                        name_en: horseData.name_en || '',
                        sire: horseData.sire || '',
                        sire_en: horseData.sire_en || '',
                        dam: horseData.dam || '',
                        dam_en: horseData.dam_en || '',
                        owner_id: horseData.owner_id || '',
                        trainer_id: horseData.trainer_id || '',
                        birth_date: horseData.birth_date || '',
                        sex: normalizeHorseSex(horseData.sex),
                        departure_date: horseData.departure_date || '',
                        last_farrier_date: horseData.last_farrier_date || '',
                        last_farrier_note: horseData.last_farrier_note || '',
                        last_worming_date: horseData.last_worming_date || '',
                        last_worming_note: horseData.last_worming_note || ''
                    });

                    if (horseData.clients) {
                        setOwnerSearch(horseData.clients.name);
                    } else {
                        setOwnerSearch('');
                    }
                }

                // 3. Fetch Reports
                const reportsPromise = supabase
                    .from('reports')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('horse_id', id)
                    .order('created_at', { ascending: false });

                const weightsPromise = supabase
                    .from('horse_weights')
                    .select('id, measured_at, weight, created_at')
                    .eq('workspace_id', workspaceId)
                    .eq('horse_id', id)
                    .order('measured_at', { ascending: false });

                const draftPromise = vetDraftKey
                    ? supabase
                        .from('report_drafts')
                        .select('id, data')
                        .eq('workspace_id', workspaceId)
                        .eq('draft_key', vetDraftKey)
                        .maybeSingle()
                    : Promise.resolve({ data: null, error: null } as const);

                const [{ data: r, error: err3 }, { data: weightsData, error: weightsError }, { data: draftData, error: draftError }] = await Promise.all([
                    reportsPromise,
                    weightsPromise,
                    draftPromise,
                ]);

                if (err3) throw err3;
                if (weightsError) throw weightsError;
                if (draftError) throw draftError;
                if (r && isMounted) setReports(r);
                if (weightsData && isMounted) setWeightEntries(weightsData as WeightEntry[]);
                if (isMounted) {
                    const items = Array.isArray((draftData as { data?: { records?: VetTreatmentRecord[] } } | null)?.data?.records)
                        ? ((draftData as { data?: { records?: VetTreatmentRecord[] } }).data?.records ?? [])
                        : [];
                    setTreatmentRecords(normalizeTreatmentRecords(items));
                }

            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Error fetching horse details:', error);

                // Retry logic
                if (isMounted && retryCount < 2) {
                    console.log(`Retrying detail fetch... (${retryCount + 1})`);
                    setTimeout(() => fetchData(retryCount + 1), 500);
                } else if (isMounted && session?.access_token) {
                    // FALLBACK: Raw Fetch for all 3
                    try {
                        console.warn('Attempting raw fetch fallback for details...');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        if (!supabaseUrl || !anonKey) throw new Error('Missing env vars');

                        const headers = {
                            'apikey': anonKey,
                            'Authorization': `Bearer ${session.access_token}`
                        };

                        const [clientsRes, trainersRes, horseRes, reportsRes, weightsRes] = await Promise.all([
                            fetch(`${supabaseUrl}/rest/v1/clients?select=id,name&workspace_id=eq.${workspaceId}&order=name`, { headers }),
                            fetch(`${supabaseUrl}/rest/v1/trainers?select=id,trainer_name,trainer_name_en&workspace_id=eq.${workspaceId}&order=trainer_name`, { headers }),
                            fetch(`${supabaseUrl}/rest/v1/horses?select=*,clients(id,name),trainers(id,trainer_name,trainer_name_en,trainer_location,trainer_location_en)&workspace_id=eq.${workspaceId}&id=eq.${id}`, { headers }),
                            fetch(`${supabaseUrl}/rest/v1/reports?select=*&workspace_id=eq.${workspaceId}&horse_id=eq.${id}&order=created_at.desc`, { headers }),
                            fetch(`${supabaseUrl}/rest/v1/horse_weights?select=id,measured_at,weight,created_at&workspace_id=eq.${workspaceId}&horse_id=eq.${id}&order=measured_at.desc`, { headers })
                        ]);

                        if (clientsRes.ok) {
                            const cData = await clientsRes.json();
                            if (isMounted) setClients(cData);
                        }

                        if (trainersRes.ok) {
                            const tData = await trainersRes.json();
                            if (isMounted) setTrainers(tData);
                        }

                        if (horseRes.ok) {
                            const hData = await horseRes.json();
                            if (hData && hData.length > 0) {
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                const horseData = hData[0] as any;
                                if (isMounted) {
                                    setHorse(horseData);
                                    setFormData({
                                        name: horseData.name || '',
                                        name_en: horseData.name_en || '',
                                        sire: horseData.sire || '',
                                        sire_en: horseData.sire_en || '',
                                        dam: horseData.dam || '',
                                        dam_en: horseData.dam_en || '',
                                        owner_id: horseData.owner_id || '',
                                        trainer_id: horseData.trainer_id || '',
                                        birth_date: horseData.birth_date || '',
                                        sex: normalizeHorseSex(horseData.sex),
                                        departure_date: horseData.departure_date || '',
                                        last_farrier_date: horseData.last_farrier_date || '',
                                        last_farrier_note: horseData.last_farrier_note || '',
                                        last_worming_date: horseData.last_worming_date || '',
                                        last_worming_note: horseData.last_worming_note || ''
                                    });
                                    if (horseData.clients) setOwnerSearch(horseData.clients.name);
                                    else setOwnerSearch('');
                                }
                            }
                        }

                        if (reportsRes.ok) {
                            const rData = await reportsRes.json();
                            if (isMounted) setReports(rData);
                        }

                        if (weightsRes.ok) {
                            const wData = await weightsRes.json();
                            if (isMounted) setWeightEntries(wData);
                        }

                        if (vetDraftKey) {
                            const draftRes = await fetch(`${supabaseUrl}/rest/v1/report_drafts?select=id,data&workspace_id=eq.${workspaceId}&draft_key=eq.${encodeURIComponent(vetDraftKey)}`, { headers });
                            if (draftRes.ok) {
                                const draftJson = await draftRes.json();
                                const draft = Array.isArray(draftJson) ? draftJson[0] : null;
                                const items = Array.isArray(draft?.data?.records) ? draft.data.records : [];
                                if (isMounted) {
                                    setTreatmentRecords(normalizeTreatmentRecords(items));
                                }
                            }
                        }

                    } catch (fallbackError) {
                        console.error('Fallback failed:', fallbackError);
                    }
                }
            }
        };

        fetchData();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.id, session?.access_token, workspaceId, vetDraftKey]);

    const handleUpdateHorse = async () => {
        try {
            let finalOwnerId: string | null = formData.owner_id;

            // Owner Update Logic (Same as New Horse Page)
            // If text is entered but no existing ID matches (or name changed), create/find client
            if (ownerSearch && (!finalOwnerId || clients.find(c => c.id === finalOwnerId)?.name !== ownerSearch)) {
                // Check exact match
                const existing = clients.find(c => c.name.toLowerCase() === ownerSearch.toLowerCase());
                if (existing) {
                    finalOwnerId = existing.id;
                } else {
                    // Create new client
                    const { data: newClient, error: clientError } = await supabase
                        .from('clients')
                        .insert({ workspace_id: workspaceId, name: ownerSearch })
                        .select()
                        .single();

                    if (clientError) throw clientError;
                    finalOwnerId = newClient.id;
                }
            } else if (!ownerSearch) {
                // If search cleared, remove owner
                finalOwnerId = null;
            }

            const { error } = await supabase
                .from('horses')
                .update({
                    name: formData.name,
                    name_en: formData.name_en,
                    sire: formData.sire,
                    sire_en: formData.sire_en,
                    dam: formData.dam,
                    dam_en: formData.dam_en,
                    owner_id: finalOwnerId,
                    trainer_id: formData.trainer_id || null,
                    birth_date: formData.birth_date || null,
                    sex: formData.sex || null,
                    departure_date: capabilities.canUseDepartureReports ? (formData.departure_date || null) : null,
                    last_farrier_date: capabilities.canUseFarrierRecords ? (formData.last_farrier_date || null) : null,
                    last_farrier_note: capabilities.canUseFarrierRecords ? (formData.last_farrier_note || null) : null,
                    last_worming_date: capabilities.canUseVetRecords ? (formData.last_worming_date || null) : null,
                    last_worming_note: capabilities.canUseVetRecords ? (formData.last_worming_note || null) : null,
                    updated_at: new Date().toISOString()
                })
                .eq('workspace_id', workspaceId)
                .eq('id', id);

            if (error) throw error;

            // Refetch to get updated relation data
            // Or just update local state if we trust it. Let's refetch for safety on owner change.
            const { data: h } = await supabase
                .from('horses')
                .select('*, clients(id, name), trainers(id, trainer_name, trainer_name_en, trainer_location, trainer_location_en)')
                .eq('workspace_id', workspaceId)
                .eq('id', id)
                .single();

            if (h) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const horseData = h as any;
                setHorse(horseData);
                setEditMode(false);
                // Update client list if we added one (optional, but good practice)
                const { data: clientsData } = await supabase.from('clients').select('id, name').eq('workspace_id', workspaceId).order('name');
                if (clientsData) setClients(clientsData);
            }

        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(t('brandingSaveError') + ' ' + error.message);
        }
    };

    const createReport = async () => {
        const { data } = await supabase
            .from('reports')
            .insert([{ workspace_id: workspaceId, horse_id: id }])
            .select()
            .single();

        if (data) {
            router.push(`/reports/${data.id}`);
        }
    };

    const createDepartureReport = () => {
        router.push(`/departure-reports/new?horseId=${id}`);
    };

    const latestWeight = weightEntries[0] || null;
    const previousWeight = weightEntries[1] || null;
    const weightDifference = latestWeight && previousWeight && latestWeight.weight !== null && previousWeight.weight !== null
        ? latestWeight.weight - previousWeight.weight
        : null;
    const themePrimary = branding.primaryColor || '#1a3c34';
    const themeAccent = branding.accentColor || '#d4a84f';

    const handlePrintWeightSummary = () => {
        if (!horse || typeof window === 'undefined') return;
        const title = language === 'ja' ? '体重サマリー' : 'Weight Summary';
        const ownerName = horse.clients?.name || '-';
        const trainerName = language === 'ja'
            ? (horse.trainers?.trainer_name || horse.trainers?.trainer_name_en || '-')
            : (horse.trainers?.trainer_name_en || horse.trainers?.trainer_name || '-');
        const rows = weightEntries.map((entry, index) => {
            const prev = weightEntries[index + 1];
            const diff = prev && entry.weight !== null && prev.weight !== null ? entry.weight - prev.weight : null;
            return `
                <tr>
                    <td>${formatDateByLanguage(entry.measured_at)}</td>
                    <td>${entry.weight !== null && entry.weight !== undefined ? `${entry.weight}kg` : '-'}</td>
                    <td>${diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}kg`}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <!doctype html>
            <html lang="${language === 'ja' ? 'ja' : 'en'}">
            <head>
                <meta charset="utf-8" />
                <title>${title}</title>
                <style>
                    body { font-family: Arial, sans-serif; color: #1f2937; margin: 32px; }
                    h1 { font-size: 28px; margin: 0 0 8px; color: ${themePrimary}; }
                    h2 { font-size: 14px; margin: 0 0 20px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; }
                    .meta { margin-bottom: 20px; font-size: 14px; }
                    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
                    .card { border: 1px solid #e5e7eb; border-top: 3px solid ${themeAccent}; background: #f9fafb; padding: 12px 16px; border-radius: 8px; }
                    .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; font-weight: 700; }
                    .value { font-size: 22px; font-weight: 700; color: ${themePrimary}; }
                    .sub { font-size: 12px; color: #6b7280; margin-top: 4px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border-bottom: 1px solid #e5e7eb; padding: 10px 8px; text-align: left; font-size: 14px; }
                    th { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.08em; }
                </style>
            </head>
            <body>
                <h1>${language === 'ja' ? horse.name : horse.name_en || horse.name}</h1>
                <h2>${title}</h2>
                <div class="meta">
                    <div><strong>${language === 'ja' ? 'オーナー' : 'Owner'}:</strong> ${ownerName}</div>
                    <div><strong>${language === 'ja' ? '調教師' : 'Trainer'}:</strong> ${trainerName}</div>
                </div>
                <div class="summary">
                    <div class="card">
                        <div class="label">${language === 'ja' ? '最新体重' : 'Latest Weight'}</div>
                        <div class="value">${latestWeight?.weight !== null && latestWeight?.weight !== undefined ? `${latestWeight.weight}kg` : '-'}</div>
                        <div class="sub">${formatDateByLanguage(latestWeight?.measured_at)}</div>
                    </div>
                    <div class="card">
                        <div class="label">${language === 'ja' ? '前回体重' : 'Previous Weight'}</div>
                        <div class="value">${previousWeight?.weight !== null && previousWeight?.weight !== undefined ? `${previousWeight.weight}kg` : '-'}</div>
                        <div class="sub">${formatDateByLanguage(previousWeight?.measured_at)}</div>
                    </div>
                    <div class="card">
                        <div class="label">${language === 'ja' ? '増減' : 'Difference'}</div>
                        <div class="value">${weightDifference === null ? '-' : `${weightDifference > 0 ? '+' : ''}${weightDifference}kg`}</div>
                        <div class="sub">${language === 'ja' ? '最新と前回の比較' : 'Latest vs previous'}</div>
                    </div>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th>${language === 'ja' ? '計測日' : 'Date'}</th>
                            <th>${language === 'ja' ? '体重' : 'Weight'}</th>
                            <th>${language === 'ja' ? '前回差' : 'Change'}</th>
                        </tr>
                    </thead>
                    <tbody>${rows || `<tr><td colspan="3">${language === 'ja' ? '体重入力はまだありません。' : 'No weight entries yet.'}</td></tr>`}</tbody>
                </table>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert(language === 'ja' ? '印刷ウィンドウを開けませんでした。' : 'Could not open print window.');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        const triggerPrint = () => {
            printWindow.focus();
            window.setTimeout(() => {
                printWindow.print();
            }, 150);
        };
        if (printWindow.document.readyState === 'complete') {
            triggerPrint();
        } else {
            printWindow.onload = triggerPrint;
        }
    };

    const startEditWeight = (entry: WeightEntry) => {
        setEditingWeightId(entry.id);
        setWeightDraft({
            measured_at: entry.measured_at || '',
            weight: entry.weight !== null && entry.weight !== undefined ? String(entry.weight) : ''
        });
    };

    const saveWeightEntry = async () => {
        if (!editingWeightId || !workspaceId) return;
        const parsedWeight = Number(weightDraft.weight);
        if (!weightDraft.measured_at || Number.isNaN(parsedWeight)) {
            alert(language === 'ja' ? '日付と体重を入力してください。' : 'Please enter both date and weight.');
            return;
        }
        try {
            const { error } = await supabase
                .from('horse_weights')
                .update({
                    measured_at: weightDraft.measured_at,
                    weight: parsedWeight,
                })
                .eq('workspace_id', workspaceId)
                .eq('id', editingWeightId);
            if (error) throw error;
            setWeightEntries((prev) =>
                prev
                    .map((entry) => entry.id === editingWeightId ? { ...entry, measured_at: weightDraft.measured_at, weight: parsedWeight } : entry)
                    .sort((a, b) => b.measured_at.localeCompare(a.measured_at))
            );
            setEditingWeightId(null);
        } catch (error) {
            alert((language === 'ja' ? '体重の更新に失敗しました: ' : 'Failed to update weight: ') + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const deleteWeightEntry = async (entryId: string) => {
        if (!workspaceId || !window.confirm(language === 'ja' ? 'この体重記録を削除しますか？' : 'Delete this weight entry?')) return;
        try {
            const { error } = await supabase
                .from('horse_weights')
                .delete()
                .eq('workspace_id', workspaceId)
                .eq('id', entryId);
            if (error) throw error;
            setWeightEntries((prev) => prev.filter((entry) => entry.id !== entryId));
            if (editingWeightId === entryId) setEditingWeightId(null);
        } catch (error) {
            alert((language === 'ja' ? '体重の削除に失敗しました: ' : 'Failed to delete weight: ') + (error instanceof Error ? error.message : 'Unknown error'));
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!window.confirm(t('confirmDeleteReport'))) return;

        try {
            const { error } = await supabase.from('reports').delete().eq('workspace_id', workspaceId).eq('id', reportId);

            if (error) throw error;

            alert(t('deleteSuccess'));
            setReports(prev => prev.filter(r => r.id !== reportId));

        } catch (error) {
            console.error('Error deleting report:', error);
            alert(t('deleteError') + (error as Error).message);
        }
    };

    if (!horse) return <div className="p-10 text-center">{t('loading')}</div>;

    const displayName = language === 'ja' ? horse.name : horse.name_en;
    const displaySubName = language === 'ja' ? horse.name_en : horse.name;
    const sexAgeLabel = formatHorseSexAge(horse.sex, horse.birth_date, new Date().toISOString().slice(0, 7), language);
    const birthDateLabel = horse.birth_date || '-';

    // Fallback for sire/dam if only one exists
    const displaySire = language === 'ja' ? horse.sire : (horse.sire_en || horse.sire);
    const displayDam = language === 'ja' ? horse.dam : (horse.dam_en || horse.dam);

    return (
        <div className="flex-1 h-full overflow-y-auto bg-gray-50 pb-24 font-sans">
            {/* Nav */}
            <div className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
                <Link href="/dashboard/horses" className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-bold">
                    <ArrowLeft size={16} /> {t('backToHorses')}
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono hidden sm:block">ID: {horse.id.slice(0, 8)}</span>
                    <LanguageToggle />
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Horse Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-6 items-start border border-gray-100">
                    <div className="flex-1 w-full">
                        {editMode ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Name Fields */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('horseNameJp')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('horseNameEn')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} />
                                    </div>

                                    {/* Owner Selection Field - COPIED FROM NEW PAGE */}
                                    <div className="col-span-1 md:col-span-2 relative">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><User size={12} /> {t('ownerTransfer')}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded p-2 pl-8 focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent outline-none"
                                                placeholder={t('searchOwnerPlaceholder')}
                                                value={ownerSearch}
                                                onChange={e => {
                                                    setOwnerSearch(e.target.value);
                                                    setFormData({ ...formData, owner_id: '' }); // Clear ID implies change
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                            />
                                            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
                                        </div>
                                        {/* Suggestions Dropdown */}
                                        {showSuggestions && ownerSearch && (
                                            <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {filteredClients.length > 0 ? (
                                                    filteredClients.map(client => (
                                                        <div
                                                            key={client.id}
                                                            className="px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm text-stone-700"
                                                            onClick={() => {
                                                                setOwnerSearch(client.name);
                                                                setFormData({ ...formData, owner_id: client.id });
                                                                setShowSuggestions(false);
                                                            }}
                                                        >
                                                            {client.name}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-2 text-sm text-[#1a3c34] bg-[#1a3c34]/5 font-medium">
                                                        {t('newOwnerWillBeCreated')} &quot;{ownerSearch}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Overlay to close suggestions */}
                                        {showSuggestions && (
                                            <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)} />
                                        )}
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('trainer')}</label>
                                        <select className="w-full border border-gray-300 rounded p-2" value={formData.trainer_id} onChange={e => setFormData({ ...formData, trainer_id: e.target.value })}>
                                            <option value="">{t('noTrainer')}</option>
                                            {trainers.map((trainer) => (
                                                <option key={trainer.id} value={trainer.id}>
                                                    {language === 'ja' ? trainer.trainer_name : (trainer.trainer_name_en || trainer.trainer_name)}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Sire/Dam Fields */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('sireJp')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.sire} onChange={e => setFormData({ ...formData, sire: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('sireEn')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.sire_en} onChange={e => setFormData({ ...formData, sire_en: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('damJp')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.dam} onChange={e => setFormData({ ...formData, dam: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('damEn')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.dam_en} onChange={e => setFormData({ ...formData, dam_en: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('birthDate')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" type="date" lang={language === 'ja' ? 'ja-JP' : 'en-GB'} value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('sex')}</label>
                                        <select className="w-full border border-gray-300 rounded p-2" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                                            <option value="">{t('sex')}</option>
                                            <option value="male">{language === 'ja' ? '牡' : 'Male'}</option>
                                            <option value="female">{language === 'ja' ? '牝' : 'Female'}</option>
                                            <option value="gelding">{language === 'ja' ? '騸' : 'Gelding'}</option>
                                        </select>
                                    </div>
                                </div>

                                {(capabilities.canUseVetRecords || capabilities.canUseFarrierRecords || capabilities.canUseDepartureReports) && (
                                    <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-400">{t('premiumCareRecords')}</div>
                                                <div className="text-sm text-stone-500">{t('premiumCareRecordsHint')}</div>
                                            </div>
                                            <div className="rounded-full bg-[#1a3c34] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                                                Premium
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                                            <div className="text-sm leading-7 text-stone-600">
                                                {t('careRecordsSubtitle')}
                                            </div>
                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <Link
                                                    href={`/dashboard/care-records?horseId=${horse.id}`}
                                                    className="rounded-full border border-[#1a3c34]/20 bg-[#1a3c34]/5 px-4 py-2 text-center text-sm font-semibold text-[#1a3c34]"
                                                >
                                                    {t('manageCareRecords')}
                                                </Link>
                                                {capabilities.canUseDepartureReports && (
                                                    <button
                                                        type="button"
                                                        onClick={createDepartureReport}
                                                        className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900"
                                                    >
                                                        {t('createDepartureReport')}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <h1 className="dashboard-page-title mb-1 text-3xl">{displayName}</h1>
                                <p className="text-lg text-gray-400 font-serif mb-4">{displaySubName}</p>
                                <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('sire')}</span> {displaySire || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('dam')}</span> {displayDam || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('birthDate')}</span> {birthDateLabel}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('sexAge')}</span> {sexAgeLabel || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('trainer')}</span> {language === 'ja' ? (horse.trainers?.trainer_name || t('noTrainer')) : (horse.trainers?.trainer_name_en || horse.trainers?.trainer_name || t('noTrainer'))}</div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100"><span className="font-bold text-gray-300 block text-xs uppercase">{t('owner')}</span> {horse.clients?.name || t('noOwner')}</div>
                                </div>

                                {(capabilities.canUseVetRecords || capabilities.canUseFarrierRecords || capabilities.canUseDepartureReports) && (
                                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        {capabilities.canUseDepartureReports && (
                                            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                                                <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">{t('departureDate')}</div>
                                                <div className="font-semibold text-stone-700">{horse.departure_date || '-'}</div>
                                            </div>
                                        )}
                                        {capabilities.canUseFarrierRecords && (
                                            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                                                <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">{t('farrier')}</div>
                                                <div className="font-semibold text-stone-700">{horse.last_farrier_date || '-'}</div>
                                                <div className="mt-1 line-clamp-2 text-xs text-stone-500">{horse.last_farrier_note || t('noCareRecord')}</div>
                                            </div>
                                        )}
                                        {capabilities.canUseVetRecords && (
                                            <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600">
                                                <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">{t('worming')}</div>
                                                <div className="font-semibold text-stone-700">{horse.last_worming_date || '-'}</div>
                                                <div className="mt-1 line-clamp-2 text-xs text-stone-500">{horse.last_worming_note || t('noCareRecord')}</div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {capabilities.canUseVetRecords && (
                                    <div className="mt-4 rounded-xl border border-stone-200 bg-white p-4">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-400">{t('vetTreatmentRecords')}</div>
                                                <div className="text-sm text-stone-500">{t('vetTreatmentRecordsHint')}</div>
                                            </div>
                                            <Link
                                                href={`/dashboard/care-records?horseId=${horse.id}`}
                                                className="rounded-full border border-[#1a3c34]/20 bg-[#1a3c34]/5 px-3 py-1.5 text-xs font-bold text-[#1a3c34]"
                                            >
                                                {t('manageCareRecords')}
                                            </Link>
                                        </div>
                                        {treatmentRecords.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-5 text-sm text-stone-500">
                                                {t('noTreatmentRecords')}
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {treatmentRecords
                                                    .slice()
                                                    .sort((a, b) => (a.date < b.date ? 1 : -1))
                                                    .map((record) => (
                                                        <div key={record.id} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                                                            <div className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">{record.date || '-'}</div>
                                                            <div className="text-sm leading-6 text-stone-700 whitespace-pre-wrap">
                                                                {record.note || (record.imageCount ? (language === 'ja' ? `添付画像 ${record.imageCount}件` : `${record.imageCount} attached image${record.imageCount === 1 ? '' : 's'}`) : t('noCareRecord'))}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={createReport}
                            className="btn-primary px-5 py-2.5 rounded-full font-bold shadow-md flex items-center gap-2 transition-all whitespace-nowrap"
                        >
                            <Plus size={18} /> {t('createReportBtn')}
                        </button>
                        {capabilities.canUseDepartureReports && (
                            <button
                                onClick={createDepartureReport}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-700 px-5 py-2.5 rounded-full font-bold shadow-sm flex items-center gap-2 transition-all whitespace-nowrap"
                            >
                                <FileText size={16} /> {t('createDepartureReport')}
                            </button>
                        )}
                        {editMode ? (
                            <div className="flex gap-2">
                                <button onClick={handleUpdateHorse} className="btn-primary px-4 py-2 rounded-full text-sm font-bold flex-1">{t('save')}</button>
                                <button onClick={() => setEditMode(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-bold flex-1">{t('cancel')}</button>
                            </div>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2 rounded-full text-sm font-bold transition-all">
                                {t('editProfile')}
                            </button>
                        )}
                    </div>
                </div>

                {capabilities.canUseWeightBulkInput && (
                    <div id="weight-history" className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                    {language === 'ja' ? '体重履歴' : 'Weight History'}
                                </h2>
                                <p className="mt-1 text-xs text-gray-400">
                                    {language === 'ja' ? 'この馬の過去の体重入力一覧です。' : 'A full list of recorded weights for this horse.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handlePrintWeightSummary}
                                className="self-start rounded-full px-4 py-2 text-sm font-bold transition-all hover:brightness-110"
                                style={{ backgroundColor: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
                            >
                                {language === 'ja' ? '印刷 / PDF' : 'Print / PDF'}
                            </button>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    {language === 'ja' ? '最新体重' : 'Latest Weight'}
                                </div>
                                <div className="mt-1 text-xl font-bold" style={{ color: 'var(--brand-primary)' }}>
                                    {latestWeight?.weight !== null && latestWeight?.weight !== undefined ? `${latestWeight.weight}kg` : '-'}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">{formatDateByLanguage(latestWeight?.measured_at)}</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    {language === 'ja' ? '前回体重' : 'Previous Weight'}
                                </div>
                                <div className="mt-1 text-xl font-bold text-gray-700">
                                    {previousWeight?.weight !== null && previousWeight?.weight !== undefined ? `${previousWeight.weight}kg` : '-'}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">{formatDateByLanguage(previousWeight?.measured_at)}</div>
                            </div>
                            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                                <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                    {language === 'ja' ? '増減' : 'Difference'}
                                </div>
                                <div className={`mt-1 text-xl font-bold ${weightDifference === null ? 'text-gray-700' : weightDifference >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {weightDifference === null ? '-' : `${weightDifference > 0 ? '+' : ''}${weightDifference}kg`}
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                    {language === 'ja' ? '最新体重と前回体重の比較' : 'Latest vs previous'}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-gray-200">
                            <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2 bg-gray-50 px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
                                <div>{language === 'ja' ? '計測日' : 'Date'}</div>
                                <div>{language === 'ja' ? '体重' : 'Weight'}</div>
                                <div>{language === 'ja' ? '前回差' : 'Change'}</div>
                                <div>{language === 'ja' ? '操作' : 'Actions'}</div>
                            </div>
                            {weightEntries.length === 0 ? (
                                <div className="px-4 py-6 text-sm text-gray-400">
                                    {language === 'ja' ? '体重入力はまだありません。' : 'No weight entries yet.'}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {weightEntries.map((entry, index) => {
                                        const prev = weightEntries[index + 1];
                                        const diff = prev && entry.weight !== null && prev.weight !== null ? entry.weight - prev.weight : null;
                                        return (
                                            <div key={entry.id} className="grid grid-cols-[1.2fr_1fr_1fr_auto] items-center gap-2 px-4 py-3 text-sm text-gray-700">
                                                {editingWeightId === entry.id ? (
                                                    <>
                                                        <div>
                                                            <input
                                                                type="date"
                                                                lang={language === 'ja' ? 'ja-JP' : 'en-GB'}
                                                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                                                value={weightDraft.measured_at}
                                                                onChange={(e) => setWeightDraft((prevDraft) => ({ ...prevDraft, measured_at: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div>
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                                                                value={weightDraft.weight}
                                                                onChange={(e) => setWeightDraft((prevDraft) => ({ ...prevDraft, weight: e.target.value }))}
                                                            />
                                                        </div>
                                                        <div className={diff === null ? 'text-gray-400' : diff >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                                                            {diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}kg`}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={saveWeightEntry}
                                                                className="text-xs font-bold hover:underline"
                                                                style={{ color: 'var(--brand-primary)' }}
                                                            >
                                                                {language === 'ja' ? '保存' : 'Save'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingWeightId(null)}
                                                                className="text-xs text-gray-500 hover:underline"
                                                            >
                                                                {language === 'ja' ? 'キャンセル' : 'Cancel'}
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>{formatDateByLanguage(entry.measured_at)}</div>
                                                        <div className="font-semibold" style={{ color: 'var(--brand-primary)' }}>{entry.weight !== null && entry.weight !== undefined ? `${entry.weight}kg` : '-'}</div>
                                                        <div className={diff === null ? 'text-gray-400' : diff >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-amber-600'}>
                                                            {diff === null ? '-' : `${diff > 0 ? '+' : ''}${diff}kg`}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => startEditWeight(entry)}
                                                                className="text-xs hover:underline"
                                                                style={{ color: 'var(--brand-primary)' }}
                                                            >
                                                                {language === 'ja' ? '編集' : 'Edit'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => deleteWeightEntry(entry.id)}
                                                                className="text-xs text-red-500 hover:underline"
                                                            >
                                                                {language === 'ja' ? '削除' : 'Delete'}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Reports List */}
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{t('reportHistory')}</h2>

                {reports.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300 text-gray-400">
                        {t('noReportsYet')}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map(report => (
                            <div
                                key={report.id}
                                onClick={() => router.push(report.metrics_json?.reportType === 'departure' ? `/departure-reports/${report.id}` : `/reports/${report.id}`)}
                                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-light-bg)] group-hover:text-[var(--color-primary)] transition-colors">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-700">{report.title || t('untitledReport')}</div>
                                        <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(report.created_at).toLocaleDateString()}</span>
                                            {report.metrics_json?.reportType === 'departure' && (
                                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">{t('departureReport')}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right flex flex-col items-end justify-between">
                                    <span className="text-sm font-bold text-[var(--color-primary)] mb-2">{report.weight ? `${report.weight}kg` : '-'}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation(); // Only stopPropagation needed as there is no default link behavior
                                            handleDeleteReport(report.id);
                                        }}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                        title={t('deleteReport')}
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
