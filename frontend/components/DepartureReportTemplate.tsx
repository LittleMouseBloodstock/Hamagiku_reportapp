'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export type DepartureReportData = {
    reportDate: string;
    horseNameJp: string;
    horseNameEn: string;
    ownerName: string;
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
};

interface DepartureReportTemplateProps {
    initialData?: Partial<DepartureReportData>;
    onDataChange?: (data: DepartureReportData) => void;
    readOnly?: boolean;
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

export default function DepartureReportTemplate({ initialData, onDataChange, readOnly = false }: DepartureReportTemplateProps) {
    const { language, t } = useLanguage();
    const isJa = language === 'ja';
    const defaultData: DepartureReportData = {
        reportDate: new Date().toISOString().slice(0, 10),
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
        commentEn: ''
    };

    const [data, setData] = useState<DepartureReportData>({ ...defaultData, ...initialData });
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiNotes, setAiNotes] = useState('');

    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    useEffect(() => {
        if (onDataChange) onDataChange(data);
    }, [data, onDataChange]);

    const handleChange = useCallback((key: keyof DepartureReportData, value: string) => {
        if (readOnly) return;
        setData(prev => ({ ...prev, [key]: value }));
    }, [readOnly]);

    const formatOwnerName = (name?: string) => {
        if (!name) return '-';
        if (language !== 'ja') return name;
        return name.endsWith('様') ? name : `${name}様`;
    };

    const formatTrainerName = (jp?: string, en?: string) => {
        if (language === 'ja') return (jp || en || '-') + ' 様';
        return en || jp || '-';
    };

    const handleGenerateFields = async () => {
        if (!aiNotes) return;
        setIsGenerating(true);
        try {
            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '');
            const res = await fetch(`${baseUrl}/generate-departure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes: aiNotes })
            });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errorText}`);
            }
            const json = await res.json();
            if (!json?.ja || !json?.en) return;
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
                commentEn: prev.commentEn || json.en.comment || ''
            }));
        } catch (e) {
            console.error(e);
            alert("AI Generation failed:\n" + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="departure-root flex flex-col md:flex-row min-h-screen h-screen bg-gray-100 overflow-hidden font-sans">
            <div className="departure-form w-full md:w-96 bg-white border-r border-gray-200 overflow-y-auto p-6 pb-40 space-y-6 no-print">
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('departureReport')}</h2>
                    <p className="text-xs text-gray-400 mt-1">{language === 'ja' ? '退厩レポート用の入力欄' : 'Fields for departure report.'}</p>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">AI Writer</span>
                        <span className="text-[11px] text-indigo-500">{language === 'ja' ? 'メモから各項目を自動生成' : 'Generate fields from notes'}</span>
                    </div>
                    <div className="space-y-2">
                        <textarea
                            rows={3}
                            value={aiNotes}
                            onChange={(e) => setAiNotes(e.target.value)}
                            placeholder={language === 'ja' ? "例：退厩理由、近況、装蹄や駆虫のメモ、飼葉/調教内容 など" : "e.g. reason for departure, recent condition, farrier/worming notes, feeding/training"}
                            className="w-full border-0 rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-indigo-200 placeholder:text-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                        />
                        <button
                            onClick={handleGenerateFields}
                            disabled={isGenerating}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1"
                        >
                            <span>{isGenerating ? 'Generating...' : 'Generate En & Jp'}</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-medium text-gray-700">{t('reportDate')}</label>
                    <input
                        type="date"
                        value={data.reportDate}
                        onChange={e => handleChange('reportDate', e.target.value)}
                        className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('horseNameJp')}</label>
                        <input
                            type="text"
                            value={data.horseNameJp}
                            onChange={e => handleChange('horseNameJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('horseNameEn')}</label>
                        <input
                            type="text"
                            value={data.horseNameEn}
                            onChange={e => handleChange('horseNameEn', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('owner')}</label>
                        <input
                            type="text"
                            value={data.ownerName}
                            onChange={e => handleChange('ownerName', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('trainer')} (JP)</label>
                        <input
                            type="text"
                            value={data.trainerNameJp}
                            onChange={e => handleChange('trainerNameJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('trainer')} (EN)</label>
                    <input
                        type="text"
                        value={data.trainerNameEn}
                        onChange={e => handleChange('trainerNameEn', e.target.value)}
                        className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('sexAge')} (JP)</label>
                        <input
                            type="text"
                            value={data.sexAgeJp}
                            onChange={e => handleChange('sexAgeJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                            placeholder="牡2歳"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('sexAge')} (EN)</label>
                        <input
                            type="text"
                            value={data.sexAgeEn}
                            onChange={e => handleChange('sexAgeEn', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                            placeholder="Colt 2yo"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('sireJp')}</label>
                        <input
                            type="text"
                            value={data.sireJp}
                            onChange={e => handleChange('sireJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('sireEn')}</label>
                        <input
                            type="text"
                            value={data.sireEn}
                            onChange={e => handleChange('sireEn', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('damJp')}</label>
                        <input
                            type="text"
                            value={data.damJp}
                            onChange={e => handleChange('damJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('damEn')}</label>
                        <input
                            type="text"
                            value={data.damEn}
                            onChange={e => handleChange('damEn', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('weight')}</label>
                        <input
                            type="text"
                            value={data.weight}
                            onChange={e => handleChange('weight', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                            placeholder="496kg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('weightDate')}</label>
                        <input
                            type="date"
                            value={data.weightDate}
                            onChange={e => handleChange('weightDate', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('lastFarrier')} (JP)</label>
                        <input
                            type="text"
                            value={data.farrierJp}
                            onChange={e => handleChange('farrierJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('lastFarrier')} (EN)</label>
                        <input
                            type="text"
                            value={data.farrierEn}
                            onChange={e => handleChange('farrierEn', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">{t('lastFarrier')} {t('date')}</label>
                        <input
                            type="date"
                            value={data.farrierDate}
                            onChange={e => handleChange('farrierDate', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('lastWorming')} (JP)</label>
                        <input
                            type="text"
                            value={data.wormingJp}
                            onChange={e => handleChange('wormingJp', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-700">{t('lastWorming')} (EN)</label>
                        <input
                            type="text"
                            value={data.wormingEn}
                            onChange={e => handleChange('wormingEn', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700">{t('lastWorming')} {t('date')}</label>
                        <input
                            type="date"
                            value={data.wormingDate}
                            onChange={e => handleChange('wormingDate', e.target.value)}
                            className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('feeding')} (JP)</label>
                    <textarea
                        rows={3}
                        value={data.feedingJp}
                        onChange={e => handleChange('feedingJp', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('feeding')} (EN)</label>
                    <textarea
                        rows={3}
                        value={data.feedingEn}
                        onChange={e => handleChange('feedingEn', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('exercise')} (JP)</label>
                    <textarea
                        rows={4}
                        value={data.exerciseJp}
                        onChange={e => handleChange('exerciseJp', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('exercise')} (EN)</label>
                    <textarea
                        rows={4}
                        value={data.exerciseEn}
                        onChange={e => handleChange('exerciseEn', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('comment')} (JP)</label>
                    <textarea
                        rows={3}
                        value={data.commentJp}
                        onChange={e => handleChange('commentJp', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700">{t('comment')} (EN)</label>
                    <textarea
                        rows={3}
                        value={data.commentEn}
                        onChange={e => handleChange('commentEn', e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                    />
                </div>
            </div>

            <div className="departure-preview-wrap flex-1 min-h-0 bg-[#525659] p-4 md:p-8 overflow-y-auto flex justify-center items-start h-full pb-12 print:bg-white print:p-0 print:overflow-hidden">
                <div
                    id="report-preview"
                    className="departure-preview bg-white shadow-2xl w-[210mm] min-h-[297mm] p-8 text-gray-900 font-sans mb-8"
                >
                    <div className="flex justify-between items-end border-b border-gray-300 pb-3 mb-4">
                        <div className="text-xl font-bold text-[#1a3c34]">{t('departureReport')}</div>
                        <div className="text-sm text-gray-500">{data.reportDate || '-'}</div>
                    </div>

                    {isJa ? (
                        <section className="departure-section">
                            <div className="text-[15px] leading-7">
                                <div>馬主：{formatOwnerName(data.ownerName)} / 調教師：{formatTrainerName(data.trainerNameJp, data.trainerNameEn)}</div>
                                <div>馬名：{data.horseNameJp} {data.sexAgeJp ? `（${data.sexAgeJp}）` : ''}</div>
                                <div>父：{data.sireJp}　母：{data.damJp}</div>
                                <div>馬体重：{data.weight}{data.weightDate ? `（${data.weightDate}）` : ''}</div>
                                <div>{t('lastFarrier')}：{data.farrierJp}{data.farrierDate ? `　${data.farrierDate}` : ''}</div>
                                <div>{t('lastWorming')}：{data.wormingJp}{data.wormingDate ? `　${data.wormingDate}` : ''}</div>
                                <div>{t('feeding')}：{data.feedingJp}</div>
                                <div>{t('exercise')}：{data.exerciseJp}</div>
                                {data.commentJp ? <div>コメント：{data.commentJp}</div> : null}
                            </div>
                        </section>
                    ) : (
                        <section className="departure-section">
                            <div className="text-[15px] leading-7">
                                <div>Owner: {data.ownerName || '-'} / Trainer: {formatTrainerName(data.trainerNameJp, data.trainerNameEn)}</div>
                                <div>Name: {data.horseNameEn} {data.sexAgeEn ? `(${data.sexAgeEn})` : ''}</div>
                                <div>Sire: {data.sireEn} / Dam: {data.damEn}</div>
                                <div>Weight: {data.weight}{data.weightDate ? ` (${formatDateUK(data.weightDate)})` : ''}</div>
                                <div>Farrier: {data.farrierEn}{data.farrierDate ? ` ${formatDateUK(data.farrierDate)}` : ''}</div>
                                <div>Recent Worming: {data.wormingEn}{data.wormingDate ? ` ${formatDateUK(data.wormingDate)}` : ''}</div>
                                <div>Feeding: {data.feedingEn}</div>
                                <div>Exercise Routine: {data.exerciseEn}</div>
                                {data.commentEn ? <div>Comment: {data.commentEn}</div> : null}
                            </div>
                        </section>
                    )}
                </div>
            </div>
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 10mm; }
                    html, body, #__next {
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .no-print { display: none !important; }
                    .departure-root {
                        background: white !important;
                        height: auto !important;
                    }
                    .departure-preview-wrap {
                        background: white !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }
                    .departure-preview {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: 210mm !important;
                        height: 297mm !important;
                        margin: 0 !important;
                        padding: 16mm 14mm 12mm 14mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: hidden !important;
                    }
                    .departure-preview .text-xl { font-size: 18px !important; }
                    .departure-preview .departure-section { font-size: 14px !important; line-height: 1.6 !important; }
                }
            `}</style>
        </div>
    );
}
