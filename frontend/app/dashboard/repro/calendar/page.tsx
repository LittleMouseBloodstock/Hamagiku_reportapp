'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet } from '@/lib/restClient';
import { labelMaps, shortLabel, uterusShort } from '@/lib/reproLabels';
import { toAmPmLabel } from '@/lib/reproDate';

type Mare = {
    id: string;
    name: string;
    name_en: string;
};

type SnapshotRow = {
    horse_id: string;
    date: string;
    latest_performed_at: string;
    max_follicle_mm_r?: number | null;
    max_follicle_mm_l?: number | null;
    cervix_state?: string | null;
    uterus_flags?: { edema?: boolean; fluid?: boolean } | null;
    uterus_tone?: string | null;
    interventions?: string[] | null;
};

type CalendarItem = {
    horseId: string;
    horseName: string;
    performedAt: string;
    summary: string;
    interventions: string[];
};

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function formatMonthYear(date: Date, lang: string): string {
    const localeMap: Record<string, string> = { en: 'en-US', ja: 'ja-JP' };
    return date.toLocaleDateString(localeMap[lang] ?? 'en-US', { year: 'numeric', month: 'long' });
}

export default function ReproCalendarPage() {
    const { language, t } = useLanguage();
    const { session } = useAuth();
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);

    const [mares, setMares] = useState<Mare[]>([]);
    const [snapshots, setSnapshots] = useState<SnapshotRow[]>([]);
    const [covers, setCovers] = useState<{ id: string; horse_id: string; cover_date: string; stallion_name?: string | null }[]>([]);
    const [scans, setScans] = useState<{ id: string; horse_id: string; scheduled_date: string; result?: string | null }[]>([]);

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchMares = async () => {
            if (!session?.access_token) return;
            const orFilter = encodeURIComponent('(sex.eq.Mare,and(sex.eq.Filly,broodmare_flag.eq.true))');
            const data = await restGet(`horses?select=id,name,name_en,broodmare_flag&or=${orFilter}&order=name`, getRestHeaders());
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
                `repro_daily_snapshots?select=horse_id,date,latest_performed_at,max_follicle_mm_r,max_follicle_mm_l,cervix_state,uterus_flags,uterus_tone,interventions&horse_id=in.(${ids})&order=date.desc,latest_performed_at.desc`,
                getRestHeaders()
            );
            if (mounted) setSnapshots(data || []);
        };
        const fetchCovers = async () => {
            if (!session?.access_token || mares.length === 0) return;
            const ids = mares.map((m) => m.id).join(',');
            const data = await restGet(
                `repro_covers?select=id,horse_id,cover_date,stallion_name&horse_id=in.(${ids})`,
                getRestHeaders()
            );
            if (mounted) setCovers(data || []);
        };
        const fetchScans = async () => {
            if (!session?.access_token || mares.length === 0) return;
            const ids = mares.map((m) => m.id).join(',');
            const data = await restGet(
                `repro_scans?select=id,horse_id,scheduled_date,result&horse_id=in.(${ids})`,
                getRestHeaders()
            );
            if (mounted) setScans(data || []);
        };
        fetchSnapshots().catch(() => setSnapshots([]));
        fetchCovers().catch(() => setCovers([]));
        fetchScans().catch(() => setScans([]));
        return () => { mounted = false; };
    }, [mares, session?.access_token]);

    const mareNameMap = useMemo(() => {
        const map: Record<string, string> = {};
        mares.forEach((mare) => {
            map[mare.id] = language === 'ja' ? mare.name : mare.name_en || mare.name;
        });
        return map;
    }, [mares, language]);

    const calendarItems = useMemo(() => {
        const itemsByDate: Record<string, CalendarItem[]> = {};
        snapshots.forEach((row) => {
            const summaryParts: string[] = [];
            if (row.max_follicle_mm_r != null) summaryParts.push(`R:${row.max_follicle_mm_r}`);
            if (row.max_follicle_mm_l != null) summaryParts.push(`L:${row.max_follicle_mm_l}`);
            const cervix = shortLabel(labelMaps.cervix, language, row.cervix_state);
            const uterus = uterusShort(language, row.uterus_flags || {}, row.uterus_tone);
            if (cervix !== '-') summaryParts.push(`Cvx:${cervix}`);
            if (uterus !== '-') summaryParts.push(`Utr:${uterus}`);
            const summary = summaryParts.length > 0 ? summaryParts.join(' / ') : '--';

            const item: CalendarItem = {
                horseId: row.horse_id,
                horseName: mareNameMap[row.horse_id] || row.horse_id,
                performedAt: row.latest_performed_at,
                summary,
                interventions: row.interventions || []
            };
            if (!itemsByDate[row.date]) itemsByDate[row.date] = [];
            itemsByDate[row.date].push(item);
        });
        covers.forEach((cover) => {
            const item: CalendarItem = {
                horseId: cover.horse_id,
                horseName: mareNameMap[cover.horse_id] || cover.horse_id,
                performedAt: `${cover.cover_date}T00:00:00Z`,
                summary: cover.stallion_name ? `Cover: ${cover.stallion_name}` : 'Cover',
                interventions: []
            };
            if (!itemsByDate[cover.cover_date]) itemsByDate[cover.cover_date] = [];
            itemsByDate[cover.cover_date].push(item);
        });
        scans.forEach((scan) => {
            const label = scan.result ? `Scan (${scan.result})` : 'Scan';
            const item: CalendarItem = {
                horseId: scan.horse_id,
                horseName: mareNameMap[scan.horse_id] || scan.horse_id,
                performedAt: `${scan.scheduled_date}T00:00:00Z`,
                summary: label,
                interventions: []
            };
            if (!itemsByDate[scan.scheduled_date]) itemsByDate[scan.scheduled_date] = [];
            itemsByDate[scan.scheduled_date].push(item);
        });
        return itemsByDate;
    }, [snapshots, covers, scans, mareNameMap, language]);

    const datesWithChecks = useMemo(() => new Set(Object.keys(calendarItems)), [calendarItems]);

    const dayLabels = [
        t('sun'),
        t('mon'),
        t('tue'),
        t('wed'),
        t('thu'),
        t('fri'),
        t('sat')
    ];

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

    const calendarCells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i += 1) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) calendarCells.push(d);

    const selectedItems = useMemo(() => {
        if (!selectedDate) return [];
        const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        return calendarItems[dateStr] || [];
    }, [selectedDate, calendarItems]);

    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const goPrev = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
        setSelectedDate(null);
    };

    const goNext = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
        setSelectedDate(null);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">calendar_month</span>
                    {t('reproCalendar')}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white text-stone-600 rounded-lg shadow-sm hover:text-stone-800 transition-all ring-1 ring-stone-200"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="text-sm font-medium">{t('reproBack')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
                    <div className="flex items-center justify-between mb-4">
                        <button className="text-stone-500 hover:text-stone-700" onClick={goPrev} aria-label={t('reproPrevMonth')}>
                            {'<'}
                        </button>
                        <div className="text-sm font-semibold text-stone-700">
                            {formatMonthYear(new Date(viewYear, viewMonth), language)}
                        </div>
                        <button className="text-stone-500 hover:text-stone-700" onClick={goNext} aria-label={t('reproNextMonth')}>
                            {'>'}
                        </button>
                    </div>

                    <div className="grid grid-cols-7 text-xs text-stone-500 mb-2">
                        {dayLabels.map((label) => (
                            <div key={label} className="text-center">{label}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {calendarCells.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} className="h-10" />;
                            }
                            const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const hasChecks = datesWithChecks.has(dateStr);
                            const isToday = dateStr === todayStr;
                            const isSelected =
                                selectedDate &&
                                selectedDate.getFullYear() === viewYear &&
                                selectedDate.getMonth() === viewMonth &&
                                selectedDate.getDate() === day;
                            return (
                                <button
                                    key={dateStr}
                                    type="button"
                                    className={`h-10 rounded-lg text-xs border ${isSelected ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-700'} ${isToday ? 'ring-2 ring-amber-300' : ''}`}
                                    onClick={() => setSelectedDate(new Date(viewYear, viewMonth, day))}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span>{day}</span>
                                        {hasChecks ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" /> : null}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-semibold text-stone-700">
                            {selectedDate
                                ? selectedDate.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                : '-'}
                        </div>
                        <div className="text-xs text-stone-500">{selectedItems.length} {t('reproChecks')}</div>
                    </div>
                    {selectedItems.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 text-center text-stone-500">
                            {t('reproNoEventsDay')}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {selectedItems.map((item, index) => (
                                <div key={`${item.horseId}-${item.performedAt}-${index}`} className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm font-semibold text-stone-800">{item.horseName}</div>
                                        <span className="text-xs text-stone-500">{toAmPmLabel(item.performedAt)}</span>
                                    </div>
                                    <div className="mt-2 text-xs text-stone-500">{item.summary}</div>
                                    {item.interventions.length > 0 ? (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {item.interventions.map((code) => (
                                                <span key={code} className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px]">
                                                    {shortLabel(labelMaps.interventions, language, code)}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}
                                    <div className="mt-3 flex items-center gap-2">
                                        <Link
                                            href={`/dashboard/repro/mares/${item.horseId}`}
                                            className="px-3 py-1.5 text-xs rounded-lg border border-stone-200 text-stone-600"
                                        >
                                            {t('reproTimeline')}
                                        </Link>
                                        <Link
                                            href={`/dashboard/repro/checks/new?horse_id=${item.horseId}`}
                                            className="px-3 py-1.5 text-xs rounded-lg bg-[#1a3c34] text-white"
                                        >
                                            {t('reproNewCheck')}
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
