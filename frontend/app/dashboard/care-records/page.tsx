'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet, restPatch, restPost } from '@/lib/restClient';
import { supabase } from '@/lib/supabase';

type HorseOption = {
    id: string;
    name: string;
    name_en?: string | null;
    departure_date?: string | null;
    last_farrier_date?: string | null;
    last_farrier_note?: string | null;
    last_worming_date?: string | null;
    last_worming_note?: string | null;
};

type CareRecord = {
    id: string;
    date: string;
    note: string;
    reportMode: 'none' | 'body' | 'appendix';
    imageUrls?: string[];
};

const emptyRecord = (): CareRecord => ({
    id: `care-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: '',
    note: '',
    reportMode: 'none'
});

export default function CareRecordsPage() {
    const { session } = useAuth();
    const { language, t } = useLanguage();
    const [horses, setHorses] = useState<HorseOption[]>([]);
    const [selectedHorseId, setSelectedHorseId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingRecordId, setUploadingRecordId] = useState('');
    const loadedHorseIdRef = useRef('');
    const hasUnsavedCareChangesRef = useRef(false);
    const [formData, setFormData] = useState({
        departure_date: '',
        last_farrier_date: '',
        last_farrier_note: '',
        last_worming_date: '',
        last_worming_note: ''
    });
    const [records, setRecords] = useState<CareRecord[]>([]);

    const selectedHorse = useMemo(
        () => horses.find((horse) => horse.id === selectedHorseId) || null,
        [horses, selectedHorseId]
    );

    const getHeaders = () => {
        if (!session?.access_token) throw new Error('Missing access token for REST');
        return buildRestHeaders({ bearerToken: session.access_token, prefer: 'return=representation' });
    };

    const draftKeyForHorse = (horseId: string) => `care-records:${horseId}`;

    const loadCareDraft = async (horseId: string) => {
        const rows = await restGet(`report_drafts?draft_key=eq.${encodeURIComponent(draftKeyForHorse(horseId))}&select=data`, getHeaders());
        const nextRecords = rows?.[0]?.data?.records;
        return Array.isArray(nextRecords) ? nextRecords as CareRecord[] : [];
    };

    const fileToBlob = (file: File) => file;

    const uploadCareImage = async (recordId: string, file: File) => {
        if (!selectedHorseId || !session?.access_token) return null;
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const safeExt = /^[a-z0-9]+$/.test(ext) ? ext : 'jpg';
        const path = `care-records/${selectedHorseId}/${recordId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
        const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
        const { supabaseUrl, supabaseAnonKey } = (() => {
            const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!url || !key) throw new Error('Missing storage env');
            return { supabaseUrl: url, supabaseAnonKey: key };
        })();
        const res = await fetch(`${supabaseUrl}/storage/v1/object/report-assets/${encodedPath}`, {
            method: 'POST',
            headers: {
                apikey: supabaseAnonKey,
                Authorization: `Bearer ${session.access_token}`,
                'x-upsert': 'true',
                'Content-Type': file.type || 'image/jpeg'
            },
            body: fileToBlob(file)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(text || `Storage upload failed: ${res.status}`);
        }
        const { data: { publicUrl } } = supabase.storage.from('report-assets').getPublicUrl(path);
        return publicUrl;
    };

    useEffect(() => {
        let mounted = true;
        const loadPage = async () => {
            if (!session?.access_token) return;
            try {
                const horseData = await restGet('horses?select=id,name,name_en,departure_date,last_farrier_date,last_farrier_note,last_worming_date,last_worming_note&order=name', getHeaders());
                if (!mounted) return;
                const nextHorses = horseData as HorseOption[] || [];
                setHorses(nextHorses);
                const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
                const initialHorseId = params?.get('horseId') || nextHorses[0]?.id || '';
                setSelectedHorseId((prev) => prev || initialHorseId);
            } catch (error) {
                console.error('Failed to load care records page:', error);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        loadPage();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.access_token]);

    useEffect(() => {
        let mounted = true;
        const loadHorseData = async () => {
            if (!selectedHorseId || !session?.access_token) return;
            if (selectedHorseId === loadedHorseIdRef.current) return;
            const horse = horses.find((item) => item.id === selectedHorseId);
            if (!horse) return;
            setFormData({
                departure_date: horse.departure_date || '',
                last_farrier_date: horse.last_farrier_date || '',
                last_farrier_note: horse.last_farrier_note || '',
                last_worming_date: horse.last_worming_date || '',
                last_worming_note: horse.last_worming_note || ''
            });
            const nextRecords = await loadCareDraft(selectedHorseId);
            if (!mounted) return;
            setRecords(nextRecords.length ? nextRecords : [emptyRecord()]);
            loadedHorseIdRef.current = selectedHorseId;
            hasUnsavedCareChangesRef.current = false;
        };
        loadHorseData().catch((error) => console.error('Failed to load horse care state:', error));
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedHorseId, horses, session?.access_token]);

    const markCareDirty = () => {
        hasUnsavedCareChangesRef.current = true;
    };

    const updateFormField = (key: keyof typeof formData, value: string) => {
        markCareDirty();
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleHorseChange = (horseId: string) => {
        loadedHorseIdRef.current = '';
        hasUnsavedCareChangesRef.current = false;
        setSelectedHorseId(horseId);
    };

    const handleRecordChange = (recordId: string, key: keyof CareRecord, value: string) => {
        markCareDirty();
        setRecords((prev) => prev.map((record) => record.id === recordId ? { ...record, [key]: value } : record));
    };

    const addRecord = () => {
        markCareDirty();
        setRecords((prev) => [...prev, emptyRecord()]);
    };

    const removeRecord = (recordId: string) => {
        markCareDirty();
        setRecords((prev) => {
            const next = prev.filter((record) => record.id !== recordId);
            return next.length ? next : [emptyRecord()];
        });
    };

    const saveCareDraftRecords = async (nextRecords: CareRecord[]) => {
        if (!selectedHorseId) return;
        const cleanedRecords = nextRecords
            .map((record) => ({ ...record, note: record.note.trim() }))
            .filter((record) => record.date || record.note || (record.imageUrls || []).length);

        await restPost('report_drafts?on_conflict=draft_key', {
            draft_key: draftKeyForHorse(selectedHorseId),
            horse_id: selectedHorseId,
            report_type: 'care-records',
            updated_at: new Date().toISOString(),
            data: { records: cleanedRecords }
        }, buildRestHeaders({
            bearerToken: session?.access_token,
            prefer: 'resolution=merge-duplicates,return=representation'
        }));
    };

    const handleImageUpload = async (recordId: string, files: FileList | null) => {
        if (!files?.length) return;
        setUploadingRecordId(recordId);
        try {
            const selectedFiles = Array.from(files).slice(0, 6);
            const results = await Promise.allSettled(selectedFiles.map((file) => uploadCareImage(recordId, file)));
            const urls = results
                .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled' && !!result.value)
                .map((result) => result.value);
            const failedCount = results.length - urls.length;
            if (urls.length) {
                let nextRecordsToSave: CareRecord[] = [];
                setRecords((prev) => {
                    const next = prev.map((record) => (
                        record.id === recordId
                            ? { ...record, imageUrls: [...(record.imageUrls || []), ...urls] }
                            : record
                    ));
                    nextRecordsToSave = next;
                    return next;
                });
                await saveCareDraftRecords(nextRecordsToSave);
                hasUnsavedCareChangesRef.current = false;
            }
            if (failedCount) {
                alert(language === 'ja'
                    ? `${failedCount} 枚の画像アップロードに失敗しました。成功した画像は保存済みです。`
                    : `${failedCount} image upload(s) failed. Successful uploads have been saved.`);
            }
        } catch (error) {
            console.error('Failed to upload care images:', error);
            alert(language === 'ja' ? '画像のアップロードに失敗しました。' : 'Failed to upload images.');
        } finally {
            setUploadingRecordId('');
        }
    };

    const removeRecordImage = (recordId: string, imageUrl: string) => {
        markCareDirty();
        setRecords((prev) => prev.map((record) => (
            record.id === recordId
                ? { ...record, imageUrls: (record.imageUrls || []).filter((url) => url !== imageUrl) }
                : record
        )));
    };

    const handleSave = async () => {
        if (!selectedHorseId) return;
        if (uploadingRecordId) {
            alert(language === 'ja' ? '画像アップロードが終わってから保存してください。' : 'Please wait for image uploads to finish before saving.');
            return;
        }
        setSaving(true);
        try {
            await restPatch(`horses?id=eq.${selectedHorseId}`, {
                departure_date: formData.departure_date || null,
                last_farrier_date: formData.last_farrier_date || null,
                last_farrier_note: formData.last_farrier_note || null,
                last_worming_date: formData.last_worming_date || null,
                last_worming_note: formData.last_worming_note || null,
                updated_at: new Date().toISOString()
            }, getHeaders());

            await saveCareDraftRecords(records);

            setHorses((prev) => prev.map((horse) => horse.id === selectedHorseId ? {
                ...horse,
                departure_date: formData.departure_date || null,
                last_farrier_date: formData.last_farrier_date || null,
                last_farrier_note: formData.last_farrier_note || null,
                last_worming_date: formData.last_worming_date || null,
                last_worming_note: formData.last_worming_note || null
            } : horse));
            hasUnsavedCareChangesRef.current = false;
        } catch (error) {
            console.error('Failed to save care records:', error);
            alert(language === 'ja' ? 'ケア記録の保存に失敗しました。' : 'Failed to save care records.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6 text-stone-500">Loading care records...</div>;
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-white border-b border-stone-200 gap-3 sm:gap-0">
                <div>
                    <div className="text-xl font-bold text-[#1a3c34] font-display">{t('careRecords') || 'Care Records'}</div>
                    <div className="text-sm text-stone-500">
                        {language === 'ja'
                            ? '退厩・装蹄・駆虫と、牧場側の獣医共有メモを馬ごとに管理します。'
                            : 'Manage departure/farrier/worming details and farm-side vet notes by horse.'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedHorseId}
                        onChange={(e) => handleHorseChange(e.target.value)}
                        className="w-64 rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                    >
                        {horses.map((horse) => (
                            <option key={horse.id} value={horse.id}>
                                {language === 'ja' ? horse.name : (horse.name_en || horse.name)}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleSave}
                        disabled={saving || !!uploadingRecordId || !selectedHorseId}
                        className="px-5 py-2 text-sm rounded-lg bg-[#1a3c34] text-white hover:bg-[#122b25] shadow-sm disabled:opacity-50"
                    >
                        {saving
                            ? (language === 'ja' ? '保存中...' : 'Saving...')
                            : uploadingRecordId
                                ? (language === 'ja' ? '画像アップロード中...' : 'Uploading images...')
                                : (t('save') || 'Save')}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-6">
                    <section className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-4">
                        <div className="text-lg font-semibold text-stone-800">
                            {selectedHorse ? (language === 'ja' ? selectedHorse.name : (selectedHorse.name_en || selectedHorse.name)) : '-'}
                        </div>
                        {selectedHorse && language === 'ja' && selectedHorse.name_en ? (
                            <div className="text-sm text-stone-500">{selectedHorse.name_en}</div>
                        ) : null}
                        <div className="space-y-3">
                            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                <div className="text-xs font-semibold tracking-[0.18em] text-stone-400 uppercase">{t('departureDate')}</div>
                                <div className="mt-2 text-sm text-stone-700">{formData.departure_date || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                <div className="text-xs font-semibold tracking-[0.18em] text-stone-400 uppercase">{t('lastFarrier')}</div>
                                <div className="mt-2 text-sm text-stone-700">{[formData.last_farrier_date, formData.last_farrier_note].filter(Boolean).join(' ') || '-'}</div>
                            </div>
                            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                <div className="text-xs font-semibold tracking-[0.18em] text-stone-400 uppercase">{t('lastWorming')}</div>
                                <div className="mt-2 text-sm text-stone-700">{[formData.last_worming_date, formData.last_worming_note].filter(Boolean).join(' ') || '-'}</div>
                            </div>
                        </div>
                    </section>

                    <section className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{t('departureDate')}</label>
                                    <input type="date" className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={formData.departure_date} onChange={(e) => updateFormField('departure_date', e.target.value)} />
                                </div>
                                <div />
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{t('lastFarrier')}</label>
                                    <input type="date" className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={formData.last_farrier_date} onChange={(e) => updateFormField('last_farrier_date', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'ja' ? '装蹄メモ' : 'Farrier Note'}</label>
                                    <input type="text" className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={formData.last_farrier_note} onChange={(e) => updateFormField('last_farrier_note', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{t('lastWorming')}</label>
                                    <input type="date" className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={formData.last_worming_date} onChange={(e) => updateFormField('last_worming_date', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'ja' ? '駆虫メモ' : 'Worming Note'}</label>
                                    <input type="text" className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={formData.last_worming_note} onChange={(e) => updateFormField('last_worming_note', e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-lg font-semibold text-stone-800">{t('vetShareNotes') || 'Vet Share Notes'}</div>
                                    <div className="text-sm text-stone-500">
                                        {language === 'ja'
                                            ? '獣医から受けた説明や経過を、牧場側の共有メモとして残します。'
                                            : 'Keep farm-side notes from vet explanations and follow-up updates.'}
                                    </div>
                                </div>
                                <button onClick={addRecord} className="px-4 py-2 text-sm rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200">
                                    {language === 'ja' ? '記録追加' : 'Add Note'}
                                </button>
                            </div>

                            {records.map((record, index) => (
                                <div key={record.id} className="rounded-xl border border-stone-200 p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold text-stone-700">
                                            {language === 'ja' ? `記録 ${index + 1}` : `Record ${index + 1}`}
                                        </div>
                                        <button onClick={() => removeRecord(record.id)} className="text-xs text-red-500 hover:text-red-700">
                                            {language === 'ja' ? '削除' : 'Delete'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)_220px] gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-stone-600 mb-1">{t('date')}</label>
                                            <input type="date" className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={record.date} onChange={(e) => handleRecordChange(record.id, 'date', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'ja' ? '共有メモ' : 'Shared Note'}</label>
                                            <textarea className="w-full min-h-[120px] rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={record.note} onChange={(e) => handleRecordChange(record.id, 'note', e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-stone-600 mb-1">{language === 'ja' ? 'レポート出力' : 'Report Output'}</label>
                                            <select className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20" value={record.reportMode} onChange={(e) => handleRecordChange(record.id, 'reportMode', e.target.value)}>
                                                <option value="none">{t('reportOutputNone') || 'Do not include'}</option>
                                                <option value="body">{t('reportOutputBody') || 'Use in body'}</option>
                                                <option value="appendix">{t('reportOutputAppendix') || 'Keep for appendix'}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="rounded-lg border border-dashed border-stone-300 bg-stone-50 p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <div className="text-xs font-semibold text-stone-700">
                                                    {language === 'ja' ? '添付画像' : 'Attached Images'}
                                                </div>
                                                <div className="mt-1 text-xs text-stone-500">
                                                    {language === 'ja'
                                                        ? '傷、レントゲン、エコー、経過写真など。appendix 出力時に2ページ目へ表示します。'
                                                        : 'Wound photos, X-rays, ultrasound images, or progress photos. These appear on the appendix page.'}
                                                </div>
                                            </div>
                                            <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm ring-1 ring-stone-200 hover:bg-stone-100">
                                                {uploadingRecordId === record.id
                                                    ? (language === 'ja' ? 'アップロード中...' : 'Uploading...')
                                                    : (language === 'ja' ? '画像を追加' : 'Add Images')}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    className="hidden"
                                                    disabled={uploadingRecordId === record.id}
                                                    onChange={(e) => {
                                                        void handleImageUpload(record.id, e.target.files);
                                                        e.currentTarget.value = '';
                                                    }}
                                                />
                                            </label>
                                        </div>
                                        {(record.imageUrls || []).length ? (
                                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                {(record.imageUrls || []).map((url) => (
                                                    <div key={url} className="relative overflow-hidden rounded-lg border border-stone-200 bg-white">
                                                        <img src={url} alt="" className="h-24 w-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeRecordImage(record.id, url)}
                                                            className="absolute right-1 top-1 rounded bg-black/60 px-2 py-1 text-[10px] text-white hover:bg-black"
                                                        >
                                                            {language === 'ja' ? '削除' : 'Remove'}
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
