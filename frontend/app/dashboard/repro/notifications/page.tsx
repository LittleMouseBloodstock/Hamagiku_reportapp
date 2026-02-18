'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet, restPost } from '@/lib/restClient';
import { formatShortDate, toAmPmLabel } from '@/lib/reproDate';
import { labelMaps, shortLabel } from '@/lib/reproLabels';

type Task = {
    id: string;
    horse_id: string;
    trigger_type: string;
    trigger_at: string;
    remind_at: string;
    due_at: string;
    status: string;
    horses?: { name: string; name_en: string };
};

export default function ReproNotificationsPage() {
    const { language, t } = useLanguage();
    const { session } = useAuth();
    const [tasks, setTasks] = useState<Task[]>([]);

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchTasks = async () => {
            if (!session?.access_token) return;
            await restPost('rpc/repro_recompute_follow_up_status', {}, getRestHeaders());
            const data = await restGet(
                'repro_follow_up_tasks?select=*,horses(name,name_en)&status=in.(reminded,overdue)&order=due_at.asc',
                getRestHeaders()
            );
            if (mounted) setTasks(data || []);
        };

        fetchTasks().catch(() => setTasks([]));
        return () => { mounted = false; };
    }, [session?.access_token]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">notifications</span>
                    {t('reproNotifications')}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link
                        href="/dashboard/repro"
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white text-stone-600 rounded-lg shadow-sm hover:text-stone-800 transition-all ring-1 ring-stone-200"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="text-sm font-medium">{t('reproBack')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
                <div className="mb-4 text-xs text-stone-500">
                    {tasks.length} {t('reproItems')}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {tasks.map((task) => {
                        const name = language === 'ja' ? task.horses?.name : task.horses?.name_en || task.horses?.name;
                        const dueLabel = `${formatShortDate(task.due_at)} ${toAmPmLabel(task.due_at)}`;
                        return (
                            <div key={task.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                                <div className="flex items-center justify-between">
                                    <div className="text-lg font-bold text-stone-800">{name || task.horse_id}</div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${task.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {task.status}
                                    </span>
                                </div>
                                <div className="text-sm text-stone-500 mt-2">
                                    {shortLabel(labelMaps.interventions, language, task.trigger_type)} | {dueLabel}
                                </div>
                                <div className="mt-3">
                                    <Link
                                        href={`/dashboard/repro/checks/new?horse_id=${task.horse_id}&follow_task_id=${task.id}`}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a3c34] text-white text-sm hover:bg-[#122b25]"
                                    >
                                        {t('reproStartCheck')}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                    {tasks.length === 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-10 text-center text-stone-500">
                            {t('reproNotificationsEmpty')}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
