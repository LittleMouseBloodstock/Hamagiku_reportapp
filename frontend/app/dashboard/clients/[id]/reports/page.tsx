'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Printer } from 'lucide-react';

export const runtime = 'edge';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    owner_id: string;
    photo_url: string | null;
    sire: string;
    dam: string;
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metrics_json?: any;
};

export default function ClientBatchReports() {
    const { id } = useParams(); // Client ID
    const router = useRouter();
    const { t } = useLanguage(); // eslint-disable-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [owner, setOwner] = useState<any>(null);
    const [reports, setReports] = useState<{ report: Report, horse: Horse, data: ReportData }[]>([]);

    // Month Selection (Default: Current Month)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setLoading(true);

            // 1. Fetch Client
            const { data: client } = await supabase.from('clients').select('*').eq('id', id).single();
            if (client) setOwner(client);

            // 2. Fetch Horses owned by client
            const { data: horses } = await supabase.from('horses').select('*').eq('owner_id', id);

            if (horses && horses.length > 0) {
                const horseIds = horses.map(h => h.id);

                // 3. Fetch Reports for these horses in the selected month
                // Filter by created_at range
                const startOfMonth = `${selectedDate}-01`;
                // Calculate end of month roughly or just match YYYY-MM string match if possible? 
                // Supabase date filtering:
                const nextMonthDate = new Date(selectedDate + "-01");
                nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
                const endOfMonth = nextMonthDate.toISOString().slice(0, 10);

                const { data: reportsData } = await supabase
                    .from('reports')
                    .select('*')
                    .in('horse_id', horseIds)
                    .gte('created_at', startOfMonth)
                    .lt('created_at', endOfMonth)
                    .order('horse_id'); // Group by horse

                if (reportsData) {
                    // Map to ReportData format
                    const formattedReports = reportsData.map(r => {
                        const horse = horses.find(h => h.id === r.horse_id);
                        if (!horse) return null;

                        const metrics = r.metrics_json || {};
                        const rData: ReportData = {
                            reportDate: r.title || r.created_at.slice(0, 10).replace(/-/g, '.'),
                            horseNameJp: horse.name,
                            horseNameEn: horse.name_en,
                            sire: horse.sire,
                            sireEn: metrics.sireEn || '',
                            sireJp: metrics.sireJp || '',
                            dam: horse.dam,
                            damEn: metrics.damEn || '',
                            damJp: metrics.damJp || '',

                            commentJp: r.body || '',
                            commentEn: metrics.commentEn || '',

                            weight: r.weight ? `${r.weight}kg` : '',

                            statusJp: r.status_training || '',
                            statusEn: metrics.statusEn || '',

                            trainingStatusJp: r.status_training || '',
                            trainingStatusEn: metrics.statusEn || '', // Compatibility

                            targetJp: r.target || '',
                            targetEn: metrics.targetEn || '',

                            conditionJp: '', conditionEn: '', // Not always stored separately

                            weightHistory: metrics.weightHistory || [],
                            mainPhoto: r.main_photo_url || horse.photo_url || '',
                            logo: null
                        };

                        return { report: r, horse: horse, data: rData };
                    }).filter(item => item !== null) as { report: Report, horse: Horse, data: ReportData }[];

                    // Remove duplicates (keep latest per horse if multiple? For now show all)
                    setReports(formattedReports);
                } else {
                    setReports([]);
                }
            } else {
                setReports([]);
            }
            setLoading(false);
        };

        fetchData();
    }, [id, selectedDate]);

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-100 font-sans print:bg-white">
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
                    <input
                        type="month"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-black px-3 py-1 rounded text-sm font-bold"
                    />
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
                    reports.map((item, index) => (
                        <div key={item.report.id} className="relative w-[210mm] print:w-full mb-10 print:mb-0 page-break-after-always bg-white shadow-lg print:shadow-none">
                            {/* Wrapper to control page break */}
                            <div className="print:h-screen print:flex print:flex-col print:justify-start">
                                <ReportTemplate initialData={item.data} />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    .no-print { display: none !important; }
                    body { background: white; margin: 0; padding: 0; }
                    
                    /* Wrapper for each report page */
                    .page-break-after-always { 
                        page-break-after: always !important; 
                        break-after: page !important; 
                        position: relative;
                        display: block;
                        width: 210mm;
                        height: 270mm; /* SAFE HEIGHT: Less than 297mm to prevent spill */
                        overflow: hidden;
                        margin: 0 auto;
                        padding: 0;
                        margin-bottom: 0; /* Avoid extra space */
                        padding-bottom: 0;
                    }

                    /* 
                       Override internal report styles.
                    */
                    #report-preview {
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        margin: 0 !important;
                        width: 100% !important; 
                        height: 100% !important; 
                        box-shadow: none !important;
                        page-break-inside: avoid !important;
                        transform: scale(0.92); /* Shrink slightly more to be safe */
                        transform-origin: top center;
                    }
                }
            `}</style>
        </div>
    );
}
