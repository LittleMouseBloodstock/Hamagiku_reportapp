'use client';
import React, { useState, useEffect } from 'react';
import { Printer, RefreshCw, ChevronRight, FileText, Image as ImageIcon, Activity, Globe } from 'lucide-react';

// Google Fonts Component
const Fonts = () => (
    <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+JP:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
    
    .font-serif-en { font-family: 'Playfair Display', serif; }
    .font-body-en { font-family: 'Cormorant Garamond', serif; }
    .font-serif-jp { font-family: 'Noto Serif JP', serif; }
    
    /* Print Settings */
    @media print {
      @page { size: A4; margin: 0; }
      body { -webkit-print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-area { 
        width: 210mm; 
        height: 297mm; 
        position: absolute; 
        top: 0; 
        left: 0; 
        margin: 0; 
        padding: 0;
        box-shadow: none;
        overflow: hidden;
      }
    }
  `}</style>
);

// Simple Line Chart Component
const SimpleLineChart = ({ data, color }: { data: { label: string, value: number }[], color: string }) => {
    const width = 200;
    const height = 100;
    const padding = 20;

    if (!data || data.length < 2) return null;

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - padding * 2);
        const y = height - padding - ((d.value - minVal) / range) * (height - padding * 2);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {/* Grid Lines */}
            <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#E5E7EB" strokeWidth="1" />
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#E5E7EB" strokeWidth="1" />

            {/* Polyline */}
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Markers & Labels */}
            {data.map((d, i) => {
                const x = padding + (i / (data.length - 1)) * (width - padding * 2);
                const y = height - padding - ((d.value - minVal) / range) * (height - padding * 2);
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" />
                        <text x={x} y={height} dy="12" textAnchor="middle" fontSize="8" fill="#6B7280" className="font-body-en">{d.label}</text>
                        <text x={x} y={y} dy="-8" textAnchor="middle" fontSize="8" fill={color} fontWeight="bold" className="font-body-en">{d.value}</text>
                    </g>
                );
            })}
        </svg>
    );
};

export type ReportData = {
    reportDate: string;
    horseNameEn: string;
    horseNameJp: string;
    sire: string;
    dam: string;
    mainPhoto: string;
    statusEn: string;
    statusJp: string;
    weight: string;
    targetEn: string;
    targetJp: string;
    commentEn: string;
    commentJp: string;
    weightHistory: { label: string, value: number }[];
    logo: string | null; // Kept for interface compatibility, mostly unused in new design/fixed logo
};

interface ReportTemplateProps {
    initialData?: Partial<ReportData>;
    onDataChange?: (data: ReportData) => void;
}

export default function ReportTemplate({ initialData, onDataChange }: ReportTemplateProps) {
    // Default Data
    const defaultData: ReportData = {
        reportDate: new Date().toISOString().slice(0, 7).replace('-', '.'), // yyyy.MM
        horseNameEn: 'Hamagiku Vega',
        horseNameJp: 'ハマギクベガ',
        sire: 'Lucky Vega',
        dam: 'Xmas',
        mainPhoto: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80',
        statusEn: 'Training',
        statusJp: '坂路入り',
        weight: '423kg',
        targetEn: 'Debut',
        targetJp: 'デビュー戦',
        commentEn: 'Arrived at the farm on Dec. 16th to commence breaking and pre-training. The breaking process progressed smoothly...',
        commentJp: '12月16日に牧場に到着し、馴致とプレトレーニングを開始しました。順調に進んでいます。',
        weightHistory: [
            { label: '10月', value: 418 },
            { label: '11月', value: 420 },
            { label: '12月', value: 423 },
            { label: '01月', value: 425 },
        ],
        logo: null
    };

    const [data, setData] = useState<ReportData>({ ...defaultData, ...initialData });

    // Sync back to parent
    useEffect(() => {
        if (onDataChange) {
            onDataChange(data);
        }
    }, [data, onDataChange]);

    // Handle initialData updates from parent
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            setData((prev) => {
                // Simple check to avoid update if no change (shallow)
                if (JSON.stringify(prev) === JSON.stringify({ ...prev, ...initialData })) return prev;
                return { ...prev, ...initialData };
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);


    // Demo Translation (Mock)
    const handleTranslateDemo = () => {
        setData(prev => ({
            ...prev,
            commentJp: "（AI翻訳）此れはデモです。" + prev.commentEn
        }));
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setData(prev => ({ ...prev, mainPhoto: e.target?.result as string }));
            reader.readAsDataURL(file);
        }
    };

    // Color Palette
    const colors = {
        darkGreen: '#1B3226',
        limeGreen: '#8CC63F',
        lightGray: '#F9FAFB',
        textDark: '#111827',
        textGray: '#4B5563',
    };

    return (
        <div className="flex flex-col md:flex-row font-sans text-gray-800 bg-gray-100 min-h-screen">
            <Fonts />

            {/* --- Left Side: Input Panel (Hidden on Print) --- */}
            <div className="w-full md:w-1/3 lg:w-96 bg-white border-r border-gray-200 shadow-lg overflow-y-auto max-h-screen sticky top-0 no-print z-10">
                <div className="p-6 bg-[#1B3226] text-white">
                    <h1 className="text-xl font-serif-en font-bold flex items-center gap-2">
                        <Activity size={20} className="text-[#8CC63F]" />
                        Report Builder
                    </h1>
                    <p className="text-xs text-gray-300 mt-1">Hamagiku Farm Official Tool</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <section>
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <FileText size={16} /> Basic Info
                        </h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Report Date</label>
                                <input
                                    type="text"
                                    value={data.reportDate}
                                    onChange={e => setData({ ...data, reportDate: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1B3226] focus:ring focus:ring-[#1B3226] focus:ring-opacity-20 bg-gray-50 px-3 py-2 text-sm"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Horse Name (EN)</label>
                                    <input
                                        type="text"
                                        value={data.horseNameEn}
                                        onChange={e => setData({ ...data, horseNameEn: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1B3226] focus:ring focus:ring-[#1B3226] focus:ring-opacity-20 bg-gray-50 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Horse Name (JP)</label>
                                    <input
                                        type="text"
                                        value={data.horseNameJp}
                                        onChange={e => setData({ ...data, horseNameJp: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#1B3226] focus:ring focus:ring-[#1B3226] focus:ring-opacity-20 bg-gray-50 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Sire (父)</label>
                                    <input
                                        type="text"
                                        value={data.sire}
                                        onChange={e => setData({ ...data, sire: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700">Dam (母)</label>
                                    <input
                                        type="text"
                                        value={data.dam}
                                        onChange={e => setData({ ...data, dam: e.target.value })}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Photo */}
                    <section>
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <ImageIcon size={16} /> Photo
                        </h2>
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Image URL / Upload</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={data.mainPhoto.startsWith('data:') ? '(Base64 Data)' : data.mainPhoto}
                                    readOnly
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 px-3 py-2 text-sm truncate text-gray-500"
                                />
                                <label className="mt-1 cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm flex items-center">
                                    <ImageIcon size={16} />
                                    <input type="file" onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                                </label>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">※横長の高解像度写真を推奨</p>
                        </div>
                    </section>

                    {/* Status & Stats */}
                    <section>
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Activity size={16} /> Status & Stats
                        </h2>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Status (EN)</label>
                                <input type="text" value={data.statusEn} onChange={e => setData({ ...data, statusEn: e.target.value })} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Status (JP)</label>
                                <input type="text" value={data.statusJp} onChange={e => setData({ ...data, statusJp: e.target.value })} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Current Weight</label>
                                <input type="text" value={data.weight} onChange={e => setData({ ...data, weight: e.target.value })} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Target (JP/Mix)</label>
                                <input type="text" value={data.targetJp} onChange={e => setData({ ...data, targetJp: e.target.value })} className="mt-1 w-full border rounded px-2 py-1 text-sm" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Weight History (Graph Data)</label>
                            {data.weightHistory.map((item, index) => (
                                <div key={index} className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={item.label}
                                        onChange={e => {
                                            const newHist = [...data.weightHistory];
                                            newHist[index].label = e.target.value;
                                            setData({ ...data, weightHistory: newHist });
                                        }}
                                        className="w-16 border rounded px-2 py-1 text-sm text-center"
                                    />
                                    <input
                                        type="number"
                                        value={item.value}
                                        onChange={e => {
                                            const newHist = [...data.weightHistory];
                                            newHist[index].value = parseInt(e.target.value) || 0;
                                            setData({ ...data, weightHistory: newHist });
                                        }}
                                        className="w-20 border rounded px-2 py-1 text-sm"
                                    />
                                    <span className="text-xs self-center">kg</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Comments */}
                    <section>
                        <div className="flex justify-between items-center mb-3">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                                <Globe size={16} /> Comments
                            </h2>
                            <button
                                onClick={handleTranslateDemo}
                                className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center gap-1 transition-colors"
                            >
                                <RefreshCw size={12} /> Auto Translate
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-700">English Comment</label>
                                <textarea
                                    rows={4}
                                    value={data.commentEn}
                                    onChange={e => setData({ ...data, commentEn: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm leading-relaxed"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700">Japanese Translation</label>
                                <textarea
                                    rows={4}
                                    value={data.commentJp}
                                    onChange={e => setData({ ...data, commentJp: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm leading-relaxed"
                                />
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* --- Right Side: Preview Area (Only this is shown in Print) --- */}
            <div className="flex-1 p-8 overflow-auto flex justify-center print:bg-white print:p-0 print:block bg-gray-200">

                {/* A4 Container */}
                <div className="print-area bg-white shadow-2xl mx-auto flex flex-col relative"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        padding: '12mm 15mm'
                    }}>

                    {/* Header Area */}
                    <header className="flex flex-col items-center mb-8">
                        {/* Logo Image */}
                        <div className="mb-4 relative w-[80px] h-[80px]">
                            <img
                                src="/HamagikuLogoSVG.svg"
                                alt="Hamagiku Farm Logo"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        <h1 className="text-3xl font-serif-en tracking-widest text-[#1B3226] font-bold uppercase mb-1">
                            Hamagiku Farm
                        </h1>
                        <div className="flex items-center gap-4 text-xs font-serif-en text-gray-400 tracking-[0.2em] uppercase">
                            <span>Monthly Report</span>
                            <span className="w-1 h-1 rounded-full bg-[#8CC63F]"></span>
                            <span>{data.reportDate}</span>
                        </div>
                    </header>

                    {/* Horse Profile */}
                    <div className="mb-6 text-center">
                        <h2 className="text-4xl font-serif-en text-[#1B3226] font-bold mb-1">{data.horseNameEn}</h2>
                        <p className="text-lg font-serif-jp text-gray-500 mb-4">{data.horseNameJp}</p>

                        <div className="inline-flex items-center justify-center gap-8 border-y border-gray-100 py-2 px-8">
                            <div className="text-center">
                                <span className="block text-[10px] uppercase text-gray-400 font-sans tracking-wider">Sire</span>
                                <span className="block font-serif-en text-lg text-[#1B3226]">{data.sire}</span>
                            </div>
                            <div className="h-8 w-px bg-gray-200 rotate-12"></div>
                            <div className="text-center">
                                <span className="block text-[10px] uppercase text-gray-400 font-sans tracking-wider">Dam</span>
                                <span className="block font-serif-en text-lg text-[#1B3226]">{data.dam}</span>
                            </div>
                        </div>
                    </div>

                    {/* Main Photo */}
                    <div className="w-full h-80 mb-8 rounded-sm overflow-hidden shadow-sm relative group bg-gray-100">
                        <img
                            src={data.mainPhoto}
                            alt={data.horseNameEn}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 border border-black/5 pointer-events-none"></div>
                    </div>

                    {/* Status & Graph Area */}
                    <div className="grid grid-cols-12 gap-8 mb-10">
                        {/* Left: Status Cards (4 cols) */}
                        <div className="col-span-5 grid grid-cols-2 gap-3">
                            {/* Status Card */}
                            <div className="bg-[#F9FAFB] p-3 rounded border border-gray-100 flex flex-col items-center justify-center aspect-square text-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Status</span>
                                <span className="font-serif-jp text-lg font-bold text-[#1B3226] leading-tight">{data.statusJp}</span>
                                <span className="text-xs text-[#8CC63F] font-serif-en mt-1">{data.statusEn}</span>
                            </div>

                            {/* Weight Card */}
                            <div className="bg-[#F9FAFB] p-3 rounded border border-gray-100 flex flex-col items-center justify-center aspect-square text-center">
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">Weight</span>
                                <span className="font-serif-en text-2xl font-bold text-[#1B3226]">{data.weight}</span>
                            </div>

                            {/* Training/Target Card */}
                            <div className="bg-[#F9FAFB] p-3 rounded border border-gray-100 flex flex-col items-center justify-center aspect-square col-span-2 flex-row gap-4 text-center">
                                <div>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-widest block">Next Target</span>
                                    <span className="font-serif-jp text-lg font-bold text-[#1B3226] mt-1">{data.targetJp}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right: Graph Area (7 cols) */}
                        <div className="col-span-7 flex flex-col justify-between">
                            <div className="flex justify-between items-end mb-2 border-b border-gray-100 pb-2">
                                <h3 className="text-sm font-serif-en font-bold text-[#1B3226] uppercase tracking-widest">Weight Progression</h3>
                                <span className="text-xs text-[#8CC63F] font-serif-en">Recent 4 Months</span>
                            </div>
                            <div className="flex-1 bg-white relative">
                                <SimpleLineChart data={data.weightHistory} color={colors.limeGreen} />
                            </div>
                        </div>
                    </div>

                    {/* Comment Area */}
                    <div className="flex-1">
                        <div className="border-t-2 border-[#1B3226] mb-4"></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* English Comment */}
                            <div>
                                <h4 className="text-xs font-bold text-[#8CC63F] uppercase tracking-widest mb-3 flex items-center gap-2">
                                    Manager&apos;s Comment
                                </h4>
                                <p className="font-body-en text-lg text-gray-700 leading-relaxed italic">
                                    &quot;{data.commentEn}&quot;
                                </p>
                            </div>

                            {/* Japanese Comment */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    牧場長コメント
                                </h4>
                                <p className="font-serif-jp text-sm text-gray-600 leading-8 text-justify">
                                    {data.commentJp}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="mt-auto pt-8 border-t border-gray-100 flex justify-between items-end">
                        <div className="text-[10px] text-gray-400 font-sans tracking-wider">
                            CONFIDENTIAL REPORT FOR OWNERS
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-serif-en font-bold text-[#1B3226]">HAMAGIKU FARM</div>
                            <div className="text-[10px] text-gray-400 tracking-widest">www.hamagikufarm.com</div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
}
