'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { FileText } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBranding } from '@/contexts/BrandingContext';
import { formatHorseSexAge } from '@/lib/horseProfile';
import { translateText } from '@/lib/api';

export type DepartureReportData = {
    reportDate: string;
    outputMode?: 'japanese_only' | 'english_only' | 'bilingual';
    ownerName: string;
    horseNameJp: string;
    horseNameEn: string;
    birthDate?: string;
    horseSex?: string;
    trainerNameJp?: string;
    trainerNameEn?: string;
    sireJp: string;
    sireEn: string;
    damJp: string;
    damEn: string;
    weight: string;
    weightDate: string;
    farrierJp: string;
    farrierEn: string;
    farrierDate: string;
    wormingJp: string;
    wormingEn: string;
    wormingDate: string;
    feedingJp: string;
    feedingEn: string;
    exerciseJp: string;
    exerciseEn: string;
    commentJp: string;
    commentEn: string;
};

interface DepartureReportTemplateProps {
    initialData?: Partial<DepartureReportData>;
    onDataChange?: (data: DepartureReportData) => void;
    readOnly?: boolean;
    outputMode?: DepartureReportData['outputMode'];
    onOutputModeChange?: (mode: NonNullable<DepartureReportData['outputMode']>) => void;
    userId?: string | null;
}

const defaultData: DepartureReportData = {
    reportDate: '',
    outputMode: 'bilingual',
    ownerName: '',
    horseNameJp: '',
    horseNameEn: '',
    birthDate: '',
    horseSex: '',
    trainerNameJp: '',
    trainerNameEn: '',
    sireJp: '',
    sireEn: '',
    damJp: '',
    damEn: '',
    weight: '',
    weightDate: '',
    farrierJp: '',
    farrierEn: '',
    farrierDate: '',
    wormingJp: '',
    wormingEn: '',
    wormingDate: '',
    feedingJp: '',
    feedingEn: '',
    exerciseJp: '',
    exerciseEn: '',
    commentJp: '',
    commentEn: '',
};

function formatFieldDate(date: string, lang: 'ja' | 'en') {
    if (!date) return '-';
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString(lang === 'ja' ? 'ja-JP' : 'en-GB');
}

function formatBilingualLabel(ja: string, en: string, bilingual: boolean, previewLang: 'ja' | 'en') {
    if (bilingual) return `${ja} / ${en}`;
    return previewLang === 'ja' ? ja : en;
}

export default function DepartureReportTemplate({
    initialData,
    onDataChange,
    readOnly = false,
    outputMode: controlledOutputMode,
    onOutputModeChange,
    userId,
}: DepartureReportTemplateProps) {
    const { t, language } = useLanguage();
    const { branding, resolvedLogoUrl } = useBranding();
    const [data, setData] = useState<DepartureReportData>({ ...defaultData, ...initialData });
    const [translatingAll, setTranslatingAll] = useState(false);

    useEffect(() => {
        if (!data.reportDate) {
            setData((prev) => ({
                ...prev,
                reportDate: new Date().toISOString().slice(0, 10),
            }));
        }
    }, [data.reportDate]);

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setData((prev) => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    useEffect(() => {
        onDataChange?.(data);
    }, [data, onDataChange]);

    const outputMode = controlledOutputMode || data.outputMode || 'bilingual';
    const previewLang = outputMode === 'english_only' ? 'en' : 'ja';
    const showJapanese = outputMode !== 'english_only';
    const showEnglish = outputMode !== 'japanese_only';
    const isBilingual = outputMode === 'bilingual';
    const dateInputLang = language === 'ja' ? 'ja-JP' : 'en-GB';
    const sexAgeJa = formatHorseSexAge(data.horseSex, data.birthDate, data.reportDate.slice(0, 7), 'ja');
    const sexAgeEn = formatHorseSexAge(data.horseSex, data.birthDate, data.reportDate.slice(0, 7), 'en');

    const sections = useMemo(() => ([
        {
            key: 'feeding',
            titleJa: '飼い葉',
            titleEn: 'Feeding',
            valueJa: data.feedingJp,
            valueEn: data.feedingEn,
        },
        {
            key: 'exercise',
            titleJa: '運動',
            titleEn: 'Exercise',
            valueJa: data.exerciseJp,
            valueEn: data.exerciseEn,
        },
        {
            key: 'farrier',
            titleJa: '装蹄',
            titleEn: 'Farrier',
            valueJa: data.farrierJp,
            valueEn: data.farrierEn,
            date: data.farrierDate,
        },
        {
            key: 'worming',
            titleJa: '駆虫',
            titleEn: 'Worming',
            valueJa: data.wormingJp,
            valueEn: data.wormingEn,
            date: data.wormingDate,
        },
    ]), [data.exerciseEn, data.exerciseJp, data.farrierDate, data.farrierEn, data.farrierJp, data.feedingEn, data.feedingJp, data.wormingDate, data.wormingEn, data.wormingJp]);
    const primaryComment = previewLang === 'ja' ? (data.commentJp || data.commentEn || '') : (data.commentEn || data.commentJp || '');
    const secondaryComment = previewLang === 'ja' ? (data.commentEn || '') : (data.commentJp || '');
    const hasPrimaryComment = Boolean(primaryComment.trim());
    const hasSecondaryComment = Boolean(secondaryComment.trim());

    const fillEnglishFromJapanese = async () => {
        if (!userId) return;
        setTranslatingAll(true);
        try {
            const fieldPairs = [
                ['feedingJp', 'feedingEn'],
                ['exerciseJp', 'exerciseEn'],
                ['farrierJp', 'farrierEn'],
                ['wormingJp', 'wormingEn'],
                ['commentJp', 'commentEn'],
            ] as const;

            const nextData = { ...data };
            for (const [sourceKey, targetKey] of fieldPairs) {
                const sourceText = nextData[sourceKey];
                if (!sourceText?.trim()) continue;
                const result = await translateText(sourceText, 'en', userId);
                const translatedText = result?.translatedText || result?.translation || result?.text || '';
                if (typeof translatedText === 'string' && translatedText.trim()) {
                    nextData[targetKey] = translatedText.trim();
                }
            }
            setData(nextData);
        } catch (error) {
            console.error('Departure report EN autofill failed:', error);
        } finally {
            setTranslatingAll(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-gray-100 font-sans md:min-h-screen md:flex-row print:block print:min-h-0">
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body * { visibility: hidden; }
                    #departure-preview, #departure-preview * { visibility: visible; }
                    #departure-preview {
                        position: relative !important;
                        width: 210mm !important;
                        min-height: auto !important;
                        margin: 0 auto !important;
                        padding: 10mm 10mm 12mm !important;
                        background: white !important;
                        box-shadow: none !important;
                    }
                    #departure-preview section,
                    #departure-preview .departure-card {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            `}</style>

            {!readOnly && (
                <div className="w-full border-r border-gray-200 bg-white shadow-lg md:w-[400px] md:overflow-y-auto print:hidden">
                    <div className="bg-[var(--brand-primary)] p-6 text-white">
                        <h1 className="flex items-center gap-2 text-xl font-bold">
                            <FileText size={18} />
                            {t('departureReport')}
                        </h1>
                        <p className="mt-1 text-xs text-white/70">{branding.farmName}</p>
                    </div>

                    <div className="space-y-6 p-6 pb-40">
                        <section className="space-y-4">
                            <h2 className="border-b pb-2 text-sm font-bold uppercase tracking-wider text-gray-500">{t('basicInfo')}</h2>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">{t('reportDate')}</label>
                                <input type="date" lang={dateInputLang} value={data.reportDate} onChange={(e) => setData({ ...data, reportDate: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Output Mode</label>
                                <select
                                    value={outputMode}
                                    onChange={(e) => {
                                        const nextMode = e.target.value as NonNullable<DepartureReportData['outputMode']>;
                                        setData({ ...data, outputMode: nextMode });
                                        onOutputModeChange?.(nextMode);
                                    }}
                                    className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                >
                                    <option value="bilingual">Japanese + English</option>
                                    <option value="japanese_only">Japanese Only</option>
                                    <option value="english_only">English Only</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">{t('owner')}</label>
                                <input type="text" value={data.ownerName} onChange={(e) => setData({ ...data, ownerName: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('horseNameEn')}</label>
                                    <input type="text" value={data.horseNameEn} onChange={(e) => setData({ ...data, horseNameEn: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('horseNameJp')}</label>
                                    <input type="text" value={data.horseNameJp} onChange={(e) => setData({ ...data, horseNameJp: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('trainer')} (EN)</label>
                                    <input type="text" value={data.trainerNameEn || ''} onChange={(e) => setData({ ...data, trainerNameEn: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('trainer')} (JP)</label>
                                    <input type="text" value={data.trainerNameJp || ''} onChange={(e) => setData({ ...data, trainerNameJp: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('weight')}</label>
                                    <input type="text" value={data.weight} onChange={(e) => setData({ ...data, weight: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder="498kg" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-gray-700">{t('weightDate')}</label>
                                    <input type="date" lang={dateInputLang} value={data.weightDate} onChange={(e) => setData({ ...data, weightDate: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" />
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="border-b pb-2 text-sm font-bold uppercase tracking-wider text-gray-500">{t('pedigree')}</h2>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" value={data.sireEn} onChange={(e) => setData({ ...data, sireEn: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder={`${t('sire')} (EN)`} />
                                <input type="text" value={data.sireJp} onChange={(e) => setData({ ...data, sireJp: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder={`${t('sire')} (JP)`} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" value={data.damEn} onChange={(e) => setData({ ...data, damEn: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder={`${t('dam')} (EN)`} />
                                <input type="text" value={data.damJp} onChange={(e) => setData({ ...data, damJp: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder={`${t('dam')} (JP)`} />
                            </div>
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center justify-between gap-3 border-b pb-2">
                                <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">{t('departureDetails')}</h2>
                                {showJapanese && showEnglish && (
                                    <button
                                        type="button"
                                        onClick={() => void fillEnglishFromJapanese()}
                                        disabled={translatingAll || !userId}
                                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                                    >
                                        {translatingAll ? 'Translating...' : 'JP -> EN auto-fill'}
                                    </button>
                                )}
                            </div>

                            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div className="text-sm font-semibold text-stone-800">{t('feeding')}</div>
                                    {showJapanese && showEnglish && <div className="text-[11px] text-stone-500">JP primary / EN optional</div>}
                                </div>
                                <div className={`grid gap-3 ${showJapanese && showEnglish ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {showJapanese && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('feeding')} (JP)</label>
                                            <textarea rows={3} value={data.feedingJp} onChange={(e) => setData({ ...data, feedingJp: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                    {showEnglish && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('feeding')} (EN)</label>
                                            <textarea rows={3} value={data.feedingEn} onChange={(e) => setData({ ...data, feedingEn: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                                <div className="mb-3 text-sm font-semibold text-stone-800">{t('exercise')}</div>
                                <div className={`grid gap-3 ${showJapanese && showEnglish ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {showJapanese && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('exercise')} (JP)</label>
                                            <textarea rows={3} value={data.exerciseJp} onChange={(e) => setData({ ...data, exerciseJp: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                    {showEnglish && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('exercise')} (EN)</label>
                                            <textarea rows={3} value={data.exerciseEn} onChange={(e) => setData({ ...data, exerciseEn: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                                <div className="mb-3 grid grid-cols-[1fr_140px] gap-3">
                                    <div className="text-sm font-semibold text-stone-800">{t('farrier')}</div>
                                    <input type="date" lang={dateInputLang} value={data.farrierDate} onChange={(e) => setData({ ...data, farrierDate: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div className={`grid gap-3 ${showJapanese && showEnglish ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {showJapanese && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('farrier')} (JP)</label>
                                            <textarea rows={2} value={data.farrierJp} onChange={(e) => setData({ ...data, farrierJp: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                    {showEnglish && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('farrier')} (EN)</label>
                                            <textarea rows={2} value={data.farrierEn} onChange={(e) => setData({ ...data, farrierEn: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4">
                                <div className="mb-3 grid grid-cols-[1fr_140px] gap-3">
                                    <div className="text-sm font-semibold text-stone-800">{t('worming')}</div>
                                    <input type="date" lang={dateInputLang} value={data.wormingDate} onChange={(e) => setData({ ...data, wormingDate: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                </div>
                                <div className={`grid gap-3 ${showJapanese && showEnglish ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                    {showJapanese && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('worming')} (JP)</label>
                                            <textarea rows={2} value={data.wormingJp} onChange={(e) => setData({ ...data, wormingJp: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                    {showEnglish && (
                                        <div>
                                            <label className="mb-1 block text-xs font-medium text-gray-700">{t('worming')} (EN)</label>
                                            <textarea rows={2} value={data.wormingEn} onChange={(e) => setData({ ...data, wormingEn: e.target.value })} className="input-brand w-full bg-white px-3 py-2 text-sm text-gray-900" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h2 className="border-b pb-2 text-sm font-bold uppercase tracking-wider text-gray-500">{t('comment')}</h2>
                            {showJapanese && (
                                <textarea rows={6} value={data.commentJp} onChange={(e) => setData({ ...data, commentJp: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder={`${t('comment')} (JP)`} />
                            )}
                            {showEnglish && (
                                <textarea rows={6} value={data.commentEn} onChange={(e) => setData({ ...data, commentEn: e.target.value })} className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900" placeholder={`${t('comment')} (EN)`} />
                            )}
                        </section>
                    </div>
                </div>
            )}

            <div className="flex flex-1 justify-center overflow-y-auto bg-[#525659] p-4 print:bg-white print:p-0">
                <div id="departure-preview" className="relative w-[210mm] bg-white p-8 shadow-2xl print:shadow-none">
                    <div className="border-b border-[#d9c9ac] pb-5">
                        <div className="flex items-start justify-between gap-6">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.28em] text-[#b18946]">{branding.farmName}</p>
                                <h1 className="mt-3 font-serif text-[34px] leading-none text-[var(--brand-primary)]">{t('departureReport')}</h1>
                            </div>
                            {resolvedLogoUrl && (
                                <div className="relative h-16 w-16 overflow-hidden rounded-xl opacity-70">
                                    <Image src={resolvedLogoUrl} alt={branding.farmName} fill className="object-contain" unoptimized />
                                </div>
                            )}
                        </div>
                        <div className="mt-5 grid grid-cols-[1fr_auto] gap-4 border-t border-[#e9dfd0] pt-4">
                            <div>
                                <div className="font-serif text-[28px] text-stone-900">{previewLang === 'ja' ? data.horseNameJp : data.horseNameEn}</div>
                                <div className="text-[15px] text-[#c59d53]">{previewLang === 'ja' ? data.horseNameEn : data.horseNameJp}</div>
                            </div>
                            <div className="departure-card rounded-md bg-[#f5f1eb] px-3 py-2 text-right text-sm leading-7 text-stone-600">
                                <div>{formatBilingualLabel('馬主', 'Owner', isBilingual, previewLang)}: {data.ownerName || '-'}</div>
                                <div>{formatBilingualLabel('調教師', 'Trainer', isBilingual, previewLang)}: {previewLang === 'ja' ? (data.trainerNameJp || data.trainerNameEn || '-') : (data.trainerNameEn || data.trainerNameJp || '-')}</div>
                                <div>{formatBilingualLabel('作成日', 'Date', isBilingual, previewLang)}: {formatFieldDate(data.reportDate, previewLang)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="departure-card rounded-xl border border-[#e9dfd0] p-3.5">
                            <div className="text-[11px] uppercase tracking-[0.24em] text-[#b18946]">{formatBilingualLabel('基本情報', 'Profile', isBilingual, previewLang)}</div>
                            <div className="mt-3 space-y-2 text-sm leading-7 text-stone-700">
                                <div>{formatBilingualLabel('性別・年齢', 'Sex / Age', isBilingual, previewLang)}: {previewLang === 'ja' ? (sexAgeJa || '-') : (sexAgeEn || '-')}</div>
                                <div>{formatBilingualLabel('父', 'Sire', isBilingual, previewLang)}: {previewLang === 'ja' ? (data.sireJp || data.sireEn || '-') : (data.sireEn || data.sireJp || '-')}</div>
                                <div>{formatBilingualLabel('母', 'Dam', isBilingual, previewLang)}: {previewLang === 'ja' ? (data.damJp || data.damEn || '-') : (data.damEn || data.damJp || '-')}</div>
                            </div>
                        </div>
                        <div className="departure-card rounded-xl border border-[#e9dfd0] p-3.5">
                            <div className="text-[11px] uppercase tracking-[0.24em] text-[#b18946]">{formatBilingualLabel('体重', 'Weight', isBilingual, previewLang)}</div>
                            <div className="mt-3 font-serif text-[28px] text-[var(--brand-primary)]">{data.weight || '-'}</div>
                            <div className="mt-2 text-sm text-stone-600">{formatFieldDate(data.weightDate, previewLang)}</div>
                        </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {sections.map((section) => (
                            <section key={section.key} className="departure-card rounded-xl border border-[#e9dfd0] p-3.5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-semibold text-[var(--brand-primary)]">{formatBilingualLabel(section.titleJa, section.titleEn, isBilingual, previewLang)}</h3>
                                    {section.date ? <span className="text-xs text-stone-500">{formatFieldDate(section.date, previewLang)}</span> : null}
                                </div>
                                <div className="mt-2 min-h-[40px] whitespace-pre-wrap text-sm leading-7 text-stone-700">
                                    {previewLang === 'ja' ? (section.valueJa || section.valueEn || '-') : (section.valueEn || section.valueJa || '-')}
                                </div>
                                {isBilingual && Boolean((previewLang === 'ja' ? section.valueEn : section.valueJa)?.trim()) && (
                                    <div className="mt-2 border-t border-[#efe7d9] pt-2 whitespace-pre-wrap text-sm leading-7 text-stone-500">
                                        {previewLang === 'ja' ? (section.valueEn || '-') : (section.valueJa || '-')}
                                    </div>
                                )}
                            </section>
                        ))}

                        <section className="departure-card col-span-2 rounded-xl border border-[#e9dfd0] p-3.5">
                            <h3 className="font-semibold text-[var(--brand-primary)]">{formatBilingualLabel('コメント', 'Comment', isBilingual, previewLang)}</h3>
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-stone-700">
                                {hasPrimaryComment ? primaryComment : '-'}
                            </div>
                            {isBilingual && hasSecondaryComment && (
                                <div className="mt-2 border-t border-[#efe7d9] pt-2 whitespace-pre-wrap text-sm leading-7 text-stone-500">
                                    {secondaryComment}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
