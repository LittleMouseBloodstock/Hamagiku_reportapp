'use client';
import React, { useState, useEffect } from 'react';
import WeightChart from './WeightChart';
import { Camera } from 'lucide-react';

export type ReportData = {
    horseName: string;
    horseNameEn: string;
    sire: string;
    dam: string;
    comment: string;
    weight: string;
    training: string;
    condition: string;
    target: string;
    mainPhoto: string;
    logo: string | null;
};

interface ReportTemplateProps {
    initialData?: Partial<ReportData>;
    onDataChange?: (data: ReportData) => void;
}

export default function ReportTemplate({ initialData, onDataChange }: ReportTemplateProps) {
    // State initialization with defaults or props
    const [logo, setLogo] = useState<string | null>(initialData?.logo || null);
    const [mainPhoto, setMainPhoto] = useState<string>(initialData?.mainPhoto || "https://images.unsplash.com/photo-1551884831-bbf3ddd77535?q=80&w=2070&auto=format&fit=crop");
    const [horseName, setHorseName] = useState(initialData?.horseName || "テンコーウィナー");
    const [horseNameEn, setHorseNameEn] = useState(initialData?.horseNameEn || "TENKO WINNER");
    const [sire, setSire] = useState(initialData?.sire || "Epiphaneia");
    const [dam, setDam] = useState(initialData?.dam || "Gemini Heroine");
    const [comment, setComment] = useState(initialData?.comment || "今月は重点的にトモの強化を図り...");
    const [weight, setWeight] = useState(initialData?.weight || "482 kg");
    const [training, setTraining] = useState(initialData?.training || "坂路 15-15");
    const [condition, setCondition] = useState(initialData?.condition || "Good");
    const [target, setTarget] = useState(initialData?.target || "3月 中山");

    // Sync back to parent when any state changes
    useEffect(() => {
        if (onDataChange) {
            onDataChange({
                horseName, horseNameEn, sire, dam, comment,
                weight, training, condition, target,
                mainPhoto, logo
            });
        }
    }, [horseName, horseNameEn, sire, dam, comment, weight, training, condition, target, mainPhoto, logo]);

    // File Handlers
    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setLogo(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setMainPhoto(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="a4-page shadow-2xl mx-auto bg-white relative overflow-hidden">
            {/* Header */}
            <header className="flex justify-between border-b-2 border-[var(--color-accent)] pb-4 mb-6">
                <div className="flex items-center group relative cursor-pointer">
                    <label htmlFor="logo-upload" className="flex items-center cursor-pointer">
                        {logo ? (
                            <img src={logo} alt="Logo" className="max-h-[50px] max-w-[180px] object-contain mr-2.5" />
                        ) : (
                            <div className="logo-text font-bold text-[var(--color-primary)] tracking-widest text-lg" id="farmNameText">
                                GEMINI STABLE
                            </div>
                        )}
                        {/* Hover Hint for Logo */}
                        <div className="absolute inset-0 bg-white/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-[var(--color-primary)] font-bold transition-opacity no-print">
                            Change Logo
                        </div>
                    </label>
                    <input type="file" onChange={handleLogoUpload} className="hidden" id="logo-upload" accept="image/*" />
                </div>
                <div className="font-cormorant text-3xl text-[var(--color-primary)]">MONTHLY REPORT</div>
            </header>

            {/* Horse Profile */}
            <div className="flex justify-between items-end mb-5">
                <div>
                    <div
                        className="font-shippori text-3xl font-bold text-[var(--color-primary)] outline-none focus:bg-yellow-50 focus:outline-dashed focus:outline-1 focus:outline-gray-300"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setHorseName(e.currentTarget.innerText)}
                    >
                        {horseName}
                    </div>
                    <div
                        className="font-cormorant text-[var(--color-accent)] text-lg outline-none focus:bg-yellow-50"
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => setHorseNameEn(e.currentTarget.innerText)}
                    >
                        {horseNameEn}
                    </div>
                </div>
                <div className="text-[15px] text-gray-500 bg-[var(--color-light-bg)] px-4 py-2 border-l-4 border-[var(--color-primary)] font-noto">
                    <span className="font-bold mr-1">Sire:</span> <span contentEditable suppressContentEditableWarning>Epiphaneia</span>
                    <span className="mx-2">×</span>
                    <span className="font-bold mr-1">Dam:</span> <span contentEditable suppressContentEditableWarning>Gemini Heroine</span>
                </div>
            </div>

            {/* Main Photo */}
            <div className="relative group mb-6">
                <img src={mainPhoto} alt="Main" className="w-full h-[380px] object-cover rounded-sm bg-gray-100" />
                {/* Overlay for Photo Upload hint (Visible on Hover) */}
                <label htmlFor="photo-upload" className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer no-print">
                    <div className="bg-white/90 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg">
                        <Camera size={18} /> Change Photo
                    </div>
                    <input type="file" id="photo-upload" onChange={handlePhotoUpload} className="hidden" accept="image/*" />
                </label>
            </div>

            {/* Data Section */}
            <div className="flex gap-8 mb-6 h-[220px]">
                {/* Stats Grid */}
                {/* Stats Grid */}
                <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2.5">
                    <StatBox label="Current Weight" value={weight} onChange={setWeight} highlight />
                    <StatBox label="Training" value={training} onChange={setTraining} />
                    <StatBox label="Condition" value={condition} onChange={setCondition} />
                    <StatBox label="Target" value={target} onChange={setTarget} highlight />
                </div>

                {/* Chart */}
                <div className="flex-[1.2] relative">
                    <span className="block text-xs font-bold text-[var(--color-primary)] border-b border-gray-200 mb-1 pb-1">WEIGHT HISTORY</span>
                    <WeightChart />
                </div>
            </div>

            {/* Comment Section */}
            <div className="border border-gray-200 p-5 relative bg-white min-h-[120px]">
                <span className="absolute -top-3 left-5 bg-white px-2 font-cormorant font-bold text-[var(--color-primary)]">
                    TRAINER&apos;S COMMENT
                </span>
                <div
                    className="text-[13px] leading-relaxed text-justify whitespace-pre-wrap outline-none focus:bg-yellow-50 min-h-[80px]"
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(e) => setComment(e.currentTarget.innerText)}
                >
                    {comment}
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-8 left-0 right-0 text-center text-[10px] text-gray-400 font-cormorant tracking-widest">
                GEMINI STABLE & FARM - FUKUSHIMA, JAPAN | 2026.01.14
            </footer>
        </div>
    );
}

function StatBox({ label, value, onChange, highlight = false }: { label: string, value: string, onChange?: (val: string) => void, highlight?: boolean }) {
    return (
        <div className={`stat-box ${highlight ? 'border-t-[var(--color-accent)]' : 'border-t-gray-300'}`}>
            <span className="text-[11px] text-gray-500 uppercase mb-1 block">{label}</span>
            <span
                className="font-cormorant text-2xl font-bold text-[var(--color-primary)] outline-none focus:bg-yellow-50 block"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => onChange && onChange(e.currentTarget.innerText)}
            >
                {value}
            </span>
        </div>
    );
}
