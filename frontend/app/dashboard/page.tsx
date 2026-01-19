'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Dashboard() {
    const { language, t } = useLanguage();
    const router = useRouter();

    interface DashboardReport {
        id: string;
        title: string;
        created: string;
        author: string;
        status: string;
        languages: string[];
        horses?: { name: string; name_en: string; };
        horse_id?: string;
    }

    const [reports, setReports] = useState<DashboardReport[]>([]);
    // Hardcoded stats for demo (replace with real data later)
    const [stats, setStats] = useState({
        totalReports: 0,
        activeHorses: 0,
        clients: 0,
        pendingReview: 0
    });

    useEffect(() => {
        const fetchReports = async () => {
            // 1. Fetch Reports & Pending Reports
            const { data, error } = await supabase
                .from('reports')
                .select('*, horse_id, horses(name, name_en)')
                .order('created_at', { ascending: false });

            // ... (stats fetching codes) ...

            // 2. Fetch Stats Counts
            const { count: reportsCount } = await supabase.from('reports').select('*', { count: 'exact', head: true });
            const { count: horsesCount } = await supabase.from('horses').select('*', { count: 'exact', head: true });
            const { count: clientsCount } = await supabase.from('clients').select('*', { count: 'exact', head: true });
            const { count: pendingCount } = await supabase.from('reports').select('*', { count: 'exact', head: true }).in('review_status', ['pending_jp_check', 'pending_en_check']);

            setStats({
                totalReports: reportsCount || 0,
                activeHorses: horsesCount || 0,
                clients: clientsCount || 0,
                pendingReview: pendingCount || 0
            });

            if (error) {
                console.error('Error fetching reports:', error);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const formatted = data?.map((r: any) => {
                    // Determine title
                    const title = r.title || (language === 'ja' ? r.horses?.name : r.horses?.name_en) || 'Untitled';
                    // Determine languages
                    const langs = [];
                    if (r.body) langs.push('JP');
                    if (r.metrics_json?.commentEn) langs.push('EN');
                    if (langs.length === 0) langs.push('JP');

                    return {
                        id: r.id,
                        title: title,
                        created: new Date(r.created_at).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
                        author: 'You',
                        status: r.review_status || 'draft',
                        languages: langs,
                        horses: r.horses,
                        horse_id: r.horse_id
                    };
                }) || [];
                setReports(formatted);
            }
        };
        fetchReports();
    }, [language]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">dashboard</span>
                    {t('dashboard')}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link
                        href="/reports/new"
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[#1a3c34] text-white rounded-lg shadow-sm hover:bg-[#122b25] transition-all ring-1 ring-[#1a3c34]/20"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">{t('newReport')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">description</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">Total Reports</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.totalReports}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">format_list_bulleted</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">Active Horses</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.activeHorses}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">group</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">Clients</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.clients}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">schedule</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">Pending Review</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.pendingReview}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-200 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-stone-800">{t('recentReports') || 'Recent Reports'}</h2>
                        <button className="text-stone-400 hover:text-stone-600">
                            <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('horseName')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reportTitle')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('date')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('status')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-stone-50 transition-colors cursor-pointer" onClick={() => router.push(`/reports/${report.id}`)}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-1.5 w-1.5 rounded-full bg-stone-300 mr-3"></div>
                                                <div className="text-sm font-medium text-stone-900">
                                                    {language === 'ja' ? report.horses?.name : report.horses?.name_en || 'Unknown Horse'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                            {report.title}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                            {/* Date */}
                                            {report.created}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                (report.status === 'pending_jp_check' || report.status === 'pending_en_check') ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {report.status === 'pending_jp_check' ? 'In Review' :
                                                    report.status === 'pending_en_check' ? 'In Review' :
                                                        report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <span className="text-stone-400 hover:text-stone-600">
                                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-stone-500 text-sm">
                                            No recent reports found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
