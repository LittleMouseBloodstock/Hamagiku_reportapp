'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
};

type Report = {
    id: string;
    created_at: string;
    title: string | null;
    body: string | null;
    weight: number | null;
    status_training: string | null;
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

    const [showLogoInPrint, setShowLogoInPrint] = useState(true);

    const { user, session } = useAuth(); // Add useAuth

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
        if (!id || !session?.access_token) return; // Wait for auth

        let isMounted = true;
        const fetchData = async (retryCount = 0) => {
            setLoading(true);

            try {
                // 1. Fetch Client
                const clientRaw = await restGet(`clients?select=*&id=eq.${id}`);
                const client = clientRaw && clientRaw.length > 0 ? clientRaw[0] : null;
                if (isMounted && client) setOwner(client);

                // 2. Fetch Reports for horses owned by client in the selected month
                const reportsData = await restGet(
                    `reports?select=*,horses!inner(id,name,name_en,sire,sire_en,dam,dam_en,photo_url)` +
                    `&horses.owner_id=eq.${id}` +
                    `&review_status=eq.approved` +
                    `&order=horse_id`
                ) as ReportRow[];

                if (isMounted) {
                    if (Array.isArray(reportsData) && reportsData.length > 0) {
                        const formattedReports = reportsData.map((r: ReportRow) => {
                            const horse = r.horses;
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
                                commentJp: r.body || '',
                                commentEn: metrics.commentEn || '',
                                weight: r.weight ? `${r.weight}kg` : '',
                                statusJp: r.status_training || '',
                                statusEn: metrics.statusEn || '',
                                trainingStatusJp: r.status_training || '',
                                trainingStatusEn: metrics.statusEn || '',
                                targetJp: r.target || '',
                                targetEn: metrics.targetEn || '',
                                conditionJp: '', conditionEn: '',
                                weightHistory: metrics.weightHistory || [],
                                mainPhoto: r.main_photo_url || horse.photo_url || '',
                                showLogo: metrics.showLogo ?? true,
                                logo: null
                            };
                            return { report: r, horse: horse, data: rData };
                        }).filter((item): item is { report: Report; horse: Horse; data: ReportData } => item !== null);

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
    }, [id, user?.id, session?.access_token, refreshKey]);

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100 font-sans print:bg-white batch-report-page">
            {/* Header (No Print) */}
            <div className="bg-[#222] text-white p-4 no-print flex justify-between items-center sticky top-0 z-50 shadow-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="hover:text-gray-300"><ArrowLeft /></button>
                    <div>
                        <h1 className="font-bold text-lg">{owner?.name || 'Client'} - Batch Reports</h1>
                        <p className="text-xs text-gray-400">Total: {reports.length} reports</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
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
                        onClick={() => window.print()}
                        className="bg-white text-black px-4 py-2 rounded font-bold flex items-center gap-2 hover:bg-gray-200"
                    >
                        <Printer size={18} /> Print / PDF
                    </button>
                </div>
            </div>

            {/* Reports List */}
            <div className="flex flex-col items-center py-10 print:py-0 print:block">
                {reports.length === 0 ? (
                    <div className="text-gray-500 mt-10">No reports found for this month.</div>
                ) : (
                    reports.map((item) => (
                        <div key={item.report.id} className="relative w-[210mm] print:w-full mb-10 print:mb-0 page-break-after-always bg-white shadow-lg print:shadow-none">
                            {/* Wrapper to control page break */}
                            <div className="print:h-screen print:flex print:flex-col print:justify-start">
                                <ReportTemplate
                                    initialData={{ ...item.data, showLogo: showLogoInPrint }}
                                    readOnly={true}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 5mm;
                    }
                    .no-print { display: none !important; }
                    body { background: white; margin: 0; padding: 0; }
                    body * { visibility: hidden !important; }
                    .batch-report-page, .batch-report-page * { visibility: visible !important; }
                    
                    /* Wrapper for each report page */
                    .page-break-after-always { 
                        page-break-after: always !important; 
                        break-after: page !important; 
                        position: relative;
                        display: block;
                        width: 210mm;
                        height: auto;
                        overflow: hidden;
                        margin: 0 auto;
                        padding: 0;
                        margin-bottom: 0; /* Avoid extra space */
                        padding-bottom: 0;
                    }

                    /* 
                       Override internal report styles.
                    */
                    .batch-report-page #report-preview {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        margin: 0 !important;
                        width: 200mm !important;
                        height: auto !important;
                        min-height: 0 !important;
                        padding: 12mm 10mm 8mm 10mm !important;
                        box-sizing: border-box !important;
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        transform: none !important;
                        transform-origin: top center;
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    );
}
