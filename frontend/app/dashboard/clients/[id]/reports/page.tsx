'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Printer } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const runtime = 'edge';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    owner_id: string;
    photo_url: string | null;
    sire: string;
    sire_en?: string | null;
    dam: string;
    dam_en?: string | null;
    birth_date?: string | null;
    clients?: { name: string } | null;
    trainers?: {
        trainer_name?: string | null;
        trainer_name_en?: string | null;
        trainer_location?: string | null;
        trainer_location_en?: string | null;
    } | null;
};

type Report = {
    id: string;
    created_at: string;
    title: string | null;
    body: string | null;
    weight: number | null;
    status_training: string | null;
    condition?: string | null;
    target: string | null;
    horse_id: string;
    main_photo_url: string | null;
    metrics_json?: {
        commentEn?: string | null;
        statusEn?: string | null;
        targetEn?: string | null;
        weightHistory?: { label: string; value: number }[];
        showLogo?: boolean | null;
        sireEn?: string | null;
        sireJp?: string | null;
        damEn?: string | null;
        damJp?: string | null;
        conditionEn?: string | null;
        conditionJp?: string | null;
    };
};
type ReportRow = Report & { horses?: Horse | null };

export default function ClientBatchReports() {
    const { id } = useParams(); // Client ID
    const router = useRouter();
    const { t } = useLanguage(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true);
    const refreshKey = useResumeRefresh();
    const [owner, setOwner] = useState<{ id: string; name: string; report_output_mode?: string | null } | null>(null);
    const [reports, setReports] = useState<{ report: Report, horse: Horse, data: ReportData }[]>([]);

    const searchParams = useSearchParams();
    const isPrintView = searchParams?.get('print') === '1';
    const initialLogoParam = searchParams?.get('logo');
    const [showLogoInPrint, setShowLogoInPrint] = useState(() => {
        if (initialLogoParam === '0') return false;
        if (initialLogoParam === '1') return true;
        return true;
    });
    const [isPrinting, setIsPrinting] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(() => {
        if (typeof window !== 'undefined') {
            const cached = window.sessionStorage.getItem('batchReportsMonth');
            if (cached) return cached;
        }
        const paramMonth = searchParams?.get('month');
        if (paramMonth) return paramMonth;
        const now = new Date();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${now.getFullYear()}-${month}`;
    });

    const { user, session } = useAuth(); // Add useAuth

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const calculateHorseAge = (birthDate?: string | null) => {
        if (!birthDate) return null;
        const year = new Date(birthDate).getFullYear();
        if (Number.isNaN(year)) return null;
        return new Date().getFullYear() - year;
    };

    const getRestHeaders = () => {
        if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
            throw new Error('Missing env vars or access token for REST');
        }
        return {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        };
    };

    const restGet = async (path: string) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: getRestHeaders() });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST GET failed: ${res.status} ${text}`);
        }
        return res.json();
    };

    useEffect(() => {
        document.body.classList.add('batch-print');
        document.body.classList.add('batch-preview');
        if (isPrintView) {
            document.body.classList.add('batch-print-view');
        }
        return () => {
            document.body.classList.remove('batch-print');
            document.body.classList.remove('batch-preview');
            document.body.classList.remove('batch-print-view');
        };
    }, [isPrintView]);

    const applyPrintInlineStyles = () => {
        const mark = (el: Element | null) => {
            if (!el || (el as HTMLElement).dataset.prevStyle) return;
            (el as HTMLElement).dataset.prevStyle = (el as HTMLElement).getAttribute('style') || '';
        };
        const setStyle = (el: Element | null, styles: Record<string, string>) => {
            if (!el) return;
            mark(el);
            Object.entries(styles).forEach(([k, v]) => {
                (el as HTMLElement).style.setProperty(k, v, 'important');
            });
        };
        document.body.classList.add('printing');
        setIsPrinting(true);

        setStyle(document.documentElement, { height: 'auto', overflow: 'visible' });
        setStyle(document.body, { height: 'auto', overflow: 'visible', background: 'white' });
        setStyle(document.getElementById('__next'), { height: 'auto', overflow: 'visible' });
        setStyle(document.querySelector('.batch-report-page'), { height: 'auto', overflow: 'visible', display: 'block' });
        setStyle(document.querySelector('.reports-list'), { display: 'block', width: '100%' });
        document.querySelectorAll('.no-print').forEach((el) => setStyle(el, { display: 'none' }));
    };

    const cleanupPrintInlineStyles = () => {
        const reset = (el: Element | null) => {
            if (!el) return;
            const prev = (el as HTMLElement).dataset.prevStyle;
            if (prev !== undefined) {
                if (prev) {
                    (el as HTMLElement).setAttribute('style', prev);
                } else {
                    (el as HTMLElement).removeAttribute('style');
                }
                delete (el as HTMLElement).dataset.prevStyle;
            }
        };
        document.body.classList.remove('printing');
        setIsPrinting(false);

        reset(document.documentElement);
        reset(document.body);
        reset(document.getElementById('__next'));
        reset(document.querySelector('.batch-report-page'));
        reset(document.querySelector('.reports-list'));
        document.querySelectorAll('.no-print').forEach((el) => reset(el));
    };

    useEffect(() => {
        const handleBeforePrint = () => applyPrintInlineStyles();
        const handleAfterPrint = () => cleanupPrintInlineStyles();
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    const handlePrint = () => {
        const url = new URL(window.location.href);
        url.searchParams.set('print', '1');
        url.searchParams.set('logo', showLogoInPrint ? '1' : '0');
        url.searchParams.set('month', selectedMonth);
        window.location.assign(url.toString());
    };

    useEffect(() => {
        const paramMonth = searchParams?.get('month');
        if (paramMonth && paramMonth !== selectedMonth) {
            setSelectedMonth(paramMonth);
        }
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('batchReportsMonth', selectedMonth);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, selectedMonth]);

    useEffect(() => {
        if (!isPrintView) return;
        if (loading) return;
        if (reports.length === 0) return;
        const timer = window.setTimeout(() => {
            applyPrintInlineStyles();
            window.print();
        }, 300);
        return () => window.clearTimeout(timer);
    }, [isPrintView, loading, reports.length]);

    useEffect(() => {
        if (!id || !session?.access_token) return; // Wait for auth

        let isMounted = true;
        const fetchData = async (retryCount = 0) => {
            setLoading(true);

            try {
                const resolveMonth = async () => {
                    const paramMonth = searchParams?.get('month');
                    if (paramMonth) return paramMonth;

                    if (typeof window !== 'undefined') {
                        const cached = window.sessionStorage.getItem('batchReportsMonth');
                        if (cached) return cached;
                    }

                    if (isPrintView) {
                        try {
                            const latest = await restGet(
                                `reports?select=title,horses!inner(id)` +
                                `&horses.owner_id=eq.${id}` +
                                `&review_status=eq.approved` +
                                `&order=title.desc` +
                                `&limit=1`
                            ) as { title?: string | null }[];
                            const title = latest?.[0]?.title || '';
                            if (title && /^\d{4}\.\d{2}$/.test(title)) {
                                return title.replace('.', '-');
                            }
                        } catch {
                            // fall through to selectedMonth
                        }
                    }

                    return selectedMonth;
                };

                const effectiveMonth = await resolveMonth();
                if (effectiveMonth !== selectedMonth) {
                    setSelectedMonth(effectiveMonth);
                }
                if (isPrintView && searchParams && !searchParams.get('month')) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('month', effectiveMonth);
                    window.history.replaceState({}, '', url.toString());
                }

                const [year, month] = effectiveMonth.split('-').map((v) => parseInt(v, 10));
                const startOfMonth = `${year}.${String(month).padStart(2, '0')}`;
                const nextMonthDate = new Date(year, month, 1);
                const nextMonth = `${nextMonthDate.getFullYear()}.${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

                // 1. Fetch Client
                const clientRaw = await restGet(`clients?select=*&id=eq.${id}`);
                const client = clientRaw && clientRaw.length > 0 ? clientRaw[0] : null;
                if (isMounted && client) setOwner(client);

                // 2. Fetch horse ids for this owner
                const ownerHorses = await restGet(
                    `horses?select=id&owner_id=eq.${id}`
                ) as { id: string }[];
                const horseIds = ownerHorses.map((h) => h.id);

                if (horseIds.length === 0) {
                    if (isMounted) setReports([]);
                    return;
                }

                // 3. Fetch Reports for those horses in the selected month
                const reportsData = await restGet(
                    `reports?select=*` +
                    `&horse_id=in.(${horseIds.join(',')})` +
                    `&title=gte.${startOfMonth}` +
                    `&title=lt.${nextMonth}` +
                    `&review_status=eq.approved` +
                    `&order=horse_id`
                ) as ReportRow[];

                if (isMounted) {
                    if (Array.isArray(reportsData) && reportsData.length > 0) {
                        const idList = Array.from(
                            new Set(reportsData.map((r) => r.horse_id).filter(Boolean))
                        ).join(',');

                        const horsesById = new Map<string, Horse>();
                        if (idList) {
                            const horses = await restGet(
                                `horses?select=id,name,name_en,sire,sire_en,dam,dam_en,photo_url,birth_date,clients(name),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en)` +
                                `&id=in.(${idList})`
                            ) as Horse[];
                            horses.forEach((h) => horsesById.set(h.id, h));
                        }

                        const formattedReports = reportsData.map((r: ReportRow) => {
                            const horse = horsesById.get(r.horse_id) || null;
                            if (!horse) return null;

                            const metrics = r.metrics_json || {};
                            const rData: ReportData = {
                                reportDate: r.title || r.created_at.slice(0, 10).replace(/-/g, '.'),
                                horseNameJp: horse.name,
                                horseNameEn: horse.name_en,
                                sire: horse.sire,
                                sireEn: horse.sire_en || metrics.sireEn || '',
                                sireJp: horse.sire || metrics.sireJp || '',
                                dam: horse.dam,
                                damEn: horse.dam_en || metrics.damEn || '',
                                damJp: horse.dam || metrics.damJp || '',
                                ownerName: horse.clients?.name || owner?.name || '',
                                trainerNameJp: horse.trainers?.trainer_name || '',
                                trainerNameEn: horse.trainers?.trainer_name_en || '',
                                trainerLocation: horse.trainers?.trainer_location || '',
                                trainerLocationEn: horse.trainers?.trainer_location_en || '',
                                birthDate: horse.birth_date || '',
                                age: calculateHorseAge(horse.birth_date),
                                conditionJp: metrics.conditionJp || r.condition || '-',
                                conditionEn: metrics.conditionEn || '-',
                                commentJp: r.body || '',
                                commentEn: metrics.commentEn || '',
                                weight: r.weight ? `${r.weight}kg` : '',
                                statusJp: r.status_training || '',
                                statusEn: metrics.statusEn || '',
                                trainingStatusJp: r.status_training || '',
                                trainingStatusEn: metrics.statusEn || '',
                                targetJp: r.target || '',
                                targetEn: metrics.targetEn || '',
                                weightHistory: metrics.weightHistory || [],
                                mainPhoto: r.main_photo_url || horse.photo_url || '',
                                showLogo: metrics.showLogo ?? true,
                                logo: null
                            };
                            return { report: r, horse: horse, data: rData };
                        }).filter((item): item is { report: Report; horse: Horse; data: ReportData } => item !== null);

                        console.log('[batch] reportsData', reportsData.length, 'formatted', formattedReports.length);

                        setReports(formattedReports);
                    } else {
                        setReports([]);
                    }
                }
            } catch (error: unknown) {
                console.error("Error loading batch reports:", error);

                if (isMounted && retryCount < 2) {
                    console.log(`Retrying batch load... (${retryCount + 1})`);
                    setTimeout(() => fetchData(retryCount + 1), 500);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.id, session?.access_token, refreshKey, selectedMonth]);

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className={`min-h-screen bg-gray-100 font-sans print:bg-white batch-report-page ${isPrintView ? 'overflow-visible' : 'overflow-y-auto'}`}>
            {!isPrintView && (
                <div className="bg-[#222] text-white p-4 no-print flex justify-between items-center sticky top-0 z-50 shadow-md">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="hover:text-gray-300"><ArrowLeft /></button>
                        <div>
                            <h1 className="font-bold text-lg">{owner?.name || 'Client'} - Batch Reports</h1>
                            <p className="text-xs text-gray-400">Total: {reports.length} reports / Rendered: {reports.length}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-xs text-gray-200">
                            <span className="font-bold text-gray-100">月</span>
                            <input
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-white text-black rounded px-2 py-1 text-xs border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1a3c34]"
                            />
                        </label>
                        <label className="flex items-center gap-2 text-xs text-gray-200">
                            <input
                                type="checkbox"
                                checked={showLogoInPrint}
                                onChange={(e) => setShowLogoInPrint(e.target.checked)}
                                className="h-4 w-4"
                            />
                            ロゴを表示
                        </label>
                        <button
                            onClick={handlePrint}
                            className="bg-white text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-200"
                        >
                            <Printer size={18} /> Print / PDF
                        </button>
                    </div>
                </div>
            )}

            {/* Reports List */}
            <div className="reports-list flex flex-col items-center py-10 print:py-0 print:block">
                {reports.length === 0 ? (
                    <div className="text-gray-500 mt-10">No reports found for this month.</div>
                ) : (
                    reports.map((item) => (
                        <div key={item.report.id} className="relative w-[210mm] print:w-full mb-10 print:mb-0 page-break-after-always bg-white shadow-lg print:shadow-none">
                            {/* Wrapper to control page break */}
                            <div className="print:block">
                                <ReportTemplate
                                    initialData={{ ...item.data, showLogo: showLogoInPrint }}
                                    readOnly={true}
                                    batchPrint={true}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                body.batch-preview {
                    overflow: auto !important;
                }
                body.batch-preview #__next {
                    height: auto !important;
                    overflow: visible !important;
                }
                body.batch-preview .batch-report-page {
                    height: auto !important;
                    overflow: auto !important;
                }
                body.batch-print-view,
                body.batch-print-view #__next,
                body.batch-print-view .batch-report-page {
                    overflow: visible !important;
                    height: auto !important;
                    background: white !important;
                }
                body.batch-print-view .no-print,
                body.batch-print-view aside,
                body.batch-print-view nav,
                body.batch-print-view .sidebar,
                body.batch-print-view .side-nav {
                    display: none !important;
                }
                body.batch-print-view .batch-report-page {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 5mm;
                    }
                    .no-print { display: none !important; }
                    html, body, #__next {
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body.printing * { visibility: visible !important; }
                    aside, nav, .sidebar, .side-nav { display: none !important; }
                    .batch-report-page { overflow: visible !important; height: auto !important; display: block !important; }
                    .batch-report-page > div { overflow: visible !important; height: auto !important; display: block !important; }
                    .reports-list { display: block !important; width: 100% !important; }
                    
                    /* Wrapper for each report page */
                    .page-break-after-always { 
                        page-break-after: always !important; 
                        break-after: page !important; 
                        break-inside: avoid-page !important;
                        page-break-inside: avoid !important;
                        position: static !important;
                        display: block;
                        width: 190mm;
                        height: auto;
                        overflow: visible;
                        margin: 0 auto;
                        padding: 0;
                        margin-bottom: 0; /* Avoid extra space */
                        padding-bottom: 0;
                    }
                    .page-break-after-always:not(:first-child) {
                        page-break-before: always !important;
                        break-before: page !important;
                    }

                    /* 
                       Override internal report styles.
                    */
                    .batch-report-page .report-preview {
                        position: static !important;
                        top: 0 !important;
                        left: 0 !important;
                        margin: 0 !important;
                        width: 190mm !important;
                        max-width: 190mm !important;
                        min-height: 0 !important;
                        height: auto !important;
                        padding: 6mm !important;
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        overflow: visible !important;
                        transform: none !important;
                        transform-origin: top center !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                }
            `}</style>
        </div>
    );
}
