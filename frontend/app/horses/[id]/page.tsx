'use client';
import { useEffect, useState } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, FileText, Calendar, Activity } from 'lucide-react';
import Link from 'next/link';

export default function HorseDetail() {
    const { id } = useParams();
    const router = useRouter();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [horse, setHorse] = useState<Record<string, any> | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [reports, setReports] = useState<Record<string, any>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;

        const fetchData = async () => {
            // 1. Fetch Horse
            const { data: horseData } = await supabase.from('horses').select('*').eq('id', id).single();
            if (horseData) setHorse(horseData);

            // 2. Fetch Reports
            const { data: reportsData } = await supabase.from('reports').select('*').eq('horse_id', id).order('created_at', { ascending: false });
            if (reportsData) setReports(reportsData);

            setLoading(false);
        };

        fetchData();
    }, [id]);

    async function createReport() {
        if (!horse) return;
        const { data, error } = await supabase.from('reports').insert([{
            horse_id: id,
            title: `${new Date().getMonth() + 1}月度 レポート`, // Default title
            status_training: 'Training',
            target: '未定',
            weight_date: new Date().toISOString()
        }]).select().single();

        if (data) {
            router.push(`/reports/${data.id}`);
        }
    }

    if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>;
    if (!horse) return <div className="p-10 text-center">Horse not found</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Nav */}
            <div className="bg-white border-b border-gray-200 px-4 h-14 flex items-center">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-bold">
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Horse Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex gap-6 items-start border border-gray-100">
                    <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {horse.photo_url && <img src={horse.photo_url} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">{horse.name}</h1>
                        <p className="text-lg text-gray-400 font-serif mb-4">{horse.name_en}</p>
                        <div className="flex gap-6 text-sm text-gray-500">
                            <div><span className="font-bold text-gray-300 block text-xs uppercase">Sire</span> {horse.sire || '-'}</div>
                            <div><span className="font-bold text-gray-300 block text-xs uppercase">Dam</span> {horse.dam || '-'}</div>
                        </div>
                    </div>
                    <button
                        onClick={createReport}
                        className="bg-[var(--color-primary)] hover:brightness-110 text-white px-5 py-2.5 rounded-full font-bold shadow-md flex items-center gap-2 transition-all"
                    >
                        <Plus size={18} /> New Report
                    </button>
                </div>

                {/* Reports List */}
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Report History</h2>

                {reports.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300 text-gray-400">
                        No reports yet. Create one!
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map(report => (
                            <Link href={`/reports/${report.id}`} key={report.id}>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-light-bg)] group-hover:text-[var(--color-primary)] transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-700">{report.title || 'Untitled Report'}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(report.created_at).toLocaleDateString()}</span>
                                                {report.status_training && <span className="flex items-center gap-1"><Activity size={10} /> {report.status_training}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-[var(--color-primary)]">{report.weight ? `${report.weight}kg` : '-'}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
