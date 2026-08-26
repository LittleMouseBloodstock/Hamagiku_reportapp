'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Languages, Loader2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getApiAuthHeaders } from '@/lib/api';
import { fillMissingDepartureTranslations, getDepartureTranslationStatus } from '@/lib/departure-report';
import {
    DEFAULT_DEPARTURE_CLOSING_MESSAGE,
    DEPARTURE_CLOSING_MESSAGE_VERSION,
    resolveDepartureClosingMessage,
} from '@/lib/departure-report-content';

export type DepartureReportData = {
    reportDate: string;
    horseNameJp: string;
    horseNameEn: string;
    ownerName: string;
    ownerNameEn: string;
    trainerNameJp: string;
    trainerNameEn: string;
    sexAgeJp: string;
    sexAgeEn: string;
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
    closingMessageJp: string;
    closingMessageEn: string;
    closingMessageVersion: number;
    outputMode?: 'pdf' | 'print';
    showLogo?: boolean;
};

interface DepartureReportTemplateProps {
    initialData?: Partial<DepartureReportData>;
    onDataChange?: (data: DepartureReportData) => void;
    readOnly?: boolean;
}

type BilingualFieldProps = {
    label: string;
    jpValue: string;
    enValue: string;
    onChangeJp: (value: string) => void;
    onChangeEn: (value: string) => void;
    multiline?: boolean;
    rows?: number;
    optional?: boolean;
    disabled?: boolean;
};

const inputClass = 'mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-[#1B3226] focus:bg-white focus:ring-2 focus:ring-[#1B3226]/10 disabled:cursor-not-allowed disabled:opacity-60';
const textAreaClass = `${inputClass} resize-y leading-6`;

function BilingualField({
    label,
    jpValue,
    enValue,
    onChangeJp,
    onChangeEn,
    multiline = false,
    rows = 3,
    optional = false,
    disabled = false,
}: BilingualFieldProps) {
    const renderControl = (value: string, onChange: (value: string) => void) => {
        if (multiline) {
            return <textarea rows={rows} disabled={disabled} className={textAreaClass} value={value} onChange={(event) => onChange(event.target.value)} />;
        }
        return <input type="text" disabled={disabled} className={inputClass} value={value} onChange={(event) => onChange(event.target.value)} />;
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-stone-700">{label}</span>
                {optional && <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">Optional</span>}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-[11px] font-medium text-stone-500">
                    日本語 / JP
                    {renderControl(jpValue, onChangeJp)}
                </label>
                <label className="block text-[11px] font-medium text-stone-500">
                    English / EN
                    {renderControl(enValue, onChangeEn)}
                </label>
            </div>
        </div>
    );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
    return (
        <div className="border-b border-stone-200 pb-2">
            <h3 className="text-sm font-bold tracking-wide text-[#1B3226]">{title}</h3>
            {description && <p className="mt-1 text-[11px] leading-5 text-stone-500">{description}</p>}
        </div>
    );
}

const formatDateUK = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.replace(/-/g, '/').split('/');
    if (parts.length < 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return dateStr;
    return `${day}/${month}/${year}`;
};

const formatDateJp = (dateStr: string) => dateStr ? dateStr.replace(/-/g, '/') : '';
const textValue = (value?: string | null) => String(value || '').trim();

export default function DepartureReportTemplate({ initialData, onDataChange, readOnly = false }: DepartureReportTemplateProps) {
    const { language, t } = useLanguage();
    const isJa = language === 'ja';
    const defaultData: DepartureReportData = {
        reportDate: new Date().toISOString().slice(0, 10),
        horseNameJp: '',
        horseNameEn: '',
        ownerName: '',
        ownerNameEn: '',
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
        closingMessageJp: DEFAULT_DEPARTURE_CLOSING_MESSAGE.jp,
        closingMessageEn: DEFAULT_DEPARTURE_CLOSING_MESSAGE.en,
        closingMessageVersion: DEPARTURE_CLOSING_MESSAGE_VERSION,
        outputMode: 'pdf',
        showLogo: true,
    };

    const [data, setData] = useState<DepartureReportData>({ ...defaultData, ...initialData });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [translationMessage, setTranslationMessage] = useState('');
    const [aiNotes, setAiNotes] = useState('');
    const showLogo = data.showLogo ?? (data.outputMode !== 'print');
    const isPrintMode = data.outputMode === 'print';

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    useEffect(() => {
        onDataChange?.(data);
    }, [data, onDataChange]);

    const handleChange = useCallback((key: keyof DepartureReportData, value: string) => {
        if (readOnly) return;
        setData(prev => ({ ...prev, [key]: value }));
    }, [readOnly]);

    const formatJapaneseHonorific = (name?: string) => {
        const normalized = textValue(name).replace(/\s*様\s*$/u, '').trim();
        return normalized ? `${normalized} 様` : '-';
    };

    const formatOwnerName = (jp?: string, en?: string) => {
        if (!isJa) return textValue(en) || textValue(jp) || '-';
        return formatJapaneseHonorific(textValue(jp) || textValue(en));
    };

    const formatTrainerName = (jp?: string, en?: string) => {
        if (!isJa) return textValue(en) || textValue(jp) || '-';
        return formatJapaneseHonorific(textValue(jp) || textValue(en));
    };

    const handleGenerateFields = async () => {
        if (!aiNotes.trim() || readOnly) return;
        setIsGenerating(true);
        setTranslationMessage('');
        try {
            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '');
            const res = await fetch(`${baseUrl}/generate-departure`, {
                method: 'POST',
                headers: await getApiAuthHeaders(),
                body: JSON.stringify({ notes: aiNotes, reportType: 'departure' }),
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errorText}`);
            }
            const json = await res.json();
            if (!json?.ja || !json?.en) throw new Error('The generated report did not include both Japanese and English fields.');
            setData(prev => ({
                ...prev,
                farrierJp: prev.farrierJp || json.ja.farrier || '',
                farrierEn: prev.farrierEn || json.en.farrier || '',
                wormingJp: prev.wormingJp || json.ja.worming || '',
                wormingEn: prev.wormingEn || json.en.worming || '',
                feedingJp: prev.feedingJp || json.ja.feeding || '',
                feedingEn: prev.feedingEn || json.en.feeding || '',
                exerciseJp: prev.exerciseJp || json.ja.exercise || '',
                exerciseEn: prev.exerciseEn || json.en.exercise || '',
                commentJp: prev.commentJp || json.ja.comment || '',
                commentEn: prev.commentEn || json.en.comment || '',
            }));
        } catch (error) {
            console.error(error);
            alert(`AI Generation failed:\n${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTranslateMissing = async () => {
        if (readOnly || getDepartureTranslationStatus(data).pending === 0) return;
        setIsTranslating(true);
        setTranslationMessage('');
        try {
            const result = await fillMissingDepartureTranslations(data);
            setData(result.data);
            setTranslationMessage(isJa ? `${result.translatedKeys.length}項目の不足言語を補完しました。` : `${result.translatedKeys.length} missing language fields were completed.`);
        } catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            setTranslationMessage(isJa ? `翻訳に失敗しました。${detail}` : `Translation failed. ${detail}`);
        } finally {
            setIsTranslating(false);
        }
    };

    const translationStatus = getDepartureTranslationStatus(data);
    const closingMessage = resolveDepartureClosingMessage({ jp: data.closingMessageJp, en: data.closingMessageEn });
    const displayText = (jp: string, en: string) => isJa ? textValue(jp) || textValue(en) : textValue(en) || textValue(jp);
    const altText = (jp: string, en: string) => isJa ? textValue(en) : textValue(jp);
    const displayHorseName = displayText(data.horseNameJp, data.horseNameEn) || '-';
    const secondaryHorseName = altText(data.horseNameJp, data.horseNameEn);

    const careItems = [
        { label: isJa ? '馬体重' : 'Weight', dateLabel: isJa ? '計測日' : 'Measured', value: textValue(data.weight), date: data.weightDate },
        { label: isJa ? '装蹄' : 'Farrier', dateLabel: isJa ? '最終装蹄日' : 'Last farrier date', value: displayText(data.farrierJp, data.farrierEn), date: data.farrierDate },
        { label: isJa ? '駆虫' : 'Worming', dateLabel: isJa ? '最終駆虫日' : 'Last worming date', value: displayText(data.wormingJp, data.wormingEn), date: data.wormingDate },
    ].filter(item => item.value || item.date);

    const narrativeItems = [
        { label: isJa ? '飼葉' : 'Feeding', value: displayText(data.feedingJp, data.feedingEn) },
        { label: isJa ? '運動・調教' : 'Exercise & Training', value: displayText(data.exerciseJp, data.exerciseEn) },
        { label: isJa ? 'コメント' : 'Comment', value: displayText(data.commentJp, data.commentEn) },
    ].filter(item => item.value);

    return (
        <div className="departure-root flex min-h-screen w-full flex-col bg-stone-100 font-sans md:min-h-0 md:h-full md:flex-row md:overflow-hidden">
            <aside className="departure-form no-print w-full shrink-0 overflow-visible border-r border-stone-200 bg-white p-5 pb-32 md:w-[28rem] md:overflow-y-auto md:p-6">
                <div className="mb-6 flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#B08D45]">Hamagiku Farm</p>
                        <h2 className="mt-2 text-lg font-bold text-[#1B3226]">{t('departureReport')}</h2>
                        <p className="mt-1 text-xs leading-5 text-stone-500">{isJa ? 'オーナー向け退厩レポート' : 'Owner-facing departure report'}</p>
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-stone-500">A4 / PDF</span>
                </div>

                <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide text-indigo-900">AI Writer</span>
                        <span className="text-[11px] text-indigo-600">{isJa ? 'メモから各項目を生成' : 'Generate from notes'}</span>
                    </div>
                    <textarea rows={4} value={aiNotes} disabled={readOnly} onChange={(event) => setAiNotes(event.target.value)} placeholder={isJa ? '退厩理由、近況、装蹄、駆虫、飼葉、運動など' : 'Reason for departure, condition, farrier, worming, feeding, exercise...'} className="mt-3 w-full resize-y rounded-xl border-0 bg-white px-3 py-3 text-sm leading-6 text-stone-900 shadow-sm ring-1 ring-indigo-200 outline-none placeholder:text-indigo-300 focus:ring-2 focus:ring-indigo-400 disabled:opacity-60" />
                    <button type="button" onClick={() => void handleGenerateFields()} disabled={readOnly || isGenerating || !aiNotes.trim()} className="mt-3 w-full rounded-xl bg-indigo-700 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-50">
                        {isGenerating ? 'Generating...' : (isJa ? '日本語・英語を生成' : 'Generate Japanese & English')}
                    </button>
                </div>

                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-950"><Languages size={15} /><span>{isJa ? '言語の整合性' : 'Language consistency'}</span></div>
                        <span className="text-[11px] font-bold text-emerald-700">{translationStatus.complete}/{translationStatus.total}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-emerald-900">
                        {translationStatus.pending > 0 ? (isJa ? `${translationStatus.pending}項目は片側のみです。保存時に不足分を補完します。` : `${translationStatus.pending} field${translationStatus.pending === 1 ? '' : 's'} will be completed before saving.`) : (isJa ? '入力済みの項目は日本語・英語が揃っています。' : 'All entered fields have both languages.')}
                    </p>
                    <button type="button" onClick={() => void handleTranslateMissing()} disabled={readOnly || isTranslating || translationStatus.pending === 0} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50">
                        {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        {isTranslating ? (isJa ? '翻訳中...' : 'Translating...') : (isJa ? '不足分を翻訳' : 'Translate missing fields')}
                    </button>
                    {translationMessage && <p className={`mt-2 flex items-start gap-1 text-[11px] leading-5 ${translationMessage.includes(isJa ? '失敗' : 'failed') ? 'text-red-700' : 'text-emerald-700'}`}>{translationMessage.includes(isJa ? '失敗' : 'failed') ? <AlertCircle size={13} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={13} className="mt-0.5 shrink-0" />}<span>{translationMessage}</span></p>}
                </div>

                <div className="space-y-7">
                    <section className="space-y-4">
                        <SectionHeading title={isJa ? 'レポート基本情報' : 'Report details'} description={isJa ? '帳票の表題と馬の基本情報' : 'Report identity and horse profile'} />
                        <label className="block text-xs font-semibold text-stone-700">{t('reportDate')}<input type="date" value={data.reportDate} disabled={readOnly} onChange={(event) => handleChange('reportDate', event.target.value)} className={inputClass} /></label>
                        <label className="flex items-center gap-2 text-xs font-medium text-stone-600"><input id="show-logo-toggle-departure" type="checkbox" checked={showLogo} disabled={readOnly} onChange={(event) => setData(prev => ({ ...prev, showLogo: event.target.checked }))} className="h-4 w-4 rounded border-stone-300 text-[#1B3226] focus:ring-[#1B3226]" />{isJa ? 'PDF・印刷にロゴを表示' : 'Show logo on PDF / print'}</label>
                        <BilingualField label={isJa ? '馬名' : 'Horse name'} jpValue={data.horseNameJp} enValue={data.horseNameEn} onChangeJp={(value) => handleChange('horseNameJp', value)} onChangeEn={(value) => handleChange('horseNameEn', value)} disabled={readOnly} />
                        <BilingualField label={isJa ? '馬主' : 'Owner'} jpValue={data.ownerName} enValue={data.ownerNameEn} onChangeJp={(value) => handleChange('ownerName', value)} onChangeEn={(value) => handleChange('ownerNameEn', value)} disabled={readOnly} />
                        <BilingualField label={isJa ? '調教師' : 'Trainer'} jpValue={data.trainerNameJp} enValue={data.trainerNameEn} onChangeJp={(value) => handleChange('trainerNameJp', value)} onChangeEn={(value) => handleChange('trainerNameEn', value)} disabled={readOnly} />
                        <BilingualField label={isJa ? '性齢' : 'Sex / age'} jpValue={data.sexAgeJp} enValue={data.sexAgeEn} onChangeJp={(value) => handleChange('sexAgeJp', value)} onChangeEn={(value) => handleChange('sexAgeEn', value)} disabled={readOnly} />
                        <BilingualField label={isJa ? '父' : 'Sire'} jpValue={data.sireJp} enValue={data.sireEn} onChangeJp={(value) => handleChange('sireJp', value)} onChangeEn={(value) => handleChange('sireEn', value)} disabled={readOnly} />
                        <BilingualField label={isJa ? '母' : 'Dam'} jpValue={data.damJp} enValue={data.damEn} onChangeJp={(value) => handleChange('damJp', value)} onChangeEn={(value) => handleChange('damEn', value)} disabled={readOnly} />
                    </section>

                    <section className="space-y-4">
                        <SectionHeading title={isJa ? 'ケア・引き継ぎ情報' : 'Care & handover'} description={isJa ? '日付は両言語で共通の1項目です' : 'Dates are shared between both languages'} />
                        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-stone-700">{t('weight')}<input type="text" value={data.weight} disabled={readOnly} onChange={(event) => handleChange('weight', event.target.value)} placeholder="496kg" className={inputClass} /></label><label className="block text-xs font-semibold text-stone-700">{t('weightDate')}<input type="date" value={data.weightDate} disabled={readOnly} onChange={(event) => handleChange('weightDate', event.target.value)} className={inputClass} /></label></div>
                        <BilingualField label={isJa ? '装蹄師名（任意）' : 'Farrier name (optional)'} jpValue={data.farrierJp} enValue={data.farrierEn} onChangeJp={(value) => handleChange('farrierJp', value)} onChangeEn={(value) => handleChange('farrierEn', value)} optional disabled={readOnly} />
                        <label className="block text-xs font-semibold text-stone-700">{isJa ? '装蹄日（共通）' : 'Farrier date (shared)'}<input type="date" value={data.farrierDate} disabled={readOnly} onChange={(event) => handleChange('farrierDate', event.target.value)} className={inputClass} /></label>
                        <BilingualField label={isJa ? '駆虫内容' : 'Worming'} jpValue={data.wormingJp} enValue={data.wormingEn} onChangeJp={(value) => handleChange('wormingJp', value)} onChangeEn={(value) => handleChange('wormingEn', value)} optional disabled={readOnly} />
                        <label className="block text-xs font-semibold text-stone-700">{isJa ? '駆虫日' : 'Worming date'}<input type="date" value={data.wormingDate} disabled={readOnly} onChange={(event) => handleChange('wormingDate', event.target.value)} className={inputClass} /></label>
                    </section>

                    <section className="space-y-4">
                        <SectionHeading title={isJa ? '近況・コメント' : 'Current condition & comments'} description={isJa ? '入力した言語に応じて保存時に不足分を補完します' : 'Missing language values are completed before saving'} />
                        <BilingualField label={isJa ? '飼葉' : 'Feeding'} jpValue={data.feedingJp} enValue={data.feedingEn} onChangeJp={(value) => handleChange('feedingJp', value)} onChangeEn={(value) => handleChange('feedingEn', value)} multiline rows={4} optional disabled={readOnly} />
                        <BilingualField label={isJa ? '運動・調教' : 'Exercise & training'} jpValue={data.exerciseJp} enValue={data.exerciseEn} onChangeJp={(value) => handleChange('exerciseJp', value)} onChangeEn={(value) => handleChange('exerciseEn', value)} multiline rows={4} optional disabled={readOnly} />
                        <BilingualField label={isJa ? 'コメント' : 'Comment'} jpValue={data.commentJp} enValue={data.commentEn} onChangeJp={(value) => handleChange('commentJp', value)} onChangeEn={(value) => handleChange('commentEn', value)} multiline rows={4} optional disabled={readOnly} />
                    </section>

                    <section className="rounded-2xl border border-[#d8c79f] bg-[#fbf8ef] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#806127]">Closing message</p><p className="mt-2 whitespace-pre-line text-xs leading-5 text-stone-700">{isJa ? closingMessage.jp : closingMessage.en}</p><p className="mt-2 text-[10px] text-stone-500">{isJa ? 'この定型文はすべての退厩レポートに表示されます。' : 'This standard message appears on every departure report.'}</p></section>
                </div>
            </aside>

            <main className="departure-preview-wrap flex min-h-0 flex-1 items-start justify-center overflow-y-auto bg-[#525659] p-4 pb-12 md:p-8 print:bg-white print:p-0">
                <div className="departure-preview-stage">
                    <article id="report-preview" className={`departure-preview${isPrintMode ? ' print-mode' : ''}${showLogo ? '' : ' no-logo'}`}>
                    <header className="departure-header">
                        <div className="departure-brand"><span>HAMAGIKU</span><span>FARM</span><small>{isJa ? '北海道・日本' : 'Hokkaido, Japan'}</small></div>
                        {showLogo && <img src="/hamagiku-logo.png" alt="Hamagiku Farm" className="departure-logo" />}
                        <div className="departure-heading"><span>{t('departureReport')}</span><small>{isJa ? formatDateJp(data.reportDate) || '-' : formatDateUK(data.reportDate) || '-'}</small></div>
                    </header>

                    <div className="departure-content">
                        <section className="departure-identity departure-card">
                            <p className="departure-eyebrow">{isJa ? '退厩馬情報' : 'HORSE DEPARTURE PROFILE'}</p>
                            <h1>{displayHorseName}</h1>
                            {secondaryHorseName && <p className="departure-secondary-name">{secondaryHorseName}</p>}
                            <div className="departure-meta-grid">
                                <div><span>{isJa ? '馬主' : 'Owner'}</span><strong>{formatOwnerName(data.ownerName, data.ownerNameEn)}</strong></div>
                                <div><span>{isJa ? '調教師' : 'Trainer'}</span><strong>{formatTrainerName(data.trainerNameJp, data.trainerNameEn)}</strong></div>
                                {displayText(data.sexAgeJp, data.sexAgeEn) && <div><span>{isJa ? '性齢' : 'Sex / age'}</span><strong>{displayText(data.sexAgeJp, data.sexAgeEn)}</strong></div>}
                            </div>
                            {(displayText(data.sireJp, data.sireEn) || displayText(data.damJp, data.damEn)) && <div className="departure-pedigree">
                                <span>{isJa ? '血統 / 父母' : 'PEDIGREE / PARENTS'}</span>
                                <div className="departure-pedigree-grid">
                                    {displayText(data.sireJp, data.sireEn) && <div><small>{isJa ? '父' : 'Sire'}</small><strong>{displayText(data.sireJp, data.sireEn)}</strong></div>}
                                    {displayText(data.damJp, data.damEn) && <div><small>{isJa ? '母' : 'Dam'}</small><strong>{displayText(data.damJp, data.damEn)}</strong></div>}
                                </div>
                            </div>}
                        </section>

                        {careItems.length > 0 && <section className="departure-section-card"><div className="departure-section-heading"><span>{isJa ? 'ケア・引き継ぎ' : 'CARE & HANDOVER'}</span><i /></div><div className="departure-care-grid">{careItems.map((item) => <div className="departure-care-item" key={item.label}><span>{item.label}</span><strong>{item.value || (item.date ? `${item.dateLabel}: ${isJa ? formatDateJp(item.date) : formatDateUK(item.date)}` : (isJa ? '記録なし' : 'No record'))}</strong>{item.value && item.date && <small>{item.dateLabel}: {isJa ? formatDateJp(item.date) : formatDateUK(item.date)}</small>}</div>)}</div></section>}

                        {narrativeItems.length > 0 && <section className="departure-narratives">{narrativeItems.map((item) => <div className="departure-narrative departure-card" key={item.label}><div className="departure-section-heading"><span>{item.label}</span><i /></div><p>{item.value}</p></div>)}</section>}

                        <section className="departure-closing departure-card"><p className="departure-closing-text">{isJa ? closingMessage.jp : closingMessage.en}</p><p className="departure-closing-signature">{isJa ? '浜菊ファーム一同' : 'Everyone at Hamagiku Farm'}</p></section>
                    </div>

                    <footer className="departure-footer">HAMAGIKU FARM · HOKKAIDO, JAPAN · {isJa ? formatDateJp(data.reportDate) : formatDateUK(data.reportDate)}</footer>
                    </article>
                </div>
            </main>

            <style jsx global>{`
                .departure-preview-stage { box-sizing: border-box; display: flex; width: 100%; min-height: 100%; flex: 1 0 auto; align-items: flex-start; justify-content: center; padding-bottom: 12mm; }
                .departure-preview { width: 210mm; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; flex-shrink: 0; margin: 0 auto 8mm; padding: 17mm 18mm 13mm; color: #26342d; background: #fff; border: 1px solid #d8d2c7; box-shadow: 0 16px 34px rgba(0, 0, 0, .28); font-family: var(--font-noto-sans-jp), var(--font-noto-sans), 'Noto Sans JP', 'Noto Sans', sans-serif; font-variant-numeric: lining-nums; }
                .departure-header { position: relative; display: flex; min-height: 30mm; align-items: center; justify-content: space-between; border-bottom: 1px solid #c5a059; padding-bottom: 7mm; }
                .departure-brand { display: flex; flex-direction: column; gap: 1px; color: #1b3226; font-family: Arial, sans-serif; font-size: 18px; font-weight: 800; letter-spacing: .18em; line-height: 1.05; }
                .departure-brand small { margin-top: 5px; color: #8b8171; font-size: 8px; font-weight: 500; letter-spacing: .12em; }
                .departure-logo { position: absolute; top: 50%; left: 50%; width: 29mm; height: 29mm; object-fit: contain; transform: translate(-50%, -51%); opacity: .8; }
                .departure-heading { display: flex; flex-direction: column; align-items: flex-end; color: #1b3226; font-family: Arial, sans-serif; font-size: 16px; font-weight: 800; letter-spacing: .1em; text-align: right; }
                .departure-heading small { margin-top: 6px; color: #8b8171; font-size: 9px; font-weight: 500; letter-spacing: .08em; }
                .departure-content { display: flex; flex: 1; flex-direction: column; gap: 7mm; padding-top: 8mm; }
                .departure-card { border: 1px solid #e4dfd4; background: #fff; }
                .departure-identity { border-top: 4px solid #1b3226; padding: 7mm 8mm 6mm; }
                .departure-eyebrow { margin: 0; color: #a17f3c; font-family: Arial, sans-serif; font-size: 8px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
                .departure-identity h1 { margin: 3mm 0 0; color: #1b3226; font-size: 26px; line-height: 1.15; }
                .departure-secondary-name { margin: 2px 0 0; color: #877e70; font-family: Arial, sans-serif; font-size: 11px; letter-spacing: .08em; }
                .departure-meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4mm 8mm; margin-top: 7mm; border-top: 1px solid #ece8df; padding-top: 5mm; }
                .departure-meta-grid div { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
                .departure-meta-grid span, .departure-care-item span { color: #9a8b70; font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
                .departure-meta-grid strong { overflow-wrap: break-word; color: #3d493f; font-size: 15px; font-weight: 600; line-height: 1.45; }
                .departure-pedigree { margin-top: 6mm; border-top: 1px solid #ece8df; padding-top: 4mm; }
                .departure-pedigree > span { color: #9a8b70; font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; letter-spacing: .12em; }
                .departure-pedigree-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4mm 8mm; margin-top: 3mm; }
                .departure-pedigree-grid div { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: baseline; gap: 2mm; min-width: 0; }
                .departure-pedigree-grid small { color: #806127; font-size: 12px; font-weight: 700; white-space: nowrap; }
                .departure-pedigree-grid strong { overflow-wrap: break-word; color: #3d493f; font-size: 15px; font-weight: 600; line-height: 1.45; }
                .departure-section-card { break-inside: avoid; page-break-inside: avoid; }
                .departure-section-heading { display: flex; align-items: center; gap: 3mm; color: #806127; font-family: Arial, sans-serif; font-size: 10px; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
                .departure-section-heading i { display: block; height: 1px; flex: 1; background: #dfd3bb; }
                .departure-care-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4mm; margin-top: 4mm; }
                .departure-care-item { min-height: 19mm; border: 1px solid #ebe6dc; background: #faf9f6; padding: 4mm; }
                .departure-care-item strong { display: block; margin-top: 3mm; overflow-wrap: break-word; color: #26342d; font-size: 15px; line-height: 1.45; font-variant-numeric: lining-nums tabular-nums; }
                .departure-care-item small { display: block; margin-top: 2mm; color: #9a8b70; font-family: Arial, sans-serif; font-size: 11px; line-height: 1.35; }
                .departure-narratives { display: flex; flex-direction: column; gap: 5mm; }
                .departure-narrative { break-inside: avoid; page-break-inside: avoid; padding: 5mm 6mm; }
                .departure-narrative p { margin: 4mm 0 0; white-space: pre-line; overflow-wrap: break-word; word-break: normal; color: #3d493f; font-size: 15px; line-height: 1.8; font-variant-numeric: lining-nums; }
                .departure-closing { break-inside: avoid; page-break-inside: avoid; margin-top: auto; border-color: #d8c79f; background: #fbf8ef; padding: 6mm 8mm; text-align: center; }
                .departure-closing-text { margin: 0; white-space: pre-line; color: #806127; font-size: 15px; line-height: 1.75; }
                .departure-closing-signature { margin: 4mm 0 0; color: #6e6048; font-family: Arial, sans-serif; font-size: 9px; font-weight: 700; letter-spacing: .12em; }
                .departure-footer { margin-top: 8mm; border-top: 1px solid #e7e0d1; padding-top: 4mm; color: #aaa194; font-family: Arial, sans-serif; font-size: 9px; letter-spacing: .12em; text-align: center; }
                @media print {
                    @page { size: A4 portrait; margin: 0; }
                    html, body, #__next { height: auto !important; min-height: 0 !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
                    .no-print { display: none !important; }
                    .departure-root { display: block !important; width: 210mm !important; height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff !important; }
                    .departure-preview-wrap { display: block !important; min-height: 0 !important; overflow: visible !important; padding: 0 !important; background: #fff !important; }
                    .departure-preview-stage { display: block !important; width: 210mm !important; min-height: 0 !important; padding: 0 !important; }
                    .departure-preview { width: 210mm !important; min-height: 297mm !important; height: auto !important; margin: 0 !important; padding: 14mm 18mm 8mm !important; display: block !important; overflow: visible !important; box-shadow: none !important; }
                    .departure-preview.no-logo { padding-top: 21mm !important; }
                    .departure-preview.no-logo .departure-logo { display: none !important; }
                    .departure-header { min-height: 27mm !important; padding-bottom: 5mm !important; }
                    .departure-content { display: block !important; flex: none !important; padding-top: 6mm !important; }
                    .departure-content > * + * { margin-top: 5mm !important; }
                    .departure-care-grid { margin-top: 3mm !important; }
                    .departure-narratives { display: block !important; }
                    .departure-narratives > * + * { margin-top: 5mm !important; }
                    .departure-narrative { break-inside: auto !important; page-break-inside: auto !important; padding: 4mm 5mm !important; }
                    .departure-narrative p { margin-top: 3mm !important; line-height: 1.6 !important; }
                    .departure-closing { margin-top: 5mm !important; padding: 4.5mm 7mm !important; }
                    .departure-closing-text { line-height: 1.5 !important; }
                    .departure-footer { break-inside: avoid !important; page-break-inside: avoid !important; margin-top: 5mm !important; padding-top: 3mm !important; }
                    .departure-identity, .departure-section-card, .departure-closing { break-inside: avoid-page !important; page-break-inside: avoid !important; }
                }
            `}</style>
        </div>
    );
}
