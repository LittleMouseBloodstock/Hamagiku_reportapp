'use client';

import { useEffect, useState } from 'react';
import { FileText, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { generateStatusReport, translateText } from '@/lib/api';

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
    const [data, setData] = useState<StatusReportData>({ ...defaultData, ...initialData });
    const [aiNotes, setAiNotes] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [generationError, setGenerationError] = useState('');
    const isPrintMode = data.outputMode === 'print';
    const showLogo = data.showLogo ?? !isPrintMode;

    useEffect(() => {
        setData((prev) => ({ ...prev, ...initialData }));
    }, [initialData]);

    useEffect(() => {
        onDataChange?.(data);
    }, [data, onDataChange]);

    const update = (key: keyof StatusReportData, value: string | boolean) => {
        setData((prev) => ({ ...prev, [key]: value }));
    };

    const generateStatus = async () => {
        if (!aiNotes.trim()) return;
        setIsGenerating(true);
        setGenerationError('');
        try {
            const json = await generateStatusReport(aiNotes.trim());
            if (!json?.ja || !json?.en) {
                throw new Error('The generated report was incomplete. Please try again.');
            }
            setData((prev) => ({
                ...prev,
                assessmentJp: json?.ja?.assessment || json?.ja?.comment || prev.assessmentJp,
                assessmentEn: json?.en?.assessment || json?.en?.comment || prev.assessmentEn,
                managementJp: json?.ja?.management || json?.ja?.exercise || prev.managementJp,
                managementEn: json?.en?.management || json?.en?.exercise || prev.managementEn,
                nextStepsJp: json?.ja?.nextSteps || json?.ja?.feeding || prev.nextStepsJp,
                nextStepsEn: json?.en?.nextSteps || json?.en?.feeding || prev.nextStepsEn,
                commentJp: json?.ja?.comment || prev.commentJp,
                commentEn: json?.en?.comment || prev.commentEn
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

    const translateComment = async () => {
        if (!data.commentEn.trim()) return;
        setIsTranslating(true);
        try {
            const result = await translateText(data.commentEn, 'ja', 'status');
            const translatedText = result?.translatedText?.trim();
            if (!translatedText) throw new Error('Translation returned no text');
            update('commentJp', translatedText);
        } catch (error) {
            console.error('Status report translation failed:', error);
            alert('Translation failed.');
        } finally {
            setIsTranslating(false);
        }
    };

    const pairField = (label: string, jpKey: keyof StatusReportData, enKey: keyof StatusReportData) => (
        <div className="grid gap-3 md:grid-cols-2">
            <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">{label} (JP)</label>
                <textarea value={String(data[jpKey] || '')} onChange={(event) => update(jpKey, event.target.value)} rows={3} className="w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 shadow-sm" />
            </div>
            <div>
                <label className="mb-1 block text-xs font-semibold text-stone-600">{label} (EN)</label>
                <textarea value={String(data[enKey] || '')} onChange={(event) => update(enKey, event.target.value)} rows={3} className="w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900 shadow-sm" />
            </div>
        </div>
    );

    return (
        <div className="status-report-root flex min-h-screen w-full flex-col bg-gray-100 font-sans md:flex-row md:overflow-hidden">
            <div className="status-report-form no-print w-full space-y-5 overflow-y-auto border-r border-stone-200 bg-white p-6 pb-40 md:w-[420px]">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-stone-500">{language === 'ja' ? '現状報告レポート' : 'Current Status Report'}</h2>
                    <p className="mt-1 text-xs text-stone-400">{language === 'ja' ? '来場時にすぐ渡せる、写真なしの近況報告です。' : 'A photo-free update for an immediate owner or trainer handover.'}</p>
                </div>
                <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-800"><FileText size={14} /> {language === 'ja' ? '文章作成' : 'Report Draft'}</div>
                    <textarea value={aiNotes} onChange={(event) => setAiNotes(event.target.value)} rows={7} placeholder={language === 'ja' ? '例：跛行の経過、検査結果、現在の管理、次の方針を入力' : 'e.g. lameness history, examination findings, current management and next steps'} className="w-full rounded-lg border-0 bg-white/80 px-3 py-3 text-sm text-stone-900 shadow-sm ring-1 ring-indigo-200" />
                    <button type="button" onClick={() => void generateStatus()} disabled={isGenerating || !aiNotes.trim()} className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50">
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
                {pairField(language === 'ja' ? '現在の状態' : 'Current assessment', 'assessmentJp', 'assessmentEn')}
                {pairField(language === 'ja' ? '治療・管理' : 'Treatment & management', 'managementJp', 'managementEn')}
                {pairField(language === 'ja' ? '今後の方針' : 'Next steps', 'nextStepsJp', 'nextStepsEn')}
                <div className="grid gap-3 md:grid-cols-2">
                    <div><label className="mb-1 block text-xs font-semibold text-stone-600">Comment (JP)</label><textarea value={data.commentJp} onChange={(event) => update('commentJp', event.target.value)} rows={4} className="w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900" /></div>
                    <div><label className="mb-1 block text-xs font-semibold text-stone-600">Comment (EN)</label><textarea value={data.commentEn} onChange={(event) => update('commentEn', event.target.value)} rows={4} className="w-full rounded-lg border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-900" /><button type="button" onClick={() => void translateComment()} disabled={isTranslating || !data.commentEn.trim()} className="mt-2 inline-flex items-center gap-1 rounded-md border border-stone-200 px-3 py-2 text-xs text-[#1a3c34] disabled:opacity-50"><Globe size={13} />{isTranslating ? 'Translating...' : 'Translate to Japanese'}</button></div>
                </div>
            </div>

            <div className="status-report-preview-wrap flex flex-1 items-start justify-center overflow-y-auto bg-[#525659] p-4 md:p-8 print:bg-white print:p-0">
                <div id="report-preview" className={`status-report-preview relative mb-8 min-h-[297mm] w-[210mm] bg-white text-stone-900 shadow-2xl${isPrintMode ? ' print-mode' : ''}${showLogo ? '' : ' no-logo'}`}>
                    <header className="relative flex h-[130px] items-center justify-between border-b-2 border-[#c5a059] px-8 pt-4">
                        <div className="z-10 font-serif text-2xl font-bold leading-tight tracking-widest text-[#1a3c34]">HAMAGIKU<br />FARM</div>
                        {showLogo && <img src="/hamagiku-logo.png" alt="Logo" className="logo-container absolute left-1/2 top-1/2 h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 object-contain opacity-70" />}
                        <div className="z-10 text-right"><div className="font-serif text-xl font-bold tracking-widest text-[#1a3c34]">{language === 'ja' ? '現状報告' : 'CURRENT STATUS'}</div><div className="mt-1 text-xs text-stone-500">{reportDateLabel(data.reportDate, language)}</div></div>
                    </header>
                    <main className="px-8 py-6">
                        <div className="mb-5 flex items-end justify-between gap-6">
                            <div><div className="font-serif text-3xl font-bold text-stone-800">{language === 'ja' ? data.horseNameJp || '（馬名未入力）' : data.horseNameEn || '(Horse name)'}</div><div className="mt-1 text-lg text-[#c5a059]">{language === 'ja' ? data.horseNameEn : data.horseNameJp}</div></div>
                            <div className="border-l-[3px] border-[#1a3c34] bg-[#f4f7f6] px-4 py-3 text-right text-sm text-stone-600">{language === 'ja' ? `馬主：${data.ownerName || '-'} / 調教師：${data.trainerNameJp || '-'}` : `Owner: ${data.ownerName || '-'} / Trainer: ${data.trainerNameEn || '-'}`}<br />{language === 'ja' ? `馬体重：${data.weight || '-'}${data.weightDate ? `（${formatDate(data.weightDate, language)}）` : ''}` : `Weight: ${data.weight || '-'}${data.weightDate ? ` (${formatDate(data.weightDate, language)})` : ''}`}</div>
                        </div>
                        <div className="grid gap-4">
                            {[
                                [language === 'ja' ? '現在の状態' : 'CURRENT ASSESSMENT', data.assessmentJp, data.assessmentEn],
                                [language === 'ja' ? '治療・管理' : 'TREATMENT & MANAGEMENT', data.managementJp, data.managementEn],
                                [language === 'ja' ? '今後の方針' : 'NEXT STEPS', data.nextStepsJp, data.nextStepsEn],
                                [language === 'ja' ? 'コメント' : 'COMMENT', data.commentJp, data.commentEn]
                            ].map(([label, jp, en]) => <section key={String(label)} className="rounded-lg border border-[#d8c8af] bg-white p-4"><h2 className="mb-2 border-b border-[#eee4d8] pb-2 font-serif text-sm font-bold tracking-[0.16em] text-[#1a3c34]">{label}</h2><p className="whitespace-pre-wrap text-[15px] leading-7">{language === 'ja' ? (jp || '-') : (en || '-')}</p></section>)}
                        </div>
                    </main>
                    <footer className="absolute bottom-4 left-0 w-full text-center text-[10px] tracking-widest text-[#aaa]">HAMAGIKU FARM - HOKKAIDO, JAPAN | {language === 'ja' ? data.reportDate.replace(/-/g, '/') : reportDateLabel(data.reportDate, 'en')}</footer>
                </div>
            </div>
            <style jsx global>{`@media print { @page { size: A4 portrait; margin: 10mm 0 0 0; } html, body, #__next { height:auto !important; overflow:visible !important; background:#fff !important; margin:0 !important; padding:0 !important; } .no-print { display:none !important; } .status-report-root { display:block !important; min-height:0 !important; background:#fff !important; } .status-report-preview-wrap { display:block !important; padding:0 !important; overflow:visible !important; background:#fff !important; } .status-report-preview { position:static !important; width:210mm !important; height:auto !important; min-height:285mm !important; margin:0 !important; padding:0 0 12mm !important; overflow:visible !important; box-shadow:none !important; } .status-report-preview.no-logo .logo-container { display:none !important; } .status-report-preview main { padding:18mm 30px 10px !important; } .status-report-preview.print-mode main { padding-top:22mm !important; } .status-report-preview section { break-inside:avoid-page !important; page-break-inside:avoid !important; } .status-report-preview footer { position:static !important; margin-top:8mm !important; } }`}</style>
        </div>
    );
}
