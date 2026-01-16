'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Save, Printer, RefreshCw, Check } from 'lucide-react';
import Link from 'next/link';

export default function ReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Initial Data for Template
    const [initialData, setInitialData] = useState<Partial<ReportData>>({});
    const [horseId, setHorseId] = useState<string | null>(null);

    // Current Data (Synced from Child)
    const reportDataRef = useRef<ReportData | null>(null);

    useEffect(() => {
        if (id) fetchReportData();
    }, [id]);

    async function fetchReportData() {
        const { data: report, error } = await supabase.from('reports').select('*').eq('id', id).single();
        if (error || !report) {
            console.error("Report not found");
            return;
        }

        // Fetch Horse Data
        const { data: horse } = await supabase.from('horses').select('*').eq('id', report.horse_id).single();

        setHorseId(report.horse_id);

        // Map DB to ReportData
        setInitialData({
            horseName: horse?.name || '',
            horseNameEn: horse?.name_en || '',
            sire: horse?.sire || '',
            dam: horse?.dam || '',
            comment: report.body || '',
            weight: report.weight ? `${report.weight} kg` : '',
            training: report.status_training || '',
            condition: report.condition || '',
            target: report.target || '',
            mainPhoto: report.main_photo_url || horse?.photo_url || '',
            logo: null // Logo usually static or fetched separately? For now null.
        });

        setLoading(false);
    }

    const handleDataChange = useCallback((data: ReportData) => {
        reportDataRef.current = data;
    }, []);

    async function saveReport() {
        if (!reportDataRef.current || !id) return;
        setSaving(true);
        const d = reportDataRef.current;

        // Update Report
        const { error: rError } = await supabase.from('reports').update({
            body: d.comment,
            weight: parseFloat(d.weight.replace(/[^0-9.]/g, '')),
            status_training: d.training,
            condition: d.condition,
            target: d.target,
            main_photo_url: d.mainPhoto,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        // Update Horse (Name/Sire/Dam/Photo if changed)
        if (horseId) {
            await supabase.from('horses').update({
                name: d.horseName,
                name_en: d.horseNameEn,
                sire: d.sire,
                dam: d.dam,
                // Only update horse photo if report main photo changed? 
                // Maybe optional. User might want report photo specific.
                // We'll leave horse photo alone for now or update it if it was empty.
                updated_at: new Date().toISOString()
            }).eq('id', horseId);
        }

        setSaving(false);
        setLastSaved(new Date());
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading Report...</div>;

    return (
        <div className="min-h-screen flex flex-col items-center py-8 font-sans print:py-0 print:block bg-gray-100">
            {/* Control Panel (Hidden in Print) */}
            <div className="control-panel w-[210mm] bg-[#222] text-white p-4 rounded-md mb-6 flex justify-between items-center shadow-lg no-print sticky top-4 z-50">
                <div className="flex items-center gap-4">
                    <Link href={`/horses/${horseId}`} className="text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">Report Editor</span>
                        {lastSaved && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Check size={8} /> Saved {lastSaved.toLocaleTimeString()}</span>}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={saveReport}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        <Save size={16} /> {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--color-accent)] hover:brightness-110 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        <Printer size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Main Report */}
            <ReportTemplate initialData={initialData} onDataChange={handleDataChange} />
        </div>
    );
}
