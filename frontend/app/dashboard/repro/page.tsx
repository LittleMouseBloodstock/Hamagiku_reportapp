'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet } from '@/lib/restClient';
import { formatShortDate, toAmPmLabel } from '@/lib/reproDate';
import { labelMaps, shortLabel, uterusShort } from '@/lib/reproLabels';

type Mare = {
    id: string;
    name: string;
    name_en: string;
    sex?: string | null;
};

type Snapshot = {
    horse_id: string;
    date: string;
    latest_performed_at: string;
    max_follicle_mm_r?: number | null;
    max_follicle_mm_l?: number | null;
    follicle_feel_r?: string | null;
    follicle_feel_l?: string | null;
    cervix_state?: string | null;
    uterus_flags?: { edema?: boolean; fluid?: boolean } | null;
    uterus_tone?: string | null;
    interventions?: string[] | null;
};

export default function ReproHomePage() {
    const { language, t } = useLanguage();
    const { session } = useAuth();
    const [mares, setMares] = useState<Mare[]>([]);
    const [snapshots, setSnapshots] = useState<Record<string, Snapshot>>({});

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchMares = async () => {
            if (!session?.access_token) return;
            const data = await restGet('horses?select=id,name,name_en,sex&sex=eq.Mare&order=name', getRestHeaders());
            if (mounted) setMares(data || []);
        };

        fetchMares().catch(() => setMares([]));
        return () => { mounted = false; };
    }, [session?.access_token]);

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchSnapshots = async () => {
            if (!session?.access_token || mares.length === 0) return;
            const ids = mares.map((m) => m.id).join(',');
            const data = await restGet(
                `repro_daily_snapshots?select=horse_id,date,latest_performed_at,max_follicle_mm_r,max_follicle_mm_l,follicle_feel_r,follicle_feel_l,cervix_state,uterus_flags,uterus_tone,interventions&horse_id=in.(${ids})&order=date.desc,latest_performed_at.desc`,
                getRestHeaders()
            );
            if (!mounted) return;
            const map: Record<string, Snapshot> = {};
            (data as Snapshot[] || []).forEach((row) => {
                if (!map[row.horse_id]) {
                    map[row.horse_id] = row;
                }
            });
            setSnapshots(map);
        };

        fetchSnapshots().catch(() => setSnapshots({}));
        return () => { mounted = false; };
    }, [mares, session?.access_token]);

    const countLabel = useMemo(() => `${mares.length} ${t('reproMares')}`, [mares.length, t]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">monitor_heart</span>
                    {t('reproManagement')}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link
                        href="/dashboard/repro/calendar"
                        className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-stone-600 rounded-lg hover:text-stone-800 transition-all"
                    >
                        {t('reproCalendar')}
                    </Link>
                    <Link
                        href="/dashboard/repro/directory"
                        className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-stone-600 rounded-lg hover:text-stone-800 transition-all"
                    >
                        {t('reproDirectory')}
                    </Link>
                    <Link
                        href="/dashboard/repro/notifications"
                        className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-stone-600 rounded-lg hover:text-stone-800 transition-all"
                    >
                        {t('reproNotifications')}
                    </Link>
                    <Link
                        href="/dashboard/repro/checks/new"
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[#1a3c34] text-white rounded-lg shadow-sm hover:bg-[#122b25] transition-all ring-1 ring-[#1a3c34]/20"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">{t('reproNewCheck')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-stone-800">{t('reproToday')}</h2>
                        <p className="text-sm text-stone-500">{t('reproSubtitle')}</p>
                    </div>
                    <div className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-600">
                        {countLabel}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {mares.map((mare) => {
                        const snapshot = snapshots[mare.id];
                        const name = language === 'ja' ? mare.name : mare.name_en || mare.name;
                        const lastCheck = snapshot
                            ? `${formatShortDate(snapshot.date)} ${toAmPmLabel(snapshot.latest_performed_at)}`
                            : t('reproNoData');

                        return (
                            <div key={mare.id} className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-lg font-bold text-stone-800">{name}</h3>
                                        <div className="text-xs text-stone-400 font-mono">{mare.id}</div>
                                    </div>
                                    <div className="text-xs text-stone-500">
                                        {t('reproLastCheck')}: {lastCheck}
                                    </div>
                                </div>
                                <div className="mt-3 text-sm text-stone-600">
                                    {snapshot ? (
                                        <span>
                                            R{snapshot.max_follicle_mm_r ?? '-'} / L{snapshot.max_follicle_mm_l ?? '-'} |{' '}
                                            {shortLabel(labelMaps.cervix, language, snapshot.cervix_state)}{' '}
                                            {uterusShort(language, snapshot.uterus_flags || {}, snapshot.uterus_tone)}
                                        </span>
                                    ) : (
                                        <span className="text-stone-400">{t('reproNoData')}</span>
                                    )}
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Link
                                        href={`/dashboard/repro/mares/${mare.id}`}
                                        className="px-3 py-2 text-sm rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-800 hover:border-stone-300 transition-colors"
                                    >
                                        {t('reproTimeline')}
                                    </Link>
                                    <Link
                                        href={`/dashboard/repro/checks/new?horse_id=${mare.id}`}
                                        className="px-3 py-2 text-sm rounded-lg bg-[#1a3c34] text-white hover:bg-[#122b25] transition-colors"
                                    >
                                        {t('reproNewCheck')}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                    {mares.length === 0 && (
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-10 text-center text-stone-500">
                            {t('reproNoData')}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
