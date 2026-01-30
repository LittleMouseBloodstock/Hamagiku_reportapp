'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { FileText, Image as ImageIcon, Activity, Globe, Crop, X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { useLanguage } from '../contexts/LanguageContext';

// Google Fonts Component
const Fonts = () => (
    <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Noto+Serif+JP:wght@300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
    
    .font-serif-en { font-family: 'Playfair Display', serif; }
    .font-body-en { font-family: 'Cormorant Garamond', serif; }
    .font-serif-jp { font-family: 'Noto Serif JP', serif; }
    
    /* Print Settings */
    @media print {
      @page { size: A4; margin: 10mm 0 0 0; }
      
      /* NUCLEAR OPTION: Hide everything by default using visibility */
      body * {
        visibility: hidden;
      }
      
      /* Show ONLY the report preview and its children */
      #report-preview, #report-preview * {
        visibility: visible;
      }
      
      /* Position the preview specifically for print */
      #report-preview {
        position: absolute !important; /* Fixed causes repetition on every page, Absolute prints once */
        top: 0 !important;
        left: 0 !important;
        width: 210mm !important;
        height: 285mm !important; /* Slightly taller to prevent bottom clipping */
        min-height: 0 !important; /* Override inline min-height to prevent overflow */
        margin: 0 !important;
        padding: 32px 30px 8px 30px !important;
        background-color: white !important;
        z-index: 2147483647 !important; /* Max Z-Index */
        overflow: hidden !important;
        box-shadow: none !important;
        transform: none !important;
        border: none !important;
      }

      #report-preview.print-mode {
        top: 20mm !important;
        height: 257mm !important;
      }

      /* Print Mode Compression */
      #report-preview.print-mode .report-header {
        height: 120px !important;
        padding-top: 6px !important;
        margin-bottom: 6px !important;
      }

      #report-preview.print-mode .owner-line {
        margin-bottom: 6px !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        font-size: 11px !important;
      }

      #report-preview.print-mode .main-photo {
        width: 80% !important;
        margin-bottom: 8px !important;
      }

      #report-preview.print-mode .data-section {
        height: 105px !important;
        margin-bottom: 6px !important;
        gap: 14px !important;
      }

      #report-preview.print-mode .comment-box {
        margin-top: 8px !important;
        min-height: 110px !important;
        padding: 14px !important;
      }

      #report-preview.print-mode .comment-text {
        font-size: 12px !important;
        line-height: 1.6 !important;
      }

      #report-preview.print-mode .footer-text {
        margin-top: 4px !important;
        font-size: 9px !important;
      }

      /* Logo Fix: Clip ALL edges to remove mystery line */
      .logo-container {
         clip-path: inset(1px); /* Cut 1px from all sides */
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
                        <text x={x} y={height} dy="12" textAnchor="middle" fontSize="11" fill="#6B7280" className="font-body-en" fontWeight="bold">{d.label}</text>
                        <text x={x} y={y} dy="-8" textAnchor="middle" fontSize="12" fill={color} fontWeight="bold" className="font-body-en">{d.value}</text>
                    </g>
                );
            })}
        </svg>
    );
};

type OptionPair = { en: string; ja: string; };

const DEFAULT_TRAINING_OPTIONS: OptionPair[] = [
    { en: 'Training', ja: 'トレーニング' },
    { en: 'Rest', ja: '休養' },
    { en: 'Injured', ja: '怪我' },
    { en: 'Breaking', ja: '馴致' },
    { en: 'Growing', ja: '放牧中' },
];

const DEFAULT_CONDITION_OPTIONS: OptionPair[] = [
    { en: 'Good', ja: '良好' },
    { en: 'Light', ja: 'やや痩せ気味' },
    { en: 'Leggy', ja: '肢長' },
    { en: 'Fatty', ja: '肥満' },
];

const formatDateUK = (dateStr: string) => {
    if (!dateStr) return '';
    // Handle YYYY.MM or YYYY.MM.DD
    const parts = dateStr.replace(/-/g, '.').split('.');

    // Fallback if not matching format
    if (parts.length < 2) return dateStr;

    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parts[2] ? parseInt(parts[2]) : null;

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return dateStr;

    const date = new Date(year, month - 1, day || 1);
    const monthName = date.toLocaleString('en-GB', { month: 'long' });

    if (day) {
        return `${day} ${monthName} ${year}`;
    }
    return `${monthName} ${year}`;
};

const formatReportMonth = (dateStr: string, lang: 'ja' | 'en') => {
    if (!dateStr) return '';
    const parts = dateStr.replace(/-/g, '.').split('.');
    if (parts.length < 2) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) return dateStr;
    if (lang === 'ja') return `${year}年${month}月`;
    const date = new Date(year, month - 1, 1);
    const monthName = date.toLocaleString('en-GB', { month: 'long' });
    return `${monthName} ${year}`;
};

export type ReportData = {
    reportDate: string;
    horseNameEn: string;
    horseNameJp: string;
    sire: string;
    sireEn?: string;
    sireJp?: string;
    dam: string;
    damEn?: string;
    damJp?: string;
    ownerName?: string;
    trainerNameJp?: string;
    trainerNameEn?: string;
    trainerLocation?: string;
    birthDate?: string;
    age?: number | null;
    outputMode?: 'pdf' | 'print';
    mainPhoto: string;
    // statusEn/Jp deprecated but kept for compatibility if needed, prefer trainingStatus
    statusEn?: string;
    statusJp?: string;
    trainingStatusEn: string;
    trainingStatusJp: string;
    conditionEn: string;
    conditionJp: string;
    weight: string;
    targetEn: string;
    targetJp: string;
    commentEn: string;
    commentJp: string;
    weightHistory: { label: string, value: number }[];
    logo: string | null;
    originalPhoto?: string | null; // Keep original for re-cropping
};

// --- Utility: Create Cropped Image ---
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const image = new window.Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
    });

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error('Canvas is empty'));
                return;
            }
            resolve(window.URL.createObjectURL(blob));
        }, 'image/jpeg');
    });
}

interface ReportTemplateProps {
    initialData?: Partial<ReportData>;
    onDataChange?: (data: ReportData) => void;
    readOnly?: boolean;
}

export default function ReportTemplate({ initialData, onDataChange, readOnly = false }: ReportTemplateProps) {
    const { t, language } = useLanguage();
    const lang = language;
    const formatOwnerName = (name?: string) => {
        if (!name) return '-';
        if (lang !== 'ja') return name;
        return name.endsWith('様') ? name : `${name}様`;
    };
    // Default Data
    const defaultData: ReportData = {
        reportDate: '', // Set in useEffect to avoid hydration mismatch
        horseNameEn: 'Hamagiku Vega',
        horseNameJp: 'ハマギクベガ',
        sire: 'Lucky Vega',
        dam: 'Xmas',
        ownerName: '',
        trainerNameJp: '',
        trainerNameEn: '',
        trainerLocation: '',
        birthDate: '',
        age: null,
        outputMode: 'pdf',
        mainPhoto: '',
        originalPhoto: '',
        trainingStatusEn: 'Training',
        trainingStatusJp: 'トレーニング',
        conditionEn: 'Good',
        conditionJp: '良好',
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
    const isPrintMode = data.outputMode === 'print';

    // --- Cropper State ---
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });

    // --- Options State (LocalStorage) ---
    const [trainingOptions, setTrainingOptions] = useState<OptionPair[]>(DEFAULT_TRAINING_OPTIONS);
    const [conditionOptions, setConditionOptions] = useState<OptionPair[]>(DEFAULT_CONDITION_OPTIONS);

    useEffect(() => {
        const savedTraining = localStorage.getItem('trainingOptions');
        const savedCondition = localStorage.getItem('conditionOptions');
        if (savedTraining) setTrainingOptions(JSON.parse(savedTraining));
        if (savedCondition) setConditionOptions(JSON.parse(savedCondition));

        // Set Date if empty (Hydration Fix)
        if (!data.reportDate) {
            setData(prev => ({ ...prev, reportDate: new Date().toISOString().slice(0, 7).replace('-', '.') }));
        }
    }, [data.reportDate]);

    const saveOption = (type: 'training' | 'condition', pair: OptionPair) => {
        if (type === 'training') {
            const newOpts = [...trainingOptions, pair];
            setTrainingOptions(newOpts);
            localStorage.setItem('trainingOptions', JSON.stringify(newOpts));
        } else {
            const newOpts = [...conditionOptions, pair];
            setConditionOptions(newOpts);
            localStorage.setItem('conditionOptions', JSON.stringify(newOpts));
        }
    };

    // --- AI & Translation Logic ---
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');

    const handleGenerateComment = async () => {
        if (!aiPrompt) return;
        setIsGenerating(true);
        try {
            const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080').replace(/\/$/, '');
            const res = await fetch(`${baseUrl}/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt })
            });

            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errorText}`);
            }

            const json = await res.json();
            if (json.en && json.ja) {
                setData(prev => ({ ...prev, commentEn: json.en, commentJp: json.ja }));
            }
        } catch (e) {
            console.error(e);
            alert("AI Generation failed:\n" + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleTranslateName = async (name: string, field: 'sire' | 'dam', targetLang: 'ja' | 'en') => {
        if (!name) return;
        try {
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/translate-name`;
            console.log('Translating:', name, 'to', targetLang, 'at', apiUrl);
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, targetLang })
            });
            const json = await res.json();
            if (json.translatedName) {
                const targetKey = field === 'sire'
                    ? (targetLang === 'ja' ? 'sireJp' : 'sireEn')
                    : (targetLang === 'ja' ? 'damJp' : 'damEn');

                setData(prev => ({ ...prev, [targetKey]: json.translatedName }));
            }
        } catch (e) {
            console.error(e);
            alert("Name Translation Failed: " + e);
        }
    };


    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isCropping, setIsCropping] = useState(false);
    const [tempImgSrc, setTempImgSrc] = useState<string | null>(null);

    const onCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCropper = (imgSrc: string) => {
        setTempImgSrc(imgSrc);
        setIsCropping(true);
        setZoom(1);
        setCrop({ x: 0, y: 0 });
    };

    const handleCropSave = async () => {
        if (tempImgSrc && croppedAreaPixels) {
            try {
                const croppedImage = await getCroppedImg(tempImgSrc, croppedAreaPixels);
                setData(prev => ({ ...prev, mainPhoto: croppedImage }));
                setIsCropping(false);
                setTempImgSrc(null);
            } catch (e) {
                console.error(e);
            }
        }
    };

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

    }, [initialData]);

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const result = e.target?.result as string;
                if (result) {
                    // Update both main and original
                    setData(prev => ({
                        ...prev,
                        mainPhoto: result,
                        originalPhoto: result
                    }));
                    // Start cropper flow with uploaded image
                    showCropper(result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden font-sans">
            <Fonts />
            {/* Cropper Modal */}
            {isCropping && tempImgSrc && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><Crop size={18} /> Edit Photo</h3>
                            <button onClick={() => setIsCropping(false)} className="text-gray-500 hover:text-red-500 transition-colors">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="relative flex-1 bg-black min-h-[400px]">
                            <Cropper
                                image={tempImgSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={4 / 3} // iPhone Landscape (4:3)
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className="p-4 bg-gray-50 border-t flex items-center gap-4">
                            <span className="text-xs font-bold text-gray-500">Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <button
                                onClick={handleCropSave}
                                className="bg-[#1B3226] hover:bg-[#2a4c3a] text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
                            >
                                <Check size={18} /> Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Left Side: Input Panel (Hidden on Print OR readOnly) --- */}
            {!readOnly && (
                <div className="w-full md:w-1/3 lg:w-96 bg-white border-r border-gray-200 shadow-lg overflow-y-auto h-full flex-shrink-0 no-print z-20">
                    <div className="p-6 bg-[#1B3226] text-white sticky top-0 z-10">
                        <h1 className="text-xl font-serif-en font-bold flex items-center gap-2">
                            <Activity size={20} className="text-[#8CC63F]" />
                            Report Builder
                        </h1>

                        <p className="text-xs text-gray-300 mt-1">Hamagiku Farm Official Tool</p>
                    </div>

                    <div className="p-6 space-y-8 pb-48">
                        {/* Basic Info */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                                <FileText size={16} /> {t('basicInfo')}
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('reportDate')}</label>
                                    <input
                                        type="text"
                                        value={data.reportDate}
                                        onChange={e => setData({ ...data, reportDate: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1B3226] focus:ring focus:ring-[#1B3226] focus:ring-opacity-20 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('horseName')} (EN)</label>
                                        <input
                                            type="text"
                                            value={data.horseNameEn}
                                            onChange={e => setData({ ...data, horseNameEn: e.target.value })}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1B3226] focus:ring focus:ring-[#1B3226] focus:ring-opacity-20 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('horseName')} (JP)</label>
                                        <input
                                            type="text"
                                            value={data.horseNameJp}
                                            onChange={e => setData({ ...data, horseNameJp: e.target.value })}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-[#1B3226] focus:ring focus:ring-[#1B3226] focus:ring-opacity-20 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                        />
                                    </div>
                                </div>

                                {/* Sire (Multilingual) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('sire')} (EN)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={data.sireEn || data.sire} // Fallback
                                                onChange={e => setData({ ...data, sireEn: e.target.value })}
                                                onBlur={(e) => handleTranslateName(e.target.value, 'sire', 'ja')}
                                                className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900 pr-6"
                                                placeholder="Auto-translates to JP"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('sire')} (JP)</label>
                                        <input
                                            type="text"
                                            value={data.sireJp || ''}
                                            onChange={e => setData({ ...data, sireJp: e.target.value })}
                                            onBlur={(e) => handleTranslateName(e.target.value, 'sire', 'en')}
                                            className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                            placeholder="Auto-translates to EN"
                                        />
                                    </div>
                                </div>

                                {/* Dam (Multilingual) */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('dam')} (EN)</label>
                                        <input
                                            type="text"
                                            value={data.damEn || data.dam} // Fallback
                                            onChange={e => setData({ ...data, damEn: e.target.value })}
                                            onBlur={(e) => handleTranslateName(e.target.value, 'dam', 'ja')}
                                            className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                            placeholder="Auto-translates to JP"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('dam')} (JP)</label>
                                        <input
                                            type="text"
                                            value={data.damJp || ''}
                                            onChange={e => setData({ ...data, damJp: e.target.value })}
                                            onBlur={(e) => handleTranslateName(e.target.value, 'dam', 'en')}
                                            className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                            placeholder="Auto-translates to EN"
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Photo */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                                <ImageIcon size={16} /> {t('photo')}
                            </h2>
                            <div className="space-y-3">
                                <label className="block text-xs font-medium text-gray-700">{t('selectImage')}</label>

                                {/* Current Image Preview & Edit Button */}
                                {data.mainPhoto && (
                                    <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 group mb-2">
                                        <Image
                                            src={data.mainPhoto}
                                            alt="Current"
                                            fill
                                            className="object-cover"
                                            unoptimized
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                                            <button
                                                // Always try to use original photo for re-cropping to allow full reset
                                                onClick={() => showCropper(data.originalPhoto || data.mainPhoto)}
                                                className="opacity-0 group-hover:opacity-100 bg-white text-gray-800 px-3 py-1 rounded-full text-xs font-bold shadow-sm transition-all transform scale-95 group-hover:scale-100 flex items-center gap-1"
                                            >
                                                <Crop size={12} /> Edit / Crop
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-12 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex items-center gap-2">
                                            <ImageIcon className="w-4 h-4 text-gray-400" />
                                            <span className="text-xs text-gray-500 font-semibold">{t('uploadNewPhoto')}</span>
                                        </div>
                                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Status & Stats */}
                        <section>
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2 border-b pb-2">
                                <Activity size={16} /> {t('statusStats')}
                            </h2>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                {/* Training Status Dropdown & Inputs */}
                                <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-200">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('training')}</label>
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            className="w-full text-xs border-gray-300 rounded text-gray-900 font-medium"
                                            onChange={(e) => {
                                                const idx = parseInt(e.target.value);
                                                if (!isNaN(idx) && trainingOptions[idx]) {
                                                    setData({ ...data, trainingStatusEn: trainingOptions[idx].en, trainingStatusJp: trainingOptions[idx].ja });
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Select Status...</option>
                                            {trainingOptions.map((opt, i) => (
                                                <option key={i} value={i}>{opt.en} / {opt.ja}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => saveOption('training', { en: data.trainingStatusEn, ja: data.trainingStatusJp })}
                                            className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 rounded shadow-sm"
                                            title="Save current inputs to list"
                                        >
                                            + Save
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="EN"
                                            value={data.trainingStatusEn}
                                            onChange={e => setData({ ...data, trainingStatusEn: e.target.value })}
                                            className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                        />
                                        <input
                                            type="text"
                                            placeholder="JP"
                                            value={data.trainingStatusJp}
                                            onChange={e => setData({ ...data, trainingStatusJp: e.target.value })}
                                            className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                        />
                                    </div>
                                </div>

                                {/* Condition Dropdown & Inputs */}
                                <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-200">
                                    <label className="block text-xs font-bold text-gray-700 mb-1">{t('condition')}</label>
                                    <div className="flex gap-2 mb-2">
                                        <select
                                            className="w-full text-xs border-gray-300 rounded text-gray-900 font-medium"
                                            onChange={(e) => {
                                                const idx = parseInt(e.target.value);
                                                if (!isNaN(idx) && conditionOptions[idx]) {
                                                    setData({ ...data, conditionEn: conditionOptions[idx].en, conditionJp: conditionOptions[idx].ja });
                                                }
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled className="text-gray-500">Select Condition...</option>
                                            {conditionOptions.map((opt, i) => (
                                                <option key={i} value={i}>{opt.en} / {opt.ja}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => saveOption('condition', { en: data.conditionEn, ja: data.conditionJp })}
                                            className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-2 rounded shadow-sm"
                                            title="Save current inputs to list"
                                        >
                                            + Save
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="text"
                                            placeholder="EN"
                                            value={data.conditionEn}
                                            onChange={e => setData({ ...data, conditionEn: e.target.value })}
                                            className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                        />
                                        <input
                                            type="text"
                                            placeholder="JP"
                                            value={data.conditionJp}
                                            onChange={e => setData({ ...data, conditionJp: e.target.value })}
                                            className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                        />
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('weight')}</label>
                                    <input type="text" value={data.weight} onChange={e => setData({ ...data, weight: e.target.value })} className="w-full border-gray-300 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900 shadow-sm" />
                                </div>
                                {/* Target removed as requested */}
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-2">{t('weightHistory')}</label>
                                <div className="space-y-2 bg-gray-50 p-3 rounded-md border border-gray-200">
                                    {data.weightHistory.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-center">
                                            <input
                                                type="text"
                                                value={item.label}
                                                onChange={e => {
                                                    const newHist = [...data.weightHistory];
                                                    newHist[index].label = e.target.value;
                                                    setData({ ...data, weightHistory: newHist });
                                                }}
                                                className="w-16 border-gray-300 rounded px-2 py-1 text-xs text-center text-gray-900 shadow-sm"
                                                placeholder="Month"
                                            />
                                            <div className="flex-1 h-px bg-gray-300"></div>
                                            <input
                                                type="number"
                                                value={item.value}
                                                onChange={e => {
                                                    const newHist = [...data.weightHistory];
                                                    newHist[index].value = parseInt(e.target.value) || 0;
                                                    setData({ ...data, weightHistory: newHist });
                                                }}
                                                className="w-20 border-gray-300 rounded px-2 py-1 text-xs text-right text-gray-900 shadow-sm"
                                                placeholder="kg"
                                            />
                                            <span className="text-xs text-gray-500">kg</span>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setData({ ...data, weightHistory: [...data.weightHistory, { label: '', value: 0 }] })}
                                        className="w-full py-1 text-xs text-center text-gray-500 hover:bg-gray-200 rounded border border-dashed border-gray-300 transition-colors"
                                    >
                                        + Add History Row
                                    </button>
                                </div>
                            </div>
                        </section>

                        {/* Comments & AI Tools */}
                        <section>
                            <div className="flex flex-col gap-2 mb-4">
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                    <Globe size={16} /> {t('aiComments')}
                                </h2>

                                {/* Gemini AI Style Assist UI */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">✨</span>
                                        <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">AI Writer</span>
                                    </div>
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder={lang === 'ja' ? "例：動き良し、カイ食い良好" : "e.g. Good movement, good appetite"}
                                            className="w-full border-0 rounded-lg bg-white/80 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-indigo-200 placeholder:text-indigo-300 focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleGenerateComment}
                                                disabled={isGenerating}
                                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1">
                                                <span>{isGenerating ? 'Generating...' : 'Generate En & Jp'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('englishComment')}</label>
                                    <textarea
                                        rows={4}
                                        value={data.commentEn}
                                        onChange={e => setData({ ...data, commentEn: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900 leading-relaxed focus:bg-white transition-colors"
                                        placeholder="Enter comment in English..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('japaneseTranslation')}</label>
                                    <textarea
                                        rows={4}
                                        value={data.commentJp}
                                        onChange={e => setData({ ...data, commentJp: e.target.value })}
                                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900 leading-relaxed focus:bg-white transition-colors"
                                        placeholder="日本語のコメント..."
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

            )}

            {/* --- Right Side: Preview Area --- */}
            <div className="flex-1 min-h-0 bg-[#525659] p-4 md:p-8 overflow-y-auto flex justify-center items-start h-full print:bg-white print:p-0 print:overflow-hidden preview-wrapper">
                {/* A4 Container - Uniqlo Style Reverted */}
                <div
                    id="report-preview"
                    className={`bg-white shadow-2xl relative flex flex-col mx-auto transition-transform origin-top scale-[0.9] md:scale-100${isPrintMode ? ' print-mode' : ''}`}
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        padding: '20px 30px 10px 30px',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header */}
                    <header className="report-header flex justify-between items-center border-b-2 border-[#c5a059] pb-0 mb-2 relative h-[140px] pt-4">
                        <div className="flex flex-col justify-center items-start z-10">
                            <div className="font-serif-en font-bold text-[#1a3c34] tracking-widest text-2xl leading-tight">HAMAGIKU</div>
                            <div className="font-serif-en font-bold text-[#1a3c34] tracking-widest text-2xl leading-tight">FARM</div>
                        </div>

                        {/* Centered Watermark Logo - 150px (Reduced size as requested) */}
                        {/* Centered Watermark Logo - 150px (Reduced size as requested, Moved Up) */}
                        {!isPrintMode && (
                            <div className="absolute left-1/2 top-[40%] transform -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] opacity-75 pointer-events-none logo-container">
                                <Image
                                    src="/hamagiku-logo.png"
                                    alt="Logo"
                                    fill
                                    className="object-contain"
                                    unoptimized
                                />
                            </div>
                        )}

                        <div className="flex flex-col justify-center items-end z-10">
                            <div className="font-serif-en font-bold text-2xl text-[#1a3c34] tracking-widest text-right whitespace-pre-line leading-tight">
                                {t('monthlyReport').replace(' ', '\n')}
                            </div>
                            <div className="text-[11px] text-[#6b7280] font-serif-en tracking-wide mt-1">
                                {formatReportMonth(data.reportDate, lang)}
                            </div>
                        </div>
                    </header>

                    {/* Old Watermark Position (Removed) */}

                    {/* Content Wrapper */}
                    <div className="relative z-10 flex flex-col h-full">

                        {/* Horse Profile */}
                        <div className="flex justify-between items-end mb-5">
                            <div>
                                <h1 className="leading-tight">
                                    <span className={`block font-bold text-gray-800 ${lang === 'ja' ? 'text-4xl font-serif-jp' : 'text-4xl font-serif-en'}`}>
                                        {lang === 'ja' ? (data.horseNameJp || '（馬名を入力）') : (data.horseNameEn || '(Horse Name)')}
                                    </span>
                                    <span className={`block font-bold text-[#c5a059] mt-1 ${lang === 'ja' ? 'text-xl font-serif-en' : 'text-lg font-serif-jp'}`}>
                                        {lang === 'ja' ? (data.horseNameEn || '') : (data.horseNameJp || '')}
                                    </span>
                                </h1>
                            </div>
                            <div className="text-[15px] text-[#666] bg-[#f4f7f6] py-2 px-4 border-l-[3px] border-[#1a3c34]">
                                {/* Multilingual Sire/Dam Display */}
                                <span className="font-bold mr-1">{t('sire')}:</span>
                                {lang === 'ja' ? (data.sireJp || data.sire) : (data.sireEn || data.sire)}
                                <span className="mx-2 text-gray-400">×</span>
                                <span className="font-bold mr-1">{t('dam')}:</span>
                                {lang === 'ja' ? (data.damJp || data.dam) : (data.damEn || data.dam)}
                            </div>
                        </div>

                        <div className="owner-line text-[12px] text-[#666] bg-[#f9fbfa] py-2 px-3 border border-[#e5e7eb] mb-4">
                            <span className="font-bold mr-1">{t('owner')}:</span>
                            {formatOwnerName(data.ownerName)}
                            <span className="mx-2 text-gray-300">/</span>
                            <span className="font-bold mr-1">{t('trainer')}:</span>
                            {lang === 'ja'
                                ? (data.trainerNameJp || data.trainerNameEn || '-')
                                : (data.trainerNameEn || data.trainerNameJp || '-')}
                            {data.trainerLocation ? ` (${data.trainerLocation})` : ''}
                            <span className="mx-2 text-gray-300">/</span>
                            <span className="font-bold mr-1">{t('birthDate')}:</span>
                            {data.birthDate || '-'}
                            <span className="mx-2 text-gray-300">/</span>
                            <span className="font-bold mr-1">{t('age')}:</span>
                            {data.age !== null && data.age !== undefined ? data.age : '-'}
                        </div>

                        {/* Main Photo - Reduced width to save vertical space */}
                        <div className="main-photo w-[85%] mx-auto aspect-[4/3] bg-[#eee] mb-5 relative overflow-hidden rounded-[2px] shadow-sm">
                            {data.mainPhoto ? (
                                <Image
                                    src={data.mainPhoto}
                                    alt="Main"
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            ) : (
                                <div className="flex items-center justify-center w-full h-full text-gray-400 font-serif-en italic">
                                    No Photo Selected
                                </div>
                            )}
                        </div>

                        {/* Data Section - Compact Height (Reduced from 220px to 120px) */}
                        <div className="data-section flex gap-6 mb-4 h-[120px]">
                            {/* Stats Grid - 1 row, 3 columns (Reordered: Training, Condition, Weight -> Chart) */}
                            <div className="flex-1 grid grid-cols-3 gap-[10px]">
                                <div className="bg-[#f4f7f6] p-3 flex flex-col justify-center border-t-[3px] border-[#ddd]">
                                    <span className="text-[10px] text-[#666] uppercase mb-1">{t('training')}</span>
                                    <span className="text-base text-[#333] font-serif-jp leading-tight">
                                        {lang === 'ja' ? (data.trainingStatusJp || '-') : (data.trainingStatusEn || '-')}
                                    </span>
                                </div>
                                <div className="bg-[#f4f7f6] p-3 flex flex-col justify-center border-t-[3px] border-[#ddd]">
                                    <span className="text-[10px] text-[#666] uppercase mb-1">{t('condition')}</span>
                                    <span className="text-base text-[#333] leading-tight">
                                        {lang === 'ja' ? (data.conditionJp || '-') : (data.conditionEn || '-')}
                                    </span>
                                </div>
                                <div className="bg-[#f4f7f6] p-3 flex flex-col justify-center border-t-[3px] border-[#c5a059]">
                                    <span className="text-[10px] text-[#666] uppercase mb-1">{t('currentWeight')}</span>
                                    <span className="font-serif-en text-xl font-bold text-[#1a3c34]">{data.weight || '-'}</span>
                                </div>
                                {/* Target Removed */}
                            </div>

                            {/* Chart - Responsive height */}
                            <div className="flex-[1.2] relative pt-1">
                                <span className="text-xs font-bold text-[#1a3c34] block mb-1 border-b border-[#ddd] pb-1 cursor-default">
                                    {t('weightHistory')}
                                </span>
                                <div className="h-[90px] w-full">
                                    <SimpleLineChart data={data.weightHistory} color="#1a3c34" />
                                </div>
                            </div>
                        </div>

                        {/* Comment Section */}
                        <div className="comment-box border-2 border-[#555] p-5 relative bg-white min-h-[140px] mt-4">
                            <span className="absolute -top-3 left-5 bg-white px-2 font-serif-en text-[#1a3c34] font-bold text-sm tracking-wide">
                                {t('trainersComment')}
                            </span>
                            {lang === 'ja' ? (
                                <div className="comment-text text-[13px] leading-[1.8] text-justify whitespace-pre-wrap font-sans text-[#111] font-semibold">
                                    {data.commentJp}
                                </div>
                            ) : (
                                <div className="comment-text text-[13px] leading-[1.8] text-justify font-serif-en text-[#111] whitespace-pre-wrap break-words font-semibold">
                                    {data.commentEn ? `"${data.commentEn}"` : ''}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="footer-text mt-2 text-center text-[10px] text-[#aaa] font-serif-en tracking-widest">
                            HAMAGIKU FARM - HOKKAIDO, JAPAN | {lang === 'ja' ? data.reportDate.replace(/\./g, '/') : formatDateUK(data.reportDate)}
                        </div>

                    </div>
                </div>
            </div>
        </div >
    );
}
