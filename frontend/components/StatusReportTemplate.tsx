'use client';

import { useEffect, useState } from 'react';
import { FileText, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateStatusReport, translateText } from '@/lib/api';
import {
    buildLegacyStatusNarrative,
    parseStatusNarrative,
} from '@/lib/status-report-format';

export type StatusReportData = {
    reportDate: string;
    horseNameJp: string;
    horseNameEn: string;
    ownerName?: string;
    trainerNameJp?: string;
    trainerNameEn?: string;
    sexAgeJp?: string;
    sexAgeEn?: string;
    sireJp?: string;
    sireEn?: string;
    damJp?: string;
    damEn?: string;
    weight?: string;
    weightDate?: string;
    sourceNotes: string;
    reportJp: string;
    reportEn: string;
    assessmentJp: string;
    assessmentEn: string;
    managementJp: string;
    managementEn: string;
    nextStepsJp: string;
    nextStepsEn: string;
    commentJp: string;
    commentEn: string;
    outputMode?: 'pdf' | 'print';
    showLogo?: boolean;
};

type Props = {
    initialData?: Partial<StatusReportData>;
    onDataChange?: (data: StatusReportData) => void;
};

const defaultData: StatusReportData = {
    reportDate: '',
    horseNameJp: '',
    horseNameEn: '',
    ownerName: '',
    trainerNameJp: '',
    trainerNameEn: '',
    sexAgeJp: '',
    sexAgeEn: '',
    sireJp: '',
    sireEn: '',
    damJp: '',
    damEn: '',
    weight: '',
    weightDate: '',
    sourceNotes: '',
    reportJp: '',
    reportEn: '',
    assessmentJp: '',
    assessmentEn: '',
    managementJp: '',
    managementEn: '',
    nextStepsJp: '',
    nextStepsEn: '',
    commentJp: '',
    commentEn: '',
    outputMode: 'pdf',
    showLogo: true
};

function hydrateStatusData(value?: Partial<StatusReportData>): StatusReportData {
    const merged = { ...defaultData, ...value };
    return {
        ...merged,
        reportJp: merged.reportJp.trim() || buildLegacyStatusNarrative('ja', {
            assessment: merged.assessmentJp,
            management: merged.managementJp,
            nextSteps: merged.nextStepsJp,
            comment: merged.commentJp,
        }),
        reportEn: merged.reportEn.trim() || buildLegacyStatusNarrative('en', {
            assessment: merged.assessmentEn,
            management: merged.managementEn,
            nextSteps: merged.nextStepsEn,
            comment: merged.commentEn,
        }),
    };
}

function formatDate(value: string, language: 'ja' | 'en') {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return language === 'ja' ? value.replace(/-/g, '/') : date.toLocaleDateString('en-GB');
}

function reportDateLabel(value: string, language: 'ja' | 'en') {
    if (!value) return '-';
    if (language === 'ja') return value.replace(/-/g, '/').replace(/\./g, '/');
    const date = new Date(`${value}-01`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export default function StatusReportTemplate({ initialData, onDataChange }: Props) {
    const { language, t } = useLanguage();
    const [data, setData] = useState<StatusReportData>(() => hydrateStatusData(initialData));
    const [isGenerating, setIsGenerating] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [generationError, setGenerationError] = useState('');
    const isPrintMode = data.outputMode === 'print';
    const showLogo = data.showLogo ?? !isPrintMode;

    useEffect(() => {
        setData((prev) => hydrateStatusData({ ...prev, ...initialData }));
    }, [initialData]);

    useEffect(() => {
        onDataChange?.(data);
    }, [data, onDataChange]);

    const update = (key: keyof StatusReportData, value: string | boolean) => {
        setData((prev) => ({ ...prev, [key]: value }));
    };

    const generateStatus = async () => {
        if (!data.sourceNotes.trim()) return;
        setIsGenerating(true);
        setGenerationError('');
        try {
            const json = await generateStatusReport(data.sourceNotes.trim());
            const reportJp = String(
                json?.ja?.report
                || json?.ja?.narrative
                || buildLegacyStatusNarrative('ja', {
                    assessment: json?.ja?.assessment,
                    management: json?.ja?.management,
                    nextSteps: json?.ja?.nextSteps,
                    comment: json?.ja?.comment,
                })
            ).trim();
            const reportEn = String(
                json?.en?.report
                || json?.en?.narrative
                || buildLegacyStatusNarrative('en', {
                    assessment: json?.en?.assessment,
                    management: json?.en?.management,
                    nextSteps: json?.en?.nextSteps,
                    comment: json?.en?.comment,
                })
            ).trim();
            if (!reportJp || !reportEn) {
                throw new Error('The generated report was incomplete. Please try again.');
            }
            setData((prev) => ({
                ...prev,
                reportJp,
                reportEn,
            }));
        } catch (error) {
            console.error('Status report generation failed:', error);
            const detail = error instanceof Error ? error.message : String(error);
            setGenerationError(
                language === 'ja'
                    ? `文章を生成できませんでした。${detail}`
                    : `The report could not be generated. ${detail}`
            );
        } finally {
            setIsGenerating(false);
        }
    };

    const translateReport = async () => {
        if (!data.reportEn.trim()) return;
        setIsTranslating(true);
        try {
            const result = await translateText(data.reportEn, 'ja', 'status');
            const translatedText = result?.translatedText?.trim();
            if (!translatedText) throw new Error('Translation returned no text');
            update('reportJp', translatedText);
        } catch (error) {
            console.error('Status report translation failed:', error);
            alert('Translation failed.');
        } finally {
            setIsTranslating(false);
        }
    };

    const previewText = language === 'ja' ? data.reportJp : data.reportEn;
    const previewSections = parseStatusNarrative(previewText);

    return (
        <div className="status-report-root flex min-h-screen w-full flex-col bg-gray-100 font-sans md:flex-row md:overflow-hidden">
            <div className="status-report-form no-print w-full space-y-5 overflow-y-auto border-r border-stone-200 bg-white p-6 pb-40 md:w-[420px]">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">{language === 'ja' ? '治療経過報告' : 'Treatment Update'}</h2>
                    <p className="mt-1 text-xs text-stone-400">{language === 'ja' ? '来場時にすぐ渡せる、写真なしの治療・管理経過報告です。' : 'A photo-free treatment and management update for an immediate owner or trainer handover.'}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-800"><FileText size={14} /> {language === 'ja' ? '文章作成' : 'Report Draft'}</div>
                    <textarea value={data.sourceNotes} onChange={(event) => update('sourceNotes', event.target.value)} rows={10} placeholder={language === 'ja' ? '治療・管理経過、検査、診断麻酔、画像所見、現在の状況、今後の方針を入力してください。後から訂正を追記した場合は、訂正内容を優先して反映します。' : 'Enter the complete treatment history, examinations, diagnostic blocks, imaging findings, current status, and next steps. A later explicit correction will override an earlier conflicting statement.'} className="w-full rounded-lg border-0 bg-white/80 px-3 py-3 text-sm text-stone-900 shadow-sm ring-1 ring-indigo-200" />
                    <p className="mt-2 text-[11px] leading-5 text-indigo-700">{language === 'ja' ? '入力原文は生成後も保存され、内容確認に利用できます。' : 'The original source notes are retained after generation for factual review.'}</p>
                    <button type="button" onClick={() => void generateStatus()} disabled={isGenerating || !data.sourceNotes.trim()} className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
                        {isGenerating ? (language === 'ja' ? '生成中...' : 'Generating...') : (language === 'ja' ? '日本語・英語の文章を生成' : 'Generate Japanese & English')}
                    </button>
                    {generationError && <p role="alert" className="mt-2 text-xs font-medium text-red-700">{generationError}</p>}
                </div>
                <label className="block text-xs font-semibold text-stone-600">{t('reportDate') || 'Report date'}
                    <input type="date" value={data.reportDate} onChange={(event) => update('reportDate', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900" />
                </label>
                <label className="flex items-center gap-2 text-xs text-stone-600"><input type="checkbox" checked={showLogo} onChange={(event) => update('showLogo', event.target.checked)} /> Logo on PDF/Print</label>
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-stone-600">Horse (JP)<input value={data.horseNameJp} onChange={(event) => update('horseNameJp', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 px-3 py-2 text-sm text-stone-900" /></label>
                    <label className="text-xs font-semibold text-stone-600">Horse (EN)<input value={data.horseNameEn} onChange={(event) => update('horseNameEn', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 px-3 py-2 text-sm text-stone-900" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-stone-600">{language === 'ja' ? '馬主' : 'Owner'}<input value={data.ownerName || ''} onChange={(event) => update('ownerName', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 px-3 py-2 text-sm text-stone-900" /></label>
                    <label className="text-xs font-semibold text-stone-600">{language === 'ja' ? '調教師' : 'Trainer'}<input value={language === 'ja' ? (data.trainerNameJp || '') : (data.trainerNameEn || '')} onChange={(event) => update(language === 'ja' ? 'trainerNameJp' : 'trainerNameEn', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 px-3 py-2 text-sm text-stone-900" /></label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-xs font-semibold text-stone-600">{language === 'ja' ? '馬体重' : 'Weight'}<input value={data.weight || ''} onChange={(event) => update('weight', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 px-3 py-2 text-sm text-stone-900" /></label>
                    <label className="text-xs font-semibold text-stone-600">{language === 'ja' ? '計測日' : 'Weight date'}<input type="date" value={data.weightDate || ''} onChange={(event) => update('weightDate', event.target.value)} className="mt-1 w-full rounded-lg border-stone-300 px-3 py-2 text-sm text-stone-900" /></label>
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-600">{language === 'ja' ? '治療・診断経過（日本語）' : 'Treatment and diagnostic history (Japanese)'}</label>
                    <textarea value={data.reportJp} onChange={(event) => update('reportJp', event.target.value)} rows={14} className="w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-900" />
                </div>
                <div>
                    <label className="mb-1 block text-xs font-semibold text-stone-600">{language === 'ja' ? '治療・診断経過（英語）' : 'Treatment and diagnostic history (English)'}</label>
                    <textarea value={data.reportEn} onChange={(event) => update('reportEn', event.target.value)} rows={14} className="w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm leading-6 text-stone-900" />
                    <button type="button" onClick={() => void translateReport()} disabled={isTranslating || !data.reportEn.trim()} className="mt-2 inline-flex items-center gap-1 rounded-md border border-stone-200 px-3 py-2 text-xs text-[#1a3c34] disabled:opacity-50"><Globe size={13} />{isTranslating ? 'Translating...' : 'Translate full report to Japanese'}</button>
                </div>
            </div>

            <div className="status-report-preview-wrap flex flex-1 items-start justify-center overflow-y-auto bg-[#525659] p-4 md:p-8 print:bg-white print:p-0">
                <div id="report-preview" className={`status-report-preview relative mb-8 min-h-[297mm] w-[210mm] bg-white text-stone-900 shadow-2xl${isPrintMode ? ' print-mode' : ''}${showLogo ? '' : ' no-logo'}`}>
                    <header className="relative flex h-[130px] items-center justify-between border-b-2 border-[#c5a059] px-8 pt-4">
                        <div className="z-10 font-serif text-2xl font-bold leading-tight tracking-widest text-[#1a3c34]">HAMAGIKU<br />FARM</div>
                        {showLogo && <img src="/hamagiku-logo.png" alt="Logo" className="logo-container absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-70" />}
                        <div className="z-10 text-right"><div className="font-serif text-xl font-bold tracking-widest text-[#1a3c34]">{language === 'ja' ? '治療経過報告' : 'TREATMENT UPDATE'}</div><div className="mt-1 text-xs text-stone-500">{reportDateLabel(data.reportDate, language)}</div></div>
                    </header>
                    <main className="px-8 py-6">
                        <div className="mb-5 flex items-end justify-between gap-6">
                            <div><div className="font-serif text-3xl font-bold text-stone-800">{language === 'ja' ? data.horseNameJp || '（馬名未入力）' : data.horseNameEn || '(Horse name)'}</div><div className="mt-1 text-lg text-[#c5a059]">{language === 'ja' ? data.horseNameEn : data.horseNameJp}</div></div>
                            <div className="border-l-[3px] border-[#1a3c34] bg-[#f4f7f6] px-4 py-3 text-right text-sm text-stone-600">{language === 'ja' ? `馬主：${data.ownerName || '-'} / 調教師：${data.trainerNameJp || '-'}` : `Owner: ${data.ownerName || '-'} / Trainer: ${data.trainerNameEn || '-'}`}<br />{language === 'ja' ? `馬体重：${data.weight || '-'}${data.weightDate ? `（${formatDate(data.weightDate, language)}）` : ''}` : `Weight: ${data.weight || '-'}${data.weightDate ? ` (${formatDate(data.weightDate, language)})` : ''}`}</div>
                        </div>
                        <article className="status-report-article border-t-2 border-[#315f91] pt-5">
                            {previewSections.length ? previewSections.map((section, index) => (
                                <section key={`${section.number ?? index}-${section.heading}`} className="status-report-section mb-5">
                                    {section.heading && (
                                        <h2 className="status-report-section-heading mb-2 font-serif text-[16px] font-bold leading-6 text-[#315f91]">
                                            {section.number ?? index + 1}{language === 'ja' ? '．' : '. '}{section.heading}
                                        </h2>
                                    )}
                                    <div className="space-y-2">
                                        {section.paragraphs.map((paragraph, paragraphIndex) => (
                                            <p key={paragraphIndex} className="whitespace-pre-wrap text-[14px] leading-7 text-stone-800">{paragraph}</p>
                                        ))}
                                    </div>
                                </section>
                            )) : <p className="py-10 text-center text-sm text-stone-400">-</p>}
                        </article>
                    </main>
                    <footer className="absolute bottom-4 left-0 w-full text-center text-[10px] tracking-widest text-[#aaa]">HAMAGIKU FARM - HOKKAIDO, JAPAN | {language === 'ja' ? data.reportDate.replace(/-/g, '/') : reportDateLabel(data.reportDate, 'en')}</footer>
                </div>
            </div>
            <style jsx global>{`@media print { @page { size: A4 portrait; margin: 10mm 0 0 0; } html, body, #__next { height:auto !important; overflow:visible !important; background:#fff !important; margin:0 !important; padding:0 !important; } .no-print { display:none !important; } .status-report-root { display:block !important; min-height:0 !important; background:#fff !important; } .status-report-preview-wrap { display:block !important; padding:0 !important; overflow:visible !important; background:#fff !important; } .status-report-preview { position:static !important; width:210mm !important; height:auto !important; min-height:285mm !important; margin:0 !important; padding:0 0 12mm !important; overflow:visible !important; box-shadow:none !important; } .status-report-preview.no-logo .logo-container { display:none !important; } .status-report-preview main { padding:18mm 30px 10px !important; } .status-report-preview.print-mode main { padding-top:22mm !important; } .status-report-section-heading { break-after:avoid-page !important; page-break-after:avoid !important; } .status-report-preview footer { position:static !important; margin-top:8mm !important; } }`}</style>
        </div>
    );
}
