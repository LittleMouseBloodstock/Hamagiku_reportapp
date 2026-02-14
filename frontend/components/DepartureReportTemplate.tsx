'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export type DepartureReportData = {
    reportDate: string;
    horseNameJp: string;
    horseNameEn: string;
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
    const defaultData: DepartureReportData = {
        reportDate: new Date().toISOString().slice(0, 10),
        horseNameJp: '',
        horseNameEn: '',
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

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden font-sans">
            <div className="w-full md:w-96 bg-white border-r border-gray-200 overflow-y-auto p-6 space-y-6">
                <div>
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">{t('departureReport')}</h2>
                    <p className="text-xs text-gray-400 mt-1">{language === 'ja' ? '退厩レポート用の入力欄' : 'Fields for departure report.'}</p>
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

            <div className="flex-1 min-h-0 bg-[#525659] p-4 md:p-8 overflow-y-auto flex justify-center items-start h-full print:bg-white print:p-0 print:overflow-hidden">
                <div
                    id="report-preview"
                    className="bg-white shadow-2xl w-[210mm] min-h-[297mm] p-8 text-gray-900 font-sans"
                >
                    <div className="flex justify-between items-end border-b border-gray-300 pb-3 mb-4">
                        <div className="text-xl font-bold text-[#1a3c34]">{t('departureReport')}</div>
                        <div className="text-sm text-gray-500">{data.reportDate || '-'}</div>
                    </div>

                    <section className="mb-6">
                        <div className="text-sm font-bold text-gray-500 mb-2">JP</div>
                        <div className="text-[15px] leading-7">
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

                    <section>
                        <div className="text-sm font-bold text-gray-500 mb-2">EN</div>
                        <div className="text-[15px] leading-7">
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
                </div>
            </div>
        </div>
    );
}
