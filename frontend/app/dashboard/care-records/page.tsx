'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { resolveReportAssetUrl, uploadReportAsset } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';

type HorseListItem = {
    id: string;
    name: string;
    name_en: string | null;
    departure_date: string | null;
    last_farrier_date: string | null;
    last_farrier_note: string | null;
    last_worming_date: string | null;
    last_worming_note: string | null;
};

type VetTreatmentRecord = {
    id: string;
    date: string;
    note: string;
    reportMode: 'none' | 'body' | 'appendix';
    images: {
        id: string;
        path: string;
        url: string;
        caption: string;
    }[];
};

type HorseCareForm = {
    departure_date: string;
    last_farrier_date: string;
    last_farrier_note: string;
    last_worming_date: string;
    last_worming_note: string;
};

const emptyCareForm: HorseCareForm = {
    departure_date: '',
    last_farrier_date: '',
    last_farrier_note: '',
    last_worming_date: '',
    last_worming_note: '',
};

export default function CareRecordsPage() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { workspaceId } = useWorkspace();
    const { loading: planLoading, hasProductAccess, capabilities } = usePlanAccess();
    const searchParams = useSearchParams();

    const [horses, setHorses] = useState<HorseListItem[]>([]);
    const [selectedHorseId, setSelectedHorseId] = useState('');
    const [careForm, setCareForm] = useState<HorseCareForm>(emptyCareForm);
    const [treatmentRecords, setTreatmentRecords] = useState<VetTreatmentRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingRecordId, setUploadingRecordId] = useState<string | null>(null);
    const dateInputLang = language === 'ja' ? 'ja-JP' : 'en-GB';

    const hasCareAccess = hasProductAccess && (capabilities.canUseVetRecords || capabilities.canUseFarrierRecords || capabilities.canUseDepartureReports);
    const selectedHorse = horses.find((horse) => horse.id === selectedHorseId) || null;
    const vetDraftKey = workspaceId && selectedHorseId ? `vet-records:${workspaceId}:${selectedHorseId}` : null;

    useEffect(() => {
        if (!user || !workspaceId || !hasCareAccess) return;

        let cancelled = false;

        const fetchHorses = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('horses')
                    .select('id, name, name_en, departure_date, last_farrier_date, last_farrier_note, last_worming_date, last_worming_note')
                    .eq('workspace_id', workspaceId)
                    .order('name');

                if (error) throw error;
                if (cancelled) return;

                const items = (data || []) as HorseListItem[];
                setHorses(items);

                const requestedHorseId = searchParams.get('horseId');
                const nextHorseId = requestedHorseId && items.some((horse) => horse.id === requestedHorseId)
                    ? requestedHorseId
                    : (items[0]?.id || '');
                setSelectedHorseId((current) => current || nextHorseId);
                setLoading(false);
            } catch (error) {
                console.error('Failed to load care records page data:', error);
                if (!cancelled) setLoading(false);
            }
        };

        void fetchHorses();

        return () => {
            cancelled = true;
        };
    }, [user, workspaceId, hasCareAccess, searchParams]);

    useEffect(() => {
        if (!selectedHorse) {
            setCareForm(emptyCareForm);
            setTreatmentRecords([]);
            return;
        }

        setCareForm({
            departure_date: selectedHorse.departure_date || '',
            last_farrier_date: selectedHorse.last_farrier_date || '',
            last_farrier_note: selectedHorse.last_farrier_note || '',
            last_worming_date: selectedHorse.last_worming_date || '',
            last_worming_note: selectedHorse.last_worming_note || '',
        });

        if (!capabilities.canUseVetRecords || !workspaceId || !vetDraftKey) {
            setTreatmentRecords([]);
            return;
        }

        let cancelled = false;

        const fetchDraft = async () => {
            try {
                const { data, error } = await supabase
                    .from('report_drafts')
                    .select('data')
                    .eq('workspace_id', workspaceId)
                    .eq('draft_key', vetDraftKey)
                    .maybeSingle();

                if (error) throw error;
                if (cancelled) return;

                const items = Array.isArray((data as { data?: { records?: VetTreatmentRecord[] } } | null)?.data?.records)
                    ? ((data as { data?: { records?: VetTreatmentRecord[] } }).data?.records ?? [])
                    : [];

                setTreatmentRecords(
                    await Promise.all(items.map(async (item, index) => ({
                        id: item.id || `record-${index + 1}`,
                        date: item.date || '',
                        note: item.note || '',
                        reportMode: item.reportMode === 'body' || item.reportMode === 'appendix' ? item.reportMode : 'none',
                        images: await Promise.all(
                            Array.isArray((item as VetTreatmentRecord).images)
                                ? (item as VetTreatmentRecord).images.map(async (image, imageIndex) => ({
                                    id: image.id || `image-${imageIndex + 1}`,
                                    path: image.path || '',
                                    url: image.path ? (await resolveReportAssetUrl(image.path) || '') : '',
                                    caption: image.caption || '',
                                }))
                                : []
                        ),
                    })))
                );
            } catch (error) {
                console.error('Failed to load treatment record draft:', error);
                if (!cancelled) setTreatmentRecords([]);
            }
        };

        void fetchDraft();

        return () => {
            cancelled = true;
        };
    }, [selectedHorse, capabilities.canUseVetRecords, workspaceId, vetDraftKey]);

    const addTreatmentRecord = () => {
        setTreatmentRecords((prev) => [
            {
                id: `record-${Date.now()}`,
                date: '',
                note: '',
                reportMode: 'none',
                images: [],
            },
            ...prev,
        ]);
    };

    const updateTreatmentRecord = (recordId: string, key: 'date' | 'note' | 'reportMode', value: string) => {
        setTreatmentRecords((prev) => prev.map((record) => (record.id === recordId ? { ...record, [key]: value } : record)));
    };

    const removeTreatmentRecord = (recordId: string) => {
        setTreatmentRecords((prev) => prev.filter((record) => record.id !== recordId));
    };

    const updateTreatmentImage = (recordId: string, imageId: string, caption: string) => {
        setTreatmentRecords((prev) => prev.map((record) => (
            record.id === recordId
                ? {
                    ...record,
                    images: record.images.map((image) => (
                        image.id === imageId ? { ...image, caption } : image
                    )),
                }
                : record
        )));
    };

    const removeTreatmentImage = (recordId: string, imageId: string) => {
        setTreatmentRecords((prev) => prev.map((record) => (
            record.id === recordId
                ? {
                    ...record,
                    images: record.images.filter((image) => image.id !== imageId),
                }
                : record
        )));
    };

    const persistTreatmentRecordsDraft = async (records: VetTreatmentRecord[]) => {
        if (!workspaceId || !selectedHorseId || !capabilities.canUseVetRecords || !vetDraftKey) return;

        const cleanedRecords = records
            .map((record) => ({
                id: record.id,
                date: record.date || '',
                note: record.note.trim(),
                reportMode: record.reportMode,
                images: record.images
                    .filter((image) => image.path)
                    .map((image) => ({
                        id: image.id,
                        path: image.path,
                        caption: image.caption.trim(),
                    })),
            }))
            .filter((record) => record.date || record.note || record.images.length > 0);

        const { error: draftError } = await supabase
            .from('report_drafts')
            .upsert({
                workspace_id: workspaceId,
                horse_id: selectedHorseId,
                report_type: 'vet_records',
                draft_key: vetDraftKey,
                data: { records: cleanedRecords },
                updated_at: new Date().toISOString(),
            }, { onConflict: 'draft_key' });

        if (draftError) throw draftError;
    };

    const handleTreatmentImageUpload = async (recordId: string, files: FileList | null) => {
        if (!workspaceId || !selectedHorseId || !files || files.length === 0) return;

        setUploadingRecordId(recordId);
        try {
            const uploadedImages = await Promise.all(
                Array.from(files).map(async (file, index) => {
                    const extension = file.name.split('.').pop() || 'jpg';
                    const path = `${workspaceId}/care-records/${selectedHorseId}/${recordId}/${Date.now()}-${index}.${extension}`;
                    const result = await uploadReportAsset(path, file);
                    if (result.error || !result.path) throw result.error || new Error('upload_failed');

                    return {
                        id: `image-${Date.now()}-${index}`,
                        path: result.path,
                        url: result.signedUrl || '',
                        caption: '',
                    };
                })
            );

            const nextRecords = treatmentRecords.map((record) => (
                record.id === recordId
                    ? { ...record, images: [...record.images, ...uploadedImages] }
                    : record
            ));
            setTreatmentRecords(nextRecords);
            await persistTreatmentRecordsDraft(nextRecords);
        } catch (error) {
            console.error('Failed to upload treatment images:', error);
            window.alert(t('imageUploadFailed'));
        } finally {
            setUploadingRecordId(null);
        }
    };

    const handleSave = async () => {
        if (!workspaceId || !selectedHorseId) return;

        setSaving(true);
        try {
            const { error: horseError } = await supabase
                .from('horses')
                .update({
                    departure_date: capabilities.canUseDepartureReports ? (careForm.departure_date || null) : null,
                    last_farrier_date: capabilities.canUseFarrierRecords ? (careForm.last_farrier_date || null) : null,
                    last_farrier_note: capabilities.canUseFarrierRecords ? (careForm.last_farrier_note.trim() || null) : null,
                    last_worming_date: capabilities.canUseVetRecords ? (careForm.last_worming_date || null) : null,
                    last_worming_note: capabilities.canUseVetRecords ? (careForm.last_worming_note.trim() || null) : null,
                    updated_at: new Date().toISOString(),
                })
                .eq('workspace_id', workspaceId)
                .eq('id', selectedHorseId);

            if (horseError) throw horseError;

            if (capabilities.canUseVetRecords && vetDraftKey) {
                await persistTreatmentRecordsDraft(treatmentRecords);
            }

            setHorses((prev) => prev.map((horse) => (
                horse.id === selectedHorseId
                    ? {
                        ...horse,
                        departure_date: careForm.departure_date || null,
                        last_farrier_date: careForm.last_farrier_date || null,
                        last_farrier_note: careForm.last_farrier_note.trim() || null,
                        last_worming_date: careForm.last_worming_date || null,
                        last_worming_note: careForm.last_worming_note.trim() || null,
                    }
                    : horse
            )));

            window.alert(t('careRecordsSaved'));
        } catch (error) {
            console.error('Failed to save care records:', error);
            window.alert(t('careRecordsSaveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const summaryItems = useMemo(() => ([
        {
            label: t('departureDateOptional'),
            value: careForm.departure_date || '-',
        },
        {
            label: t('farrier'),
            value: careForm.last_farrier_date ? `${careForm.last_farrier_date} ${careForm.last_farrier_note || ''}`.trim() : '-',
        },
        {
            label: t('worming'),
            value: careForm.last_worming_date ? `${careForm.last_worming_date} ${careForm.last_worming_note || ''}`.trim() : '-',
        },
    ]), [careForm, t]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="flex flex-col gap-3 border-b border-stone-200 bg-white px-4 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
                <div className="dashboard-page-title flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">medical_services</span>
                    {t('careRecords')}
                </div>
                {selectedHorse ? (
                    <button
                        onClick={() => void handleSave()}
                        disabled={saving || Boolean(uploadingRecordId) || !selectedHorseId}
                        className="btn-primary self-end rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50 sm:self-auto"
                    >
                        {saving || uploadingRecordId ? t('saving') : t('saveCareRecords')}
                    </button>
                ) : null}
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {planLoading ? (
                    <div className="text-center text-stone-400">{t('loading')}</div>
                ) : !hasCareAccess ? (
                    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
                        <div className="text-lg font-bold">{t('careRecordsLockedTitle')}</div>
                        <div className="mt-2 text-sm leading-7">{t('careRecordsLockedBody')}</div>
                        <div className="mt-4">
                            <Link href="/dashboard/billing" className="inline-flex rounded-lg border border-amber-400 px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100">
                                {t('billing')}
                            </Link>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="text-center text-stone-400">{t('loading')}</div>
                ) : horses.length === 0 ? (
                    <div className="text-center text-stone-400">{t('noHorsesYetBody')}</div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
                        <aside className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm xl:sticky xl:top-6 xl:h-fit">
                            <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-400">{t('selectHorseForCare')}</div>
                            <div className="mt-2 text-sm leading-7 text-stone-500">{t('selectHorseForCareBody')}</div>
                            <select
                                value={selectedHorseId}
                                onChange={(e) => setSelectedHorseId(e.target.value)}
                                className="input-brand mt-4 w-full px-3 py-3 text-sm"
                            >
                                <option value="">{t('chooseHorse')}</option>
                                {horses.map((horse) => (
                                    <option key={horse.id} value={horse.id}>
                                        {language === 'ja' ? horse.name : (horse.name_en || horse.name)}
                                    </option>
                                ))}
                            </select>

                            {selectedHorse ? (
                                <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                    <div className="text-sm font-semibold text-stone-800">
                                        {language === 'ja' ? selectedHorse.name : (selectedHorse.name_en || selectedHorse.name)}
                                    </div>
                                    <div className="text-xs text-stone-500">
                                        {language === 'ja' ? (selectedHorse.name_en || '-') : selectedHorse.name}
                                    </div>

                                    <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
                                        {t('latestCareSummary')}
                                    </div>
                                    <div className="mt-3 space-y-3">
                                        {summaryItems.map((item) => (
                                            <div key={item.label} className="rounded-xl border border-stone-200 bg-white px-3 py-2">
                                                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-stone-400">{item.label}</div>
                                                <div className="mt-1 text-sm text-stone-700">{item.value || '-'}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}
                        </aside>

                        <section className="space-y-6">
                            {!selectedHorse ? (
                                <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-stone-500 shadow-sm">
                                    {t('selectHorseForCareBody')}
                                </div>
                            ) : (
                                <>
                                    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                                        <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-400">{t('careRecordsTitle')}</div>
                                        <div className="mt-2 text-sm leading-7 text-stone-500">{t('careRecordsSubtitle')}</div>

                                        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
                                            {capabilities.canUseDepartureReports ? (
                                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('departureDateOptional')}</label>
                                                    <input
                                                        type="date"
                                                        lang={dateInputLang}
                                                        value={careForm.departure_date}
                                                        onChange={(e) => setCareForm((prev) => ({ ...prev, departure_date: e.target.value }))}
                                                        className="input-brand w-full px-3 py-3 text-sm"
                                                    />
                                                </div>
                                            ) : null}

                                            {capabilities.canUseFarrierRecords ? (
                                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:col-span-2">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('farrierDate')}</label>
                                                            <input
                                                                type="date"
                                                                lang={dateInputLang}
                                                                value={careForm.last_farrier_date}
                                                                onChange={(e) => setCareForm((prev) => ({ ...prev, last_farrier_date: e.target.value }))}
                                                                className="input-brand w-full px-3 py-3 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('farrierNote')}</label>
                                                            <textarea
                                                                value={careForm.last_farrier_note}
                                                                onChange={(e) => setCareForm((prev) => ({ ...prev, last_farrier_note: e.target.value }))}
                                                                className="input-brand min-h-[120px] w-full px-3 py-3 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {capabilities.canUseVetRecords ? (
                                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 lg:col-span-3">
                                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('wormingDate')}</label>
                                                            <input
                                                                type="date"
                                                                lang={dateInputLang}
                                                                value={careForm.last_worming_date}
                                                                onChange={(e) => setCareForm((prev) => ({ ...prev, last_worming_date: e.target.value }))}
                                                                className="input-brand w-full px-3 py-3 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('wormingNote')}</label>
                                                            <textarea
                                                                value={careForm.last_worming_note}
                                                                onChange={(e) => setCareForm((prev) => ({ ...prev, last_worming_note: e.target.value }))}
                                                                className="input-brand min-h-[120px] w-full px-3 py-3 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>

                                    {capabilities.canUseVetRecords ? (
                                        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="text-xs font-bold uppercase tracking-[0.24em] text-stone-400">{t('vetTreatmentRecords')}</div>
                                                    <div className="mt-2 text-sm leading-7 text-stone-500">{t('vetTreatmentRecordsHint')}</div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={addTreatmentRecord}
                                                    className="rounded-full border border-[#1a3c34]/20 bg-[#1a3c34]/5 px-4 py-2 text-sm font-semibold text-[#1a3c34]"
                                                >
                                                    + {t('addTreatmentRecord')}
                                                </button>
                                            </div>

                                            {treatmentRecords.length === 0 ? (
                                                <div className="mt-5 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-5 py-8 text-sm text-stone-500">
                                                    {t('noTreatmentRecords')}
                                                </div>
                                            ) : (
                                                <div className="mt-5 space-y-4">
                                                    {treatmentRecords.map((record, index) => (
                                                        <div key={record.id} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                                                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                                <div className="text-sm font-semibold text-stone-800">
                                                                    {t('vetTreatmentRecordLabel')} #{index + 1}
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeTreatmentRecord(record.id)}
                                                                    className="self-start rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-500 hover:text-red-500"
                                                                >
                                                                    {t('deleteReport')}
                                                                </button>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                                                                <div>
                                                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('treatmentDate')}</label>
                                                                    <input
                                                                        type="date"
                                                                        lang={dateInputLang}
                                                                        value={record.date}
                                                                        onChange={(e) => updateTreatmentRecord(record.id, 'date', e.target.value)}
                                                                        className="input-brand w-full px-3 py-3 text-sm"
                                                                    />
                                                                    <label className="mb-2 mt-4 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('reportOutput')}</label>
                                                                    <select
                                                                        value={record.reportMode}
                                                                        onChange={(e) => updateTreatmentRecord(record.id, 'reportMode', e.target.value)}
                                                                        className="input-brand w-full px-3 py-3 text-sm"
                                                                    >
                                                                        <option value="none">{t('doNotInclude')}</option>
                                                                        <option value="body">{t('reflectInBody')}</option>
                                                                        <option value="appendix">{t('attachOnSecondPage')}</option>
                                                                    </select>
                                                                </div>
                                                                <div>
                                                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('treatmentMemo')}</label>
                                                                    <textarea
                                                                        value={record.note}
                                                                        onChange={(e) => updateTreatmentRecord(record.id, 'note', e.target.value)}
                                                                        placeholder={t('treatmentMemoPlaceholder')}
                                                                        className="input-brand min-h-[132px] w-full px-3 py-3 text-sm"
                                                                    />
                                                                    <div className="mt-4">
                                                                        <div className="mb-2 flex items-center justify-between">
                                                                            <label className="block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('supportingImages')}</label>
                                                                            <label className="cursor-pointer rounded-full border border-[#1a3c34]/20 bg-white px-3 py-1.5 text-xs font-semibold text-[#1a3c34]">
                                                                                {uploadingRecordId === record.id ? t('uploadingImages') : t('addImages')}
                                                                                <input
                                                                                    type="file"
                                                                                    accept="image/*"
                                                                                    multiple
                                                                                    className="hidden"
                                                                                    disabled={uploadingRecordId === record.id}
                                                                                    onChange={(e) => {
                                                                                        void handleTreatmentImageUpload(record.id, e.target.files);
                                                                                        e.currentTarget.value = '';
                                                                                    }}
                                                                                />
                                                                            </label>
                                                                        </div>
                                                                        {record.images.length === 0 ? (
                                                                            <div className="rounded-xl border border-dashed border-stone-200 bg-white px-4 py-4 text-xs text-stone-500">
                                                                                {t('noSupportingImages')}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                                                {record.images.map((image) => (
                                                                                    <div key={image.id} className="rounded-xl border border-stone-200 bg-white p-3">
                                                                                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100">
                                                                                            {image.url ? (
                                                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                                                <img src={image.url} alt={image.caption || 'Care attachment'} className="h-full w-full object-contain" />
                                                                                            ) : (
                                                                                                <div className="flex h-full items-center justify-center text-xs text-stone-400">{t('loading')}</div>
                                                                                            )}
                                                                                        </div>
                                                                                        <input
                                                                                            type="text"
                                                                                            value={image.caption}
                                                                                            onChange={(e) => updateTreatmentImage(record.id, image.id, e.target.value)}
                                                                                            placeholder={t('imageCaptionPlaceholder')}
                                                                                            className="input-brand mt-3 w-full px-3 py-2 text-sm"
                                                                                        />
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => removeTreatmentImage(record.id, image.id)}
                                                                                            className="mt-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-500 hover:text-red-500"
                                                                                        >
                                                                                            {t('removeImage')}
                                                                                        </button>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}
