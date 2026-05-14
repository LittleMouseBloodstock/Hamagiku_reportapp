'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Image from 'next/image';
import { FileText, Image as ImageIcon, Activity, Globe, Crop, X, Check } from 'lucide-react';
import Cropper from 'react-easy-crop';
import { Point, Area } from 'react-easy-crop';
import { useLanguage } from '../contexts/LanguageContext';
import { useBranding } from '../contexts/BrandingContext';
import { formatHorseSexAge } from '../lib/horseProfile';

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

      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
      }

      .report-template-root {
        display: block !important;
        min-height: 0 !important;
        height: auto !important;
        overflow: visible !important;
        background: white !important;
      }

      .no-print {
        display: none !important;
      }

      .print-only-root,
      .print-only-root * {
        display: none !important;
      }

      .screen-preview-root {
        display: flex !important;
        width: auto !important;
        min-height: 0 !important;
        height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        overflow: visible !important;
        background: white !important;
        justify-content: center !important;
        align-items: flex-start !important;
      }

      .screen-preview-root.preview-wrapper {
        background: white !important;
      }

      #report-preview-screen {
        display: flex !important;
        flex-direction: column !important;
        gap: 0 !important;
        width: 210mm !important;
        margin: 0 auto !important;
        transform: none !important;
        scale: 1 !important;
        overflow: visible !important;
      }

      .print-sheet {
        display: block !important;
        width: 210mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 14mm 12mm 10mm 12mm !important;
        background: white !important;
        box-shadow: none !important;
        break-after: page !important;
        page-break-after: always !important;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }

      .print-sheet:last-child {
        break-after: auto !important;
        page-break-after: auto !important;
      }

      .print-main-sheet {
        height: 297mm !important;
        overflow: hidden !important;
      }

      .print-appendix-sheet {
        break-before: page !important;
        page-break-before: always !important;
      }

      .print-content {
        display: block !important;
        min-height: auto !important;
      }

      .print-header {
        height: 108px !important;
        padding-top: 0 !important;
        margin-bottom: 8px !important;
        overflow: visible !important;
      }

      .print-logo-slot {
        position: absolute !important;
        top: 8px !important;
        left: 0 !important;
        right: 0 !important;
        display: flex !important;
        justify-content: center !important;
        pointer-events: none !important;
      }

      .print-logo {
        width: 78px !important;
        height: 78px !important;
        opacity: 0.42 !important;
        transform: none !important;
      }

      .print-photo {
        width: 78% !important;
        margin-bottom: 10px !important;
      }

      .print-data-section {
        min-height: 108px !important;
        margin-bottom: 10px !important;
      }

      .print-comment-box {
        display: block !important;
        flex: none !important;
        min-height: 0 !important;
        margin-top: 6px !important;
        padding: 12px !important;
        overflow: visible !important;
        break-inside: auto !important;
        page-break-inside: auto !important;
      }

      .print-comment-ja,
      .print-comment-en {
        font-size: 11.5px !important;
        line-height: 1.5 !important;
      }

      .print-footer {
        margin-top: 6px !important;
        padding-top: 6px !important;
        font-size: 9px !important;
        line-height: 1.2 !important;
      }

      .logo-container {
         clip-path: none !important;
         overflow: visible !important;
      }
    }

    @media screen {
      .print-only-root {
        display: none !important;
      }
    }
  `}</style>
);

const reportBuilderPanelStyle = {
    backgroundColor: 'var(--brand-primary)',
    color: 'var(--brand-on-primary)',
} as const;

const reportPreviewPrimaryStyle = {
    color: 'var(--brand-primary)',
} as const;

const reportPreviewAccentStyle = {
    color: 'var(--brand-accent)',
} as const;

const reportPreviewSoftPanelStyle = {
    backgroundColor: 'color-mix(in srgb, var(--brand-primary) 6%, white)',
} as const;

const reportPreviewAccentBorderStyle = {
    borderColor: 'var(--brand-accent)',
} as const;

const reportPreviewPrimaryBorderStyle = {
    borderColor: 'var(--brand-primary)',
} as const;

function filterCommentByLang(text: string, targetLang: 'ja' | 'en') {
    const containsJapanese = (value: string) => /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(value);
    const containsEnglish = (value: string) => /[A-Za-z]/.test(value);
    const isHorseNameHeading = (value: string) => {
        const trimmed = value.trim();
        if (!trimmed) return false;
        if (trimmed.length > 60) return false;
        if (/[。！？.!?]/.test(trimmed)) return false;
        const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
        if (wordCount > 6) return false;
        return /^[A-Za-z0-9 .,'’()\-/:&]+(?:\s*\([A-Za-z0-9 .,'’()\-/:&]+\))?$/.test(trimmed);
    };

    return String(text || '')
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/\*\*/g, '')
        .replace(/^\s*"(generated_text|rationale|internal_notes)"\s*:\s*/gim, '')
        .replace(/^\s*(generated_text|rationale|internal_notes)\s*:\s*/gim, '')
        .replace(/^The [`'"]?draftText[`'"]?.*$/gim, '')
        .replace(/^The user wants.*$/gim, '')
        .replace(/^[*-]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        .replace(/,\s*$/gm, '')
        .replace(/^"+|"+$/gm, '')
        .replace(/\r\n/g, '\n')
        .split(/(?<=[。！？.!?])\s+|\n+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .filter((part) => {
            if (isHorseNameHeading(part)) return false;
            if (/^(generated_text|rationale|internal_notes)\b/i.test(part)) return false;
            if (/^The [`'"]?draftText[`'"]?/i.test(part)) return false;
            if (/^The user wants/i.test(part)) return false;

            if (targetLang === 'ja') {
                if (!containsJapanese(part)) return false;
            } else {
                if (containsJapanese(part)) return false;
                if (!containsEnglish(part)) return false;
            }

            return true;
        })
        .join(targetLang === 'en' ? ' ' : '\n\n')
        .trim();
}

function normalizeCommentEditorValue(text: string, targetLang: 'ja' | 'en') {
    const normalized = String(text || '').replace(/\r\n/g, '\n');

    if (targetLang === 'en') {
        return normalized
            .replace(/\n{2,}/g, '\n')
            .replace(/[ \t]+\n/g, '\n')
            .trim();
    }

    return normalized
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+\n/g, '\n')
        .trim();
}

// Simple Line Chart Component
const SimpleLineChart = ({ data, color }: { data: { label: string, value: number }[], color: string }) => {
    const width = 240;
    const height = 108;
    const paddingX = 18;
    const paddingTop = 18;
    const paddingBottom = 26;

    if (!data || data.length < 2) return null;

    const maxVal = Math.max(...data.map(d => d.value));
    const minVal = Math.min(...data.map(d => d.value));
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => {
        const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
        const y = height - paddingBottom - ((d.value - minVal) / range) * (height - paddingTop - paddingBottom);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            {/* Grid Lines */}
            <line x1={paddingX} y1={paddingTop} x2={width - paddingX} y2={paddingTop} stroke="#E5E7EB" strokeWidth="1" />
            <line x1={paddingX} y1={height - paddingBottom} x2={width - paddingX} y2={height - paddingBottom} stroke="#E5E7EB" strokeWidth="1" />

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
                const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
                const y = height - paddingBottom - ((d.value - minVal) / range) * (height - paddingTop - paddingBottom);
                return (
                    <g key={i}>
                        <circle cx={x} cy={y} r="3" fill="white" stroke={color} strokeWidth="2" />
                        <text x={x} y={height - 4} textAnchor="middle" fontSize="10" fill="#6B7280" className="font-body-en" fontWeight="bold">{d.label}</text>
                        <text x={x} y={y} dy="-8" textAnchor="middle" fontSize="11" fill={color} fontWeight="bold" className="font-body-en">{d.value}</text>
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

export type ReportData = {
    outputMode?: 'japanese_only' | 'english_only' | 'bilingual';
    reportDate: string;
    clientLocation?: string;
    horseNameEn: string;
    horseNameJp: string;
    birthDate?: string;
    horseSex?: string;
    trainerNameEn?: string;
    trainerNameJp?: string;
    sire: string;
    sireEn?: string;
    sireJp?: string;
    dam: string;
    damEn?: string;
    damJp?: string;
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
    weightHistory: { label: string, value: number, measuredAt?: string }[];
    careRecords: {
        id: string;
        date: string;
        note: string;
        reportMode: 'none' | 'body' | 'appendix';
        images: {
            id: string;
            path: string;
            url: string;
            caption: string;
        }[];
    }[];
    logo: string | null;
    originalPhoto?: string | null; // Keep original for re-cropping
};

function formatWeightHistoryLabel(measuredAt: string, language: 'ja' | 'en') {
    const [year, month] = measuredAt.split('-').map((value) => parseInt(value, 10));
    if (!year || !month) return measuredAt;
    if (language === 'ja') return `${month}月`;

    return new Date(year, month - 1, 1).toLocaleString('en-GB', {
        month: 'short',
        year: 'numeric',
    });
}

function formatChartWeightHistoryLabel(measuredAt: string, language: 'ja' | 'en') {
    const [year, month] = measuredAt.split('-').map((value) => parseInt(value, 10));
    if (!year || !month) return measuredAt;
    if (language === 'ja') return `${month}月`;

    return new Date(year, month - 1, 1).toLocaleString('en-GB', {
        month: 'short',
    });
}

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
    userId?: string | null;
    onGenerateComment?: (prompt: string, data: ReportData) => Promise<{ ja: string; en: string } | null>;
    onFillMissingComment?: (targetLang: 'ja' | 'en', data: ReportData) => Promise<string | null>;
    outputMode?: ReportData['outputMode'];
    onOutputModeChange?: (mode: NonNullable<ReportData['outputMode']>) => void;
}

export default function ReportTemplate({
    initialData,
    onDataChange,
    readOnly = false,
    onGenerateComment,
    onFillMissingComment,
    outputMode: controlledOutputMode,
    onOutputModeChange,
}: ReportTemplateProps) {
    const { t, language } = useLanguage();
    const { branding, resolvedLogoUrl } = useBranding();
    const lang = language;
    // Default Data
    const defaultData: ReportData = {
        reportDate: '', // Set in useEffect to avoid hydration mismatch
        outputMode: 'bilingual',
        clientLocation: '',
        horseNameEn: 'Demo Vega',
        horseNameJp: 'シンバベガ',
        birthDate: '',
        horseSex: '',
        trainerNameEn: '',
        trainerNameJp: '',
        sire: 'Lucky Vega',
        dam: 'Xmas',
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
            { label: '10月', value: 418, measuredAt: '2025-10' },
            { label: '11月', value: 420, measuredAt: '2025-11' },
            { label: '12月', value: 423, measuredAt: '2025-12' },
            { label: '1月', value: 425, measuredAt: '2026-01' },
        ],
        careRecords: [],
        logo: null
    };

    const [data, setData] = useState<ReportData>({ ...defaultData, ...initialData });
    const lastAppliedInitialDataRef = useRef<string>('');
    const outputMode = controlledOutputMode || data.outputMode || 'bilingual';
    const showJapanese = outputMode !== 'english_only';
    const showEnglish = outputMode !== 'japanese_only';
    const isBilingual = outputMode === 'bilingual';
    const previewLang = outputMode === 'english_only' ? 'en' : 'ja';
    const previewLabel = (ja: string, en: string) => {
        if (outputMode === 'bilingual') return `${ja} / ${en}`;
        return previewLang === 'ja' ? ja : en;
    };
    const previewMicroLabel = (ja: string, en: string) => {
        if (!isBilingual) return <span>{previewLang === 'ja' ? ja : en}</span>;

        return (
            <span className="leading-tight">
                <span>{ja}</span>
                <span className="font-body-en text-[9px] uppercase tracking-[0.08em] text-[#8b8b8b]"> / {en}</span>
            </span>
        );
    };
    const sexAgeLabelJa = formatHorseSexAge(data.horseSex, data.birthDate, data.reportDate, 'ja');
    const sexAgeLabelEn = formatHorseSexAge(data.horseSex, data.birthDate, data.reportDate, 'en');
    const previewWeightHistory = data.weightHistory.map((item) => ({
        ...item,
        label: item.measuredAt ? formatChartWeightHistoryLabel(item.measuredAt, previewLang) : item.label,
    }));
    const bodyCareRecords = data.careRecords.filter((record) => record.reportMode === 'body' && (record.date || record.note.trim()));
    const appendixCareRecords = data.careRecords.filter((record) => record.reportMode === 'appendix' && (record.date || record.note.trim() || record.images.length > 0));

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

    useEffect(() => {
        if (!isBilingual) return;

        const sanitizedJp = filterCommentByLang(data.commentJp, 'ja');
        const sanitizedEn = filterCommentByLang(data.commentEn, 'en');

        if (sanitizedJp !== data.commentJp || sanitizedEn !== data.commentEn) {
            setData((prev) => ({
                ...prev,
                commentJp: sanitizedJp,
                commentEn: sanitizedEn,
            }));
        }
    }, [isBilingual, data.commentJp, data.commentEn]);

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
    const [isFillingMissing, setIsFillingMissing] = useState<'ja' | 'en' | null>(null);
    const [aiPrompt, setAiPrompt] = useState('');

    const handleGenerateComment = async () => {
        if (!aiPrompt) return;
        setIsGenerating(true);
        try {
            let json = null;
            if (onGenerateComment) {
                json = await onGenerateComment(aiPrompt, data);
            } else {
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

                json = await res.json();
            }

            if (outputMode === 'japanese_only' && json.ja) {
                setData(prev => ({ ...prev, commentJp: normalizeCommentEditorValue(json.ja, 'ja'), commentEn: '' }));
            } else if (outputMode === 'english_only' && json.en) {
                setData(prev => ({ ...prev, commentEn: normalizeCommentEditorValue(json.en, 'en'), commentJp: '' }));
            } else if (outputMode === 'bilingual') {
                setData(prev => ({
                    ...prev,
                    commentEn: typeof json.en === 'string' ? normalizeCommentEditorValue(json.en, 'en') : prev.commentEn,
                    commentJp: typeof json.ja === 'string' ? normalizeCommentEditorValue(json.ja, 'ja') : prev.commentJp,
                }));
            }
        } catch (e) {
            console.error(e);
            alert("AI Generation failed:\n" + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsGenerating(false);
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

    // Handle initialData updates from parent.
    // The parent recreates the object on rerender, so only apply when the
    // incoming content itself changed. This avoids overwriting freshly
    // generated comments with stale initialData after a successful generate.
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            const serialized = JSON.stringify(initialData);
            if (serialized === lastAppliedInitialDataRef.current) {
                return;
            }

            lastAppliedInitialDataRef.current = serialized;
            setData((prev) => ({ ...prev, ...initialData }));
        }

    }, [initialData]);

    useEffect(() => {
        if (controlledOutputMode && data.outputMode !== controlledOutputMode) {
            setData((prev) => ({ ...prev, outputMode: controlledOutputMode }));
        }
    }, [controlledOutputMode, data.outputMode]);

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

    const handleFillMissingComment = async (targetLang: 'ja' | 'en') => {
        if (!onFillMissingComment) return;
        setIsFillingMissing(targetLang);
        try {
            const filled = await onFillMissingComment(targetLang, data);
            if (!filled) return;

            if (targetLang === 'ja') {
                setData((prev) => ({ ...prev, commentJp: normalizeCommentEditorValue(filled, 'ja') }));
            } else {
                setData((prev) => ({ ...prev, commentEn: normalizeCommentEditorValue(filled, 'en') }));
            }
        } catch (e) {
            console.error(e);
            alert(targetLang === 'ja' ? '日本語生成に失敗しました。再試行してください。' : 'English generation failed. Please try again.');
        } finally {
            setIsFillingMissing(null);
        }
    };

    const updateWeightHistoryEntry = (
        index: number,
        patch: Partial<ReportData['weightHistory'][number]>,
    ) => {
        const newHist = [...data.weightHistory];
        const current = newHist[index];
        const next = { ...current, ...patch };

        if (patch.measuredAt !== undefined) {
            next.label = patch.measuredAt ? formatWeightHistoryLabel(patch.measuredAt, lang) : '';
        }

        newHist[index] = next;
        setData({ ...data, weightHistory: newHist });
    };

    const removeWeightHistoryEntry = (index: number) => {
        if (data.weightHistory.length <= 1) {
            setData({
                ...data,
                weightHistory: [{ label: '', value: 0, measuredAt: '' }],
            });
            return;
        }

        setData({
            ...data,
            weightHistory: data.weightHistory.filter((_, itemIndex) => itemIndex !== index),
        });
    };

    const updateCareRecordMode = (recordId: string, reportMode: 'none' | 'body' | 'appendix') => {
        setData({
            ...data,
            careRecords: data.careRecords.map((record) => (
                record.id === recordId ? { ...record, reportMode } : record
            )),
        });
    };

    return (
        <div className="report-template-root flex min-h-screen flex-col md:h-screen md:flex-row bg-gray-100 overflow-hidden font-sans">
            <Fonts />
            {/* Cropper Modal */}
            {isCropping && tempImgSrc && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-700 flex items-center gap-2"><Crop size={18} /> {t('editPhoto')}</h3>
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
                                className="btn-primary px-6 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-colors"
                            >
                                <Check size={18} /> {t('applyCrop')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Left Side: Input Panel (Hidden on Print OR readOnly) --- */}
            {!readOnly && (
                <div className="w-full md:w-1/3 lg:w-96 bg-white border-r border-gray-200 shadow-lg overflow-y-auto md:h-full flex-shrink-0 no-print z-20">
                    <div className="p-6 sticky top-0 z-10" style={reportBuilderPanelStyle}>
                        <h1 className="text-xl font-serif-en font-bold flex items-center gap-2">
                            <Activity size={20} className="text-on-primary" />
                            {t('reportBuilder')}
                        </h1>

                        <p className="text-xs mt-1 opacity-80">{branding.farmName}</p>
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
                                        className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Output Mode</label>
                                    <select
                                        value={outputMode}
                                        onChange={e => {
                                            const nextMode = e.target.value as NonNullable<ReportData['outputMode']>;
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
                                <div className="grid grid-cols-2 gap-3">
                                    {showEnglish && <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('horseName')} (EN)</label>
                                        <input
                                            type="text"
                                            value={data.horseNameEn}
                                            onChange={e => setData({ ...data, horseNameEn: e.target.value })}
                                            className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                        />
                                    </div>}
                                    {showJapanese && <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('horseName')} (JP)</label>
                                        <input
                                            type="text"
                                            value={data.horseNameJp}
                                            onChange={e => setData({ ...data, horseNameJp: e.target.value })}
                                            className="input-brand w-full bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                        />
                                    </div>}
                                </div>
                                {(data.trainerNameJp || data.trainerNameEn) && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {showEnglish && <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('trainer')} (EN)</label>
                                            <input
                                                type="text"
                                                value={data.trainerNameEn || data.trainerNameJp || ''}
                                                readOnly
                                                className="input-brand w-full bg-gray-100 px-3 py-2 text-sm text-gray-700"
                                            />
                                        </div>}
                                        {showJapanese && <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">{t('trainer')} (JP)</label>
                                            <input
                                                type="text"
                                                value={data.trainerNameJp || data.trainerNameEn || ''}
                                                readOnly
                                                className="input-brand w-full bg-gray-100 px-3 py-2 text-sm text-gray-700"
                                            />
                                        </div>}
                                    </div>
                                )}

                                {/* Sire (Multilingual) */}
                                <div className="grid grid-cols-2 gap-3">
                                    {showEnglish && <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('sire')} (EN)</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                value={data.sireEn || data.sire} // Fallback
                                                onChange={e => setData({ ...data, sireEn: e.target.value })}
                                                className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900 pr-6"
                                                placeholder="Sire (EN)"
                                            />
                                        </div>
                                    </div>}
                                    {showJapanese && <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('sire')} (JP)</label>
                                        <input
                                            type="text"
                                            value={data.sireJp || ''}
                                            onChange={e => setData({ ...data, sireJp: e.target.value })}
                                            className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                            placeholder="父馬名"
                                        />
                                    </div>}
                                </div>

                                {/* Dam (Multilingual) */}
                                <div className="grid grid-cols-2 gap-3">
                                    {showEnglish && <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('dam')} (EN)</label>
                                        <input
                                            type="text"
                                            value={data.damEn || data.dam} // Fallback
                                            onChange={e => setData({ ...data, damEn: e.target.value })}
                                            className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                            placeholder="Dam (EN)"
                                        />
                                    </div>}
                                    {showJapanese && <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">{t('dam')} (JP)</label>
                                        <input
                                            type="text"
                                            value={data.damJp || ''}
                                            onChange={e => setData({ ...data, damJp: e.target.value })}
                                            className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900"
                                            placeholder="母馬名"
                                        />
                                    </div>}
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
                                            className="btn-primary whitespace-nowrap text-xs px-2 rounded shadow-sm"
                                            title="Save current inputs to list"
                                        >
                                            + Save
                                        </button>
                                    </div>
                                        <div className={`grid gap-2 ${isBilingual ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            {showEnglish && <input
                                                type="text"
                                                placeholder="EN"
                                                value={data.trainingStatusEn}
                                                onChange={e => setData({ ...data, trainingStatusEn: e.target.value })}
                                                className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                            />}
                                            {showJapanese && <input
                                                type="text"
                                                placeholder="JP"
                                                value={data.trainingStatusJp}
                                                onChange={e => setData({ ...data, trainingStatusJp: e.target.value })}
                                                className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                            />}
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
                                            <option value="" disabled className="text-gray-500">{t('selectCondition')}</option>
                                            {conditionOptions.map((opt, i) => (
                                                <option key={i} value={i}>{opt.en} / {opt.ja}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => saveOption('condition', { en: data.conditionEn, ja: data.conditionJp })}
                                            className="btn-primary whitespace-nowrap text-xs px-2 rounded shadow-sm"
                                            title="Save current inputs to list"
                                        >
                                            + Save
                                        </button>
                                    </div>
                                    <div className={`grid gap-2 ${isBilingual ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                        {showEnglish && <input
                                            type="text"
                                            placeholder="EN"
                                            value={data.conditionEn}
                                            onChange={e => setData({ ...data, conditionEn: e.target.value })}
                                            className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                        />}
                                        {showJapanese && <input
                                            type="text"
                                            placeholder="JP"
                                            value={data.conditionJp}
                                            onChange={e => setData({ ...data, conditionJp: e.target.value })}
                                            className="w-full border-gray-300 rounded-md text-xs px-2 py-1 text-gray-900"
                                        />}
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
                                                type="month"
                                                value={item.measuredAt || ''}
                                                lang={lang === 'ja' ? 'ja-JP' : 'en-GB'}
                                                onChange={e => {
                                                    updateWeightHistoryEntry(index, { measuredAt: e.target.value });
                                                }}
                                                className="w-32 border-gray-300 rounded px-2 py-1 text-xs text-center text-gray-900 shadow-sm"
                                            />
                                            <span className="min-w-16 text-[11px] text-gray-500 text-center">
                                                {item.measuredAt ? formatWeightHistoryLabel(item.measuredAt, lang) : ''}
                                            </span>
                                            <div className="flex-1 h-px bg-gray-300"></div>
                                            <input
                                                type="number"
                                                value={item.value}
                                                onChange={e => {
                                                    updateWeightHistoryEntry(index, { value: parseInt(e.target.value, 10) || 0 });
                                                }}
                                                className="w-20 border-gray-300 rounded px-2 py-1 text-xs text-right text-gray-900 shadow-sm"
                                                placeholder="kg"
                                            />
                                            <span className="text-xs text-gray-500">kg</span>
                                            <button
                                                type="button"
                                                onClick={() => removeWeightHistoryEntry(index)}
                                                className="rounded border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
                                                aria-label={`Remove weight history row ${index + 1}`}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setData({
                                            ...data,
                                            weightHistory: [...data.weightHistory, { label: '', value: 0, measuredAt: '' }],
                                        })}
                                        className="w-full py-1 text-xs text-center text-gray-500 hover:bg-gray-200 rounded border border-dashed border-gray-300 transition-colors"
                                    >
                                        + {t('addHistoryRow')}
                                    </button>
                                </div>
                            </div>
                        </section>

                        {data.careRecords.length > 0 && (
                            <section>
                                <div className="flex flex-col gap-2 mb-4">
                                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                        <Activity size={16} /> {t('careRecordsForReport')}
                                    </h2>
                                    <p className="text-[11px] leading-5 text-stone-500">
                                        {t('careRecordsForReportHint')} {`(${t('reflectInBody')}: ${bodyCareRecords.length} / ${t('attachOnSecondPage')}: ${appendixCareRecords.length})`}
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {data.careRecords.map((record, index) => (
                                        <div key={record.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                                            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                                <div className="min-w-0">
                                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-stone-400">
                                                        {t('vetTreatmentRecordLabel')} #{index + 1}
                                                    </div>
                                                    <div className="mt-1 text-sm font-semibold text-stone-800">
                                                        {record.date || '-'}
                                                    </div>
                                                    <div className="mt-2 text-sm leading-7 text-stone-600 whitespace-pre-wrap">
                                                        {record.note || '-'}
                                                    </div>
                                                    {record.images.length > 0 && (
                                                        <div className="mt-3 text-xs text-stone-500">
                                                            {t('supportingImages')}: {record.images.length}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="w-full md:w-[220px]">
                                                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-stone-400">{t('reportOutput')}</label>
                                                    <select
                                                        value={record.reportMode}
                                                        onChange={(e) => updateCareRecordMode(record.id, e.target.value as 'none' | 'body' | 'appendix')}
                                                        className="w-full rounded-md border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm"
                                                    >
                                                        <option value="none">{t('doNotInclude')}</option>
                                                        <option value="body">{t('reflectInBody')}</option>
                                                        <option value="appendix">{t('attachOnSecondPage')}</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Comments & AI Tools */}
                        <section>
                            <div className="flex flex-col gap-2 mb-4">
                                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                                    <Globe size={16} /> {t('aiComments')}
                                </h2>

                                {/* Gemini AI Style Assist UI */}
                                <div className="p-4 rounded-xl border shadow-sm" style={{ background: 'color-mix(in srgb, var(--brand-primary) 8%, white)', borderColor: 'color-mix(in srgb, var(--brand-primary) 16%, white)' }}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">✨</span>
                                        <span className="text-xs font-bold uppercase tracking-wide" style={reportPreviewPrimaryStyle}>AI Writer</span>
                                    </div>
                                    <div className="space-y-3">
                                        <textarea
                                            rows={6}
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            placeholder={lang === 'ja' ? "例：動き良し、カイ食い良好\n歩様は軽く、テンションも安定\n先週の疝痛はその後落ち着いている" : "e.g. Good movement, good appetite\nStride is light and relaxed\nLast week's colic has settled since then"}
                                            className="w-full resize-y border-0 rounded-lg bg-white/80 px-3 py-3 text-sm text-gray-900 shadow-sm ring-1 placeholder:text-stone-400 focus:bg-white transition-all leading-relaxed min-h-[160px]"
                                            style={{ ['--tw-ring-color' as string]: 'color-mix(in srgb, var(--brand-primary) 24%, white)' }}
                                        />
                                        <p className="text-[11px] leading-5 text-stone-500">
                                            {lang === 'ja' ? 'メモは複数行で入力できます。生成後に微修正して保存すると、Premium では学習候補として扱われます。' : 'You can enter multi-line notes here. After generation, small edits and save will be treated as learning candidates on Premium.'}
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleGenerateComment}
                                                disabled={isGenerating}
                                                className="btn-primary flex-1 disabled:opacity-50 text-xs font-bold py-2 px-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1">
                                                <span>{isGenerating ? t('generating') : outputMode === 'bilingual' ? t('generateBilingual') : outputMode === 'english_only' ? 'Generate English' : '日本語生成'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {showEnglish && <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('englishComment')}</label>
                                    <textarea
                                        rows={4}
                                        value={data.commentEn}
                                        onChange={e => setData({ ...data, commentEn: normalizeCommentEditorValue(e.target.value, 'en') })}
                                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900 leading-relaxed focus:bg-white transition-colors"
                                        placeholder={t('enterEnglishComment')}
                                    />
                                    {outputMode === 'bilingual' && !data.commentEn.trim() && data.commentJp.trim() && onFillMissingComment && (
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <p className="text-[11px] leading-5 text-stone-500">
                                                {lang === 'ja' ? '英語コメントはまだありません。必要に応じて生成してください。' : 'No English comment yet. Generate it when needed.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => void handleFillMissingComment('en')}
                                                disabled={isFillingMissing === 'en'}
                                                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                                            >
                                                {isFillingMissing === 'en' ? (lang === 'ja' ? '生成中...' : 'Generating...') : (lang === 'ja' ? '英語を生成' : 'Generate English')}
                                            </button>
                                        </div>
                                    )}
                                </div>}
                                {showJapanese && <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">{t('japaneseTranslation')}</label>
                                    <textarea
                                        rows={4}
                                        value={data.commentJp}
                                        onChange={e => setData({ ...data, commentJp: normalizeCommentEditorValue(e.target.value, 'ja') })}
                                        className="w-full rounded-md border-gray-300 shadow-sm bg-gray-50 px-3 py-2 text-sm text-gray-900 leading-relaxed focus:bg-white transition-colors"
                                        placeholder="日本語のコメント..."
                                    />
                                    {outputMode === 'bilingual' && !data.commentJp.trim() && data.commentEn.trim() && onFillMissingComment && (
                                        <div className="mt-2 flex items-center justify-between gap-3">
                                            <p className="text-[11px] leading-5 text-stone-500">
                                                {lang === 'ja' ? '日本語コメントはまだありません。必要に応じて生成してください。' : 'No Japanese comment yet. Generate it when needed.'}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => void handleFillMissingComment('ja')}
                                                disabled={isFillingMissing === 'ja'}
                                                className="rounded-md border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
                                            >
                                                {isFillingMissing === 'ja' ? (lang === 'ja' ? '生成中...' : 'Generating...') : (lang === 'ja' ? '日本語を生成' : 'Generate Japanese')}
                                            </button>
                                        </div>
                                    )}
                                </div>}
                            </div>
                        </section>
                    </div>
                </div>

            )}

            {/* --- Right Side: Preview Area --- */}
            <div className="screen-preview-root flex-1 min-h-[50vh] bg-[#525659] p-3 md:p-8 overflow-y-auto flex justify-center items-start md:h-full print:bg-white print:p-0 print:overflow-hidden preview-wrapper">
                {/* A4 Container - Uniqlo Style Reverted */}
                <div
                    id="report-preview-screen"
                    className="relative flex flex-col gap-6 mx-auto transition-transform origin-top scale-[0.9] md:scale-100"
                    style={{
                        width: '210mm',
                        boxSizing: 'border-box'
                    }}
                >
                    <div
                        className="print-sheet print-main-sheet bg-white shadow-2xl relative flex flex-col"
                        style={{
                            minHeight: '297mm',
                            padding: '20px 30px 10px 30px',
                            boxSizing: 'border-box'
                        }}
                    >
                    {/* Header */}
                    <header className="print-header flex justify-between items-center border-b-2 pb-0 mb-2 relative h-[140px] pt-4" style={reportPreviewAccentBorderStyle}>
                        <div className="flex flex-col justify-center items-start z-10">
                            <div className="font-serif-en font-bold tracking-widest text-2xl leading-tight" style={reportPreviewPrimaryStyle}>{branding.farmName}</div>
                            <div className="font-serif-en font-bold tracking-widest text-2xl leading-tight" style={reportPreviewPrimaryStyle}>REPORTS</div>
                        </div>

                        {/* Centered Watermark Logo - 150px (Reduced size as requested) */}
                        {/* Centered Watermark Logo - 150px (Reduced size as requested, Moved Up) */}
                        <div className="print-logo-slot absolute inset-x-0 top-2 flex justify-center pointer-events-none">
                            <div className="print-logo relative w-[120px] h-[120px] opacity-50 logo-container">
                                <Image
                                    src={resolvedLogoUrl || (branding.logoConcept === 'nature' ? '/shinba-nature.svg' : '/brand-mark.png')}
                                    alt={branding.farmName}
                                    fill
                                    unoptimized
                                    className="object-contain opacity-80"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col justify-center items-end z-10">
                            <div className="font-serif-en font-bold text-2xl tracking-widest text-right whitespace-pre-line leading-tight" style={reportPreviewPrimaryStyle}>
                                {previewLabel('月次レポート', 'Monthly Report').replace(' / ', '\n')}
                            </div>
                        </div>
                    </header>

                    {/* Old Watermark Position (Removed) */}

                    {/* Content Wrapper */}
                    <div className="print-content relative z-10 flex min-h-full flex-col">

                        {/* Horse Profile */}
                        <div className="flex justify-between items-end mb-5">
                            <div>
                                <h1 className="leading-tight">
                                    <span className={`block font-bold text-gray-800 ${previewLang === 'ja' ? 'text-4xl font-serif-jp' : 'text-4xl font-serif-en'}`}>
                                        {previewLang === 'ja' ? (data.horseNameJp || '（馬名を入力）') : (data.horseNameEn || '(Horse Name)')}
                                    </span>
                                    {isBilingual && (
                                        <span className={`block font-bold mt-1 ${previewLang === 'ja' ? 'text-xl font-serif-en' : 'text-lg font-serif-jp'}`} style={reportPreviewAccentStyle}>
                                            {previewLang === 'ja' ? (data.horseNameEn || '') : (data.horseNameJp || '')}
                                        </span>
                                    )}
                                </h1>
                                {(sexAgeLabelJa || sexAgeLabelEn) && (
                                    <div className="mt-2 text-sm font-medium text-[#666]">
                                        <span className="mr-2 font-bold" style={reportPreviewPrimaryStyle}>{previewLabel('性別・年齢', 'Sex / Age')}:</span>
                                        {isBilingual ? (
                                            <span className="flex flex-col leading-tight">
                                                <span>{sexAgeLabelJa || '-'}</span>
                                                <span className="mt-1 font-serif-en text-[13px] text-[#8b8b8b]">{sexAgeLabelEn || '-'}</span>
                                            </span>
                                        ) : (
                                            <span>{previewLang === 'ja' ? sexAgeLabelJa : sexAgeLabelEn}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="text-[15px] text-[#666] py-2 px-4 border-l-[3px]" style={{ ...reportPreviewSoftPanelStyle, ...reportPreviewPrimaryBorderStyle }}>
                                {(data.trainerNameJp || data.trainerNameEn) && (
                                    <span className="mr-3">
                                        <span className="font-bold mr-1">{previewLabel('調教師', 'Trainer')}:</span>
                                        {previewLang === 'ja' ? (data.trainerNameJp || data.trainerNameEn) : (data.trainerNameEn || data.trainerNameJp)}
                                    </span>
                                )}
                                {/* Multilingual Sire/Dam Display */}
                                <span className="font-bold mr-1">{previewLabel('父', 'Sire')}:</span>
                                {previewLang === 'ja' ? (data.sireJp || data.sire) : (data.sireEn || data.sire)}
                                <span className="mx-2 text-gray-400">×</span>
                                <span className="font-bold mr-1">{previewLabel('母', 'Dam')}:</span>
                                {previewLang === 'ja' ? (data.damJp || data.dam) : (data.damEn || data.dam)}
                            </div>
                        </div>

                        {/* Main Photo - Reduced width to save vertical space */}
                        <div className="print-photo w-[85%] mx-auto aspect-[4/3] bg-[#eee] mb-5 relative overflow-hidden rounded-[2px] shadow-sm">
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
                                    {t('noPhotoSelected')}
                                </div>
                            )}
                        </div>

                        {/* Data Section - Compact Height (Reduced from 220px to 120px) */}
                        <div className="print-data-section mb-4 flex gap-5 min-h-[132px]">
                                {/* Stats Grid - 1 row, 3 columns (Reordered: Training, Condition, Weight -> Chart) */}
                            <div className="flex-[1.18] grid grid-cols-[1.18fr_1fr_1.02fr] gap-[8px] min-w-0">
                                <div className="min-w-0 p-3 flex flex-col justify-center border-t-[3px] border-[#ddd]" style={reportPreviewSoftPanelStyle}>
                                    <span className="text-[10px] text-[#666] mb-1">{previewMicroLabel('調教状況', 'Training')}</span>
                                    <span className="text-[15px] text-[#333] font-serif-jp leading-snug break-keep whitespace-normal">
                                        {previewLang === 'ja' ? (data.trainingStatusJp || '-') : (data.trainingStatusEn || '-')}
                                    </span>
                                </div>
                                <div className="min-w-0 p-3 flex flex-col justify-center border-t-[3px] border-[#ddd]" style={reportPreviewSoftPanelStyle}>
                                    <span className="text-[10px] text-[#666] mb-1">{previewMicroLabel('体調', 'Condition')}</span>
                                    <span className="text-[15px] text-[#333] leading-snug break-keep whitespace-normal">
                                        {previewLang === 'ja' ? (data.conditionJp || '-') : (data.conditionEn || '-')}
                                    </span>
                                </div>
                                <div className="min-w-0 p-3 flex flex-col justify-center border-t-[3px]" style={{ ...reportPreviewSoftPanelStyle, ...reportPreviewAccentBorderStyle }}>
                                    <span className="text-[10px] text-[#666] mb-1">{previewMicroLabel('現在の体重', 'Current Weight')}</span>
                                    <span className="font-serif-en text-xl font-bold" style={reportPreviewPrimaryStyle}>{data.weight || '-'}</span>
                                </div>
                                {/* Target Removed */}
                            </div>

                            {/* Chart - Responsive height */}
                            <div className="flex-1 relative pt-1 min-w-0">
                                <span className="text-xs font-bold block mb-1 border-b border-[#ddd] pb-1 cursor-default" style={reportPreviewPrimaryStyle}>
                                    {previewLabel('体重推移', 'Weight History')}
                                </span>
                                <div className="h-[102px] w-full">
                                    <SimpleLineChart data={previewWeightHistory} color="var(--brand-primary)" />
                                </div>
                            </div>
                        </div>

                        {/* Comment Section */}
                        <div className="print-comment-box border border-[#ddd] p-5 relative bg-white min-h-[160px] mt-4 flex-1">
                            <span className="absolute -top-3 left-5 bg-white px-2 font-serif-en font-bold text-sm" style={reportPreviewPrimaryStyle}>
                                {previewLabel('コメント', 'Comment')}
                            </span>
                            {outputMode === 'bilingual' ? (
                                <div className="space-y-4">
                                    <div className="print-comment-ja text-[13px] leading-[1.8] text-justify whitespace-pre-wrap font-sans text-[#333]">
                                        {data.commentJp}
                                    </div>
                                    {data.commentEn && (
                                        <div className="print-comment-en border-t border-[#eee] pt-3 text-[13px] leading-[1.8] text-justify font-serif-en text-[#333] whitespace-normal break-words">
                                            {data.commentEn}
                                        </div>
                                    )}
                                </div>
                            ) : previewLang === 'ja' ? (
                                <div className="print-comment-ja text-[13px] leading-[1.8] text-justify whitespace-pre-wrap font-sans text-[#333]">
                                    {data.commentJp}
                                </div>
                            ) : (
                                <div className="print-comment-en text-[13px] leading-[1.8] text-justify font-serif-en text-[#333] whitespace-normal break-words">
                                    {data.commentEn || ''}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <footer className="print-footer mt-6 border-t border-[#f0f0f0] pt-4 text-center text-[10px] text-[#aaa] font-serif-en tracking-widest">
                            {branding.farmName}{data.clientLocation ? ` - ${data.clientLocation}` : ''} | {previewLang === 'ja' ? data.reportDate.replace(/\./g, '/') : formatDateUK(data.reportDate)}
                        </footer>
                    </div>
                    </div>

                    {appendixCareRecords.length > 0 && (
                        <section
                            className="print-sheet print-appendix-sheet bg-white shadow-2xl mt-0 border-t-2 pt-8"
                            style={{
                                ...reportPreviewAccentBorderStyle,
                                minHeight: '297mm',
                                padding: '28px 30px 18px 30px',
                                boxSizing: 'border-box'
                            }}
                        >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="font-serif-en text-2xl font-bold tracking-[0.16em]" style={reportPreviewPrimaryStyle}>
                                            {t('appendixTitle')}
                                        </div>
                                        <div className="mt-2 text-sm text-stone-500">
                                            {t('appendixSubtitle')}
                                        </div>
                                    </div>
                                    <div className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500" style={reportPreviewSoftPanelStyle}>
                                        Premium Care
                                    </div>
                                </div>

                                <div className="mt-6 space-y-4">
                                    {appendixCareRecords.map((record, index) => (
                                        <div key={record.id} className="rounded-2xl border border-stone-200 bg-white p-5">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
                                                    {previewLabel('治療記録', 'Care Record')} #{index + 1}
                                                </div>
                                                <div className="text-sm font-semibold text-stone-700">
                                                    {record.date || '-'}
                                                </div>
                                            </div>
                                            <div className="mt-3 text-[13px] leading-[1.8] text-[#333] whitespace-pre-wrap">
                                                {record.note || '-'}
                                            </div>
                                            {record.images.length > 0 && (
                                                <div className="mt-4 grid grid-cols-2 gap-3">
                                                    {record.images.map((image) => (
                                                        <div key={image.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                                            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100">
                                                                {image.url ? (
                                                                    // eslint-disable-next-line @next/next/no-img-element
                                                                    <img src={image.url} alt={image.caption || 'Care attachment'} className="h-full w-full object-contain" />
                                                                ) : (
                                                                    <div className="flex h-full items-center justify-center text-xs text-stone-400">{t('loading')}</div>
                                                                )}
                                                            </div>
                                                            {image.caption && (
                                                                <div className="mt-2 text-xs leading-6 text-stone-600">
                                                                    {image.caption}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                        </section>
                    )}

                </div>
            </div>

            <div className="print-only-root hidden">
                <div id="report-preview-print" className="mx-auto" style={{ width: '210mm' }}>
                    <div className="print-sheet print-main-sheet bg-white" style={{ minHeight: '297mm', padding: '12mm 12mm 10mm 12mm', boxSizing: 'border-box' }}>
                        <div className="border-b-2 pb-3 flex items-start justify-between" style={reportPreviewAccentBorderStyle}>
                            <div>
                                <div className="font-serif-en text-xl font-bold tracking-[0.16em]" style={reportPreviewPrimaryStyle}>{branding.farmName}</div>
                                <div className="font-serif-en text-xl font-bold tracking-[0.16em]" style={reportPreviewPrimaryStyle}>REPORTS</div>
                            </div>
                            <div className="text-right">
                                <div className="font-serif-en text-xl font-bold whitespace-pre-line leading-tight" style={reportPreviewPrimaryStyle}>
                                    {previewLabel('月次レポート', 'Monthly Report').replace(' / ', '\n')}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 flex items-start justify-between gap-4">
                            <div>
                                <div className={`${previewLang === 'ja' ? 'font-serif-jp text-3xl' : 'font-serif-en text-3xl'} font-bold text-gray-800`}>
                                    {previewLang === 'ja' ? (data.horseNameJp || '（馬名を入力）') : (data.horseNameEn || '(Horse Name)')}
                                </div>
                                {isBilingual && (
                                    <div className={`mt-1 ${previewLang === 'ja' ? 'font-serif-en text-lg' : 'font-serif-jp text-base'} font-bold`} style={reportPreviewAccentStyle}>
                                        {previewLang === 'ja' ? (data.horseNameEn || '') : (data.horseNameJp || '')}
                                    </div>
                                )}
                                {(sexAgeLabelJa || sexAgeLabelEn) && (
                                    <div className="mt-2 text-sm text-stone-600">
                                        <span className="font-bold" style={reportPreviewPrimaryStyle}>{previewLabel('性別・年齢', 'Sex / Age')}:</span>{' '}
                                        {previewLang === 'ja' ? sexAgeLabelJa : sexAgeLabelEn}
                                    </div>
                                )}
                            </div>
                            <div className="max-w-[46%] rounded-lg px-3 py-2 text-sm text-stone-600" style={reportPreviewSoftPanelStyle}>
                                {(data.trainerNameJp || data.trainerNameEn) && (
                                    <div className="mb-1">
                                        <span className="font-bold">{previewLabel('調教師', 'Trainer')}:</span>{' '}
                                        {previewLang === 'ja' ? (data.trainerNameJp || data.trainerNameEn) : (data.trainerNameEn || data.trainerNameJp)}
                                    </div>
                                )}
                                <div>
                                    <span className="font-bold">{previewLabel('父', 'Sire')}:</span> {previewLang === 'ja' ? (data.sireJp || data.sire) : (data.sireEn || data.sire)}
                                </div>
                                <div>
                                    <span className="font-bold">{previewLabel('母', 'Dam')}:</span> {previewLang === 'ja' ? (data.damJp || data.dam) : (data.damEn || data.dam)}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-[1.1fr_0.9fr] gap-4">
                            <div className="relative aspect-[4/3] overflow-hidden rounded bg-stone-100">
                                {data.mainPhoto ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={data.mainPhoto} alt="Main" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full items-center justify-center text-sm text-stone-400">{t('noPhotoSelected')}</div>
                                )}
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="rounded p-3" style={reportPreviewSoftPanelStyle}>
                                        <div className="text-[10px] text-stone-500">{previewLabel('調教状況', 'Training')}</div>
                                        <div className="mt-1 text-sm text-stone-800">{previewLang === 'ja' ? (data.trainingStatusJp || '-') : (data.trainingStatusEn || '-')}</div>
                                    </div>
                                    <div className="rounded p-3" style={reportPreviewSoftPanelStyle}>
                                        <div className="text-[10px] text-stone-500">{previewLabel('体調', 'Condition')}</div>
                                        <div className="mt-1 text-sm text-stone-800">{previewLang === 'ja' ? (data.conditionJp || '-') : (data.conditionEn || '-')}</div>
                                    </div>
                                    <div className="rounded p-3" style={reportPreviewSoftPanelStyle}>
                                        <div className="text-[10px] text-stone-500">{previewLabel('現在の体重', 'Current Weight')}</div>
                                        <div className="mt-1 text-lg font-bold" style={reportPreviewPrimaryStyle}>{data.weight || '-'}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 border-b pb-1 text-xs font-bold" style={reportPreviewPrimaryStyle}>{previewLabel('体重推移', 'Weight History')}</div>
                                    <div className="h-[90px]">
                                        <SimpleLineChart data={previewWeightHistory} color="var(--brand-primary)" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 border border-stone-200 p-4">
                            <div className="mb-3 text-sm font-bold" style={reportPreviewPrimaryStyle}>{previewLabel('コメント', 'Comment')}</div>
                            {outputMode === 'bilingual' ? (
                                <div className="space-y-3">
                                    <div className="text-[12px] leading-7 whitespace-pre-wrap text-stone-800">{data.commentJp}</div>
                                    {data.commentEn && <div className="border-t pt-3 text-[12px] leading-7 text-stone-800">{data.commentEn}</div>}
                                </div>
                            ) : previewLang === 'ja' ? (
                                <div className="text-[12px] leading-7 whitespace-pre-wrap text-stone-800">{data.commentJp}</div>
                            ) : (
                                <div className="text-[12px] leading-7 text-stone-800">{data.commentEn}</div>
                            )}
                        </div>

                        <div className="mt-4 border-t pt-3 text-center text-[10px] tracking-[0.18em] text-stone-400">
                            {branding.farmName}{data.clientLocation ? ` - ${data.clientLocation}` : ''} | {previewLang === 'ja' ? data.reportDate.replace(/\./g, '/') : formatDateUK(data.reportDate)}
                        </div>
                    </div>

                    {appendixCareRecords.length > 0 && (
                        <div className="print-sheet print-appendix-sheet bg-white" style={{ minHeight: '297mm', padding: '12mm 12mm 10mm 12mm', boxSizing: 'border-box' }}>
                            <div className="flex items-start justify-between gap-4 border-b-2 pb-3" style={reportPreviewAccentBorderStyle}>
                                <div>
                                    <div className="font-serif-en text-2xl font-bold tracking-[0.16em]" style={reportPreviewPrimaryStyle}>{t('appendixTitle')}</div>
                                    <div className="mt-1 text-sm text-stone-500">{t('appendixSubtitle')}</div>
                                </div>
                                <div className="rounded-xl border border-stone-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500" style={reportPreviewSoftPanelStyle}>
                                    Premium Care
                                </div>
                            </div>

                            <div className="mt-5 space-y-4">
                                {appendixCareRecords.map((record, index) => (
                                    <div key={record.id} className="rounded-2xl border border-stone-200 bg-white p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-stone-400">
                                                {previewLabel('治療記録', 'Care Record')} #{index + 1}
                                            </div>
                                            <div className="text-sm font-semibold text-stone-700">{record.date || '-'}</div>
                                        </div>
                                        <div className="mt-3 text-[13px] leading-7 whitespace-pre-wrap text-stone-800">{record.note || '-'}</div>
                                        {record.images.length > 0 && (
                                            <div className="mt-4 grid grid-cols-2 gap-3">
                                                {record.images.map((image) => (
                                                    <div key={image.id} className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                                                        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100">
                                                            {image.url ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img src={image.url} alt={image.caption || 'Care attachment'} className="h-full w-full object-contain" />
                                                            ) : (
                                                                <div className="flex h-full items-center justify-center text-xs text-stone-400">{t('loading')}</div>
                                                            )}
                                                        </div>
                                                        {image.caption && <div className="mt-2 text-xs leading-6 text-stone-600">{image.caption}</div>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
