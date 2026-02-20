'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { buildRestHeaders, restCount, restDelete, restGet, restPost } from '@/lib/restClient';

export default function Dashboard() {
    const { language, t } = useLanguage();
    const { user, session } = useAuth(); // Get user and session from AuthContext
    const router = useRouter();
    const refreshKey = useResumeRefresh();

    interface DashboardReport {
        id: string;
        title: string;
        created: string;
        author: string;
        status: string;
        languages: string[];
        horses?: { name: string; name_en: string; };
        horse_id?: string;
        reportType?: 'monthly' | 'departure';
    }

    type ReportRow = {
        id: string;
        title: string | null;
        created_at: string | null;
        review_status?: string | null;
        status_training?: string | null;
        body?: string | null;
        metrics_json?: { commentEn?: string | null; reportType?: string | null };
        horses?: { name: string; name_en: string; };
        horse_id?: string;
    };

    const [reports, setReports] = useState<DashboardReport[]>([]);
    // Hardcoded stats for demo (replace with real data later)
    const [stats, setStats] = useState({
        totalReports: 0,
        activeHorses: 0,
        retiredHorses: 0,
        clients: 0,
        pendingReview: 0,
        draftReports: 0,
        approvedReports: 0
    });
    const [todaySchedule, setTodaySchedule] = useState<Array<{ label: string; horseName: string; time?: string }>>([]);
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [selectedDate, setSelectedDate] = useState<Date | null>(today);
    const [memoTitle, setMemoTitle] = useState('');
    const [memoNote, setMemoNote] = useState('');
    const [memoDate, setMemoDate] = useState(today.toISOString().slice(0, 10));
    const [memoEvents, setMemoEvents] = useState<Array<{ id: string; event_date: string; title: string; note?: string | null }>>([]);
    const [coverEvents, setCoverEvents] = useState<Array<{ id?: string; horse_id: string; cover_date: string; horses?: { name: string; name_en: string } }>>([]);
    const [scanEvents, setScanEvents] = useState<Array<{ id?: string; horse_id: string; scheduled_date: string; result?: string | null; horses?: { name: string; name_en: string } }>>([]);

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();
    const formatMonthYear = (date: Date): string => {
        const locale = language === 'ja' ? 'ja-JP' : 'en-US';
        return date.toLocaleDateString(locale, { year: 'numeric', month: 'long' });
    };

    useEffect(() => {
        let isMounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchReports = async (retryCount = 0) => {
            try {
                if (!session?.access_token) return;

                const headers = getRestHeaders();
                const data = await restGet('reports?select=*,review_status,horse_id,horses(name,name_en)&order=created_at.desc', headers);
                const today = new Date();
                const todayStr = today.toISOString().slice(0, 10);
                const [reportsCount, activeHorsesCount, retiredHorsesCount, clientsCount, memoRes, allCovers, allScans] = await Promise.all([
                    restCount('reports?select=*', headers),
                    restCount('horses?select=*&departure_date=is.null', headers),
                    restCount('horses?select=*&departure_date=not.is.null', headers),
                    restCount('clients?select=*', headers),
                    restGet('repro_memo_events?select=id,event_date,title,note&order=event_date.asc', headers).catch(() => []),
                    restGet('repro_covers?select=id,horse_id,cover_date,horses(name,name_en)&order=cover_date.desc', headers).catch(() => []),
                    restGet('repro_scans?select=id,horse_id,scheduled_date,result,horses(name,name_en)&order=scheduled_date.desc', headers).catch(() => [])
                ]);
                const [todayCovers, todayScans] = await Promise.all([
                    restGet(`repro_covers?select=cover_date,horse_id,horses(name,name_en)&cover_date=eq.${todayStr}`, headers).catch(() => []),
                    restGet(`repro_scans?select=scheduled_date,horse_id,horses(name,name_en)&scheduled_date=eq.${todayStr}`, headers).catch(() => [])
                ]);

                const typedData = (data || []) as ReportRow[];
                const pendingCount = typedData.filter((r) => r.review_status === 'pending_jp_check' || r.review_status === 'pending_en_check').length || 0;
                const draftCount = typedData.filter((r) => (r.review_status || '').toLowerCase() === 'draft').length || 0;
                const approvedCount = typedData.filter((r) => (r.review_status || '').toLowerCase() === 'approved').length || 0;
                const isEmptySnapshot = (reportsCount || 0) === 0
                    && ((activeHorsesCount || 0) + (retiredHorsesCount || 0)) === 0
                    && (clientsCount || 0) === 0
                    && typedData.length === 0;

                if (isEmptySnapshot && retryCount < 2) {
                    console.warn('Dashboard empty snapshot detected, retrying fetch...');
                    setTimeout(() => fetchReports(retryCount + 1), 800);
                    return;
                }

                if (isMounted) {
                    setStats({
                        totalReports: reportsCount || 0,
                        activeHorses: activeHorsesCount || 0,
                        retiredHorses: retiredHorsesCount || 0,
                        clients: clientsCount || 0,
                        pendingReview: pendingCount || 0,
                        draftReports: draftCount || 0,
                        approvedReports: approvedCount || 0
                    });

                    const formatted = typedData.map((r) => {
                        const title = r.title || (language === 'ja' ? r.horses?.name : r.horses?.name_en) || 'Untitled';
                        const langs = [];
                        if (r.body) langs.push('JP');
                        if (r.metrics_json?.commentEn) langs.push('EN');
                        if (langs.length === 0) langs.push('JP');
                        const statusRaw = r.review_status || r.status_training || 'draft';
                        const reportType: DashboardReport['reportType'] =
                            r.metrics_json?.reportType === 'departure' || r.status_training === 'Departed'
                                ? 'departure'
                                : 'monthly';

                        return {
                            id: r.id,
                            title: title,
                            created: r.created_at ? new Date(r.created_at).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-',
                            author: 'You',
                            status: statusRaw,
                            languages: langs,
                            horses: r.horses,
                            horse_id: r.horse_id,
                            reportType
                        };
                    }) || [];
                    setReports(formatted);
                    setMemoEvents((memoRes as Array<{ id: string; event_date: string; title: string; note?: string | null }>) || []);
                    setCoverEvents((allCovers as Array<{ id?: string; horse_id: string; cover_date: string; horses?: { name: string; name_en: string } }>) || []);
                    setScanEvents((allScans as Array<{ id?: string; horse_id: string; scheduled_date: string; result?: string | null; horses?: { name: string; name_en: string } }>) || []);
                    const scheduleItems: Array<{ label: string; horseName: string; time?: string }> = [];
                    (todayCovers as Array<{ cover_date: string; horses?: { name: string; name_en: string } }>).forEach((item) => {
                        scheduleItems.push({
                            label: t('latestCover'),
                            horseName: language === 'ja' ? item.horses?.name || '' : item.horses?.name_en || item.horses?.name || '',
                            time: item.cover_date
                        });
                    });
                    (todayScans as Array<{ scheduled_date: string; horses?: { name: string; name_en: string } }>).forEach((item) => {
                        scheduleItems.push({
                            label: t('latestScan'),
                            horseName: language === 'ja' ? item.horses?.name || '' : item.horses?.name_en || item.horses?.name || '',
                            time: item.scheduled_date
                        });
                    });
                    (memoRes as Array<{ event_date: string; title: string }>).forEach((item) => {
                        if (item.event_date === todayStr) {
                            scheduleItems.push({
                                label: t('memoEvent'),
                                horseName: item.title,
                                time: item.event_date
                            });
                        }
                    });
                    setTodaySchedule(scheduleItems);
                }
            } catch (err: unknown) {
                const msg = String((err as Error)?.message || '');
                if (msg.includes('AbortError') && isMounted && retryCount < 3) {
                    console.warn('Dashboard fetch aborted; retrying...', { retryCount });
                    setTimeout(() => fetchReports(retryCount + 1), 800);
                    return;
                }
                console.error("Dashboard fetch error:", err);
                if (isMounted && retryCount < 2) {
                    setTimeout(() => fetchReports(retryCount + 1), 800);
                } else if (isMounted) {
                    setReports([]);
                }
            }
        };
        fetchReports();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, user?.id, session?.access_token, refreshKey]);

    const handleDeleteReport = async (reportId: string) => {
        if (!window.confirm(t('confirmDeleteReport'))) return;

        try {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            await restDelete(`reports?id=eq.${reportId}`, buildRestHeaders({ bearerToken: session.access_token }));

            alert(t('deleteSuccess'));
            setReports(prev => prev.filter(r => r.id !== reportId));
            setStats(prev => ({ ...prev, totalReports: prev.totalReports - 1 }));

        } catch (error) {
            console.error('Error deleting report:', error);
            alert(t('deleteError') + (error as Error).message);
        }
    };

    const daysInMonth = getDaysInMonth(viewYear, viewMonth);
    const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
    const calendarCells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i += 1) calendarCells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) calendarCells.push(d);
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const datesWithEvents = new Set<string>([
        ...coverEvents.map((c) => c.cover_date),
        ...scanEvents.map((s) => s.scheduled_date),
        ...memoEvents.map((m) => m.event_date)
    ]);
    const selectedDateStr = selectedDate
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : '';
    const selectedEvents = [
        ...coverEvents.filter((c) => c.cover_date === selectedDateStr).map((c) => ({
            label: t('coverDate'),
            title: language === 'ja' ? c.horses?.name || '-' : c.horses?.name_en || c.horses?.name || '-',
            meta: c.cover_date
        })),
        ...scanEvents.filter((s) => s.scheduled_date === selectedDateStr).map((s) => ({
            label: t('scanSchedule'),
            title: language === 'ja' ? s.horses?.name || '-' : s.horses?.name_en || s.horses?.name || '-',
            meta: s.result || s.scheduled_date
        })),
        ...memoEvents.filter((m) => m.event_date === selectedDateStr).map((m) => ({
            label: t('memoEvent'),
            title: m.title,
            meta: m.note || ''
        }))
    ];

    const handleAddMemo = async () => {
        if (!memoDate || memoTitle.trim().length === 0) return;
        try {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            const headers = buildRestHeaders({ bearerToken: session.access_token });
            const payload = {
                event_date: memoDate,
                title: memoTitle.trim(),
                note: memoNote.trim().length > 0 ? memoNote.trim() : null
            };
            const res = await restPost('repro_memo_events', payload, headers);
            const created = (res && res[0]) ? res[0] : payload;
            setMemoEvents((prev) => [...prev, created]);
            setMemoTitle('');
            setMemoNote('');
        } catch (error) {
            console.error('Failed to add memo event:', error);
            alert(t('memoSaveError') + (error as Error).message);
        }
    };

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
                {/* Today + Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                        <div className="text-xs text-stone-400 uppercase mb-2">{t('todaySchedule')}</div>
                        {todaySchedule.length === 0 ? (
                            <div className="text-sm text-stone-500">{t('noEventsToday')}</div>
                        ) : (
                            <div className="space-y-2">
                                {todaySchedule.slice(0, 6).map((item, idx) => (
                                    <div key={`${item.label}-${idx}`} className="text-sm text-stone-600">
                                        <span className="font-semibold text-stone-700">{item.label}</span> · {item.horseName} <span className="text-xs text-stone-400">{item.time}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="mt-3">
                            <Link href="/dashboard/repro/calendar" className="text-sm text-[#1a3c34] hover:underline">
                                {t('openReproCalendar')}
                            </Link>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                        <div className="text-xs text-stone-400 uppercase mb-2">{t('memoEvent')}</div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-stone-500">{t('memoDate')}</label>
                                <input
                                    type="date"
                                    value={memoDate}
                                    onChange={(e) => setMemoDate(e.target.value)}
                                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-stone-500">{t('memoTitle')}</label>
                                <input
                                    value={memoTitle}
                                    onChange={(e) => setMemoTitle(e.target.value)}
                                    placeholder={t('memoTitlePlaceholder')}
                                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-stone-500">{t('memoNote')}</label>
                                <textarea
                                    value={memoNote}
                                    onChange={(e) => setMemoNote(e.target.value)}
                                    placeholder={t('memoNotePlaceholder')}
                                    className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2 text-sm h-20 resize-none"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddMemo}
                                className="w-full rounded-lg bg-[#1a3c34] text-white text-sm py-2"
                            >
                                {t('addMemo')}
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5">
                        <div className="flex items-center justify-between mb-3">
                            <button className="text-stone-500 hover:text-stone-700" onClick={goPrev} aria-label={t('reproPrevMonth')}>
                                {'<'}
                            </button>
                            <div className="text-sm font-semibold text-stone-700">
                                {formatMonthYear(new Date(viewYear, viewMonth))}
                            </div>
                            <button className="text-stone-500 hover:text-stone-700" onClick={goNext} aria-label={t('reproNextMonth')}>
                                {'>'}
                            </button>
                        </div>
                        <div className="grid grid-cols-7 text-[10px] text-stone-500 mb-2">
                            {[t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')].map((label) => (
                                <div key={label} className="text-center">{label}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarCells.map((day, idx) => {
                                if (day === null) {
                                    return <div key={`empty-${idx}`} className="h-9" />;
                                }
                                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const hasEvents = datesWithEvents.has(dateStr);
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
                                        className={`h-9 rounded-lg text-[11px] border ${isSelected ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-700'} ${isToday ? 'ring-2 ring-amber-300' : ''}`}
                                        onClick={() => {
                                            setSelectedDate(new Date(viewYear, viewMonth, day));
                                            setMemoDate(dateStr);
                                        }}
                                    >
                                        <div className="flex items-center justify-center gap-1">
                                            <span>{day}</span>
                                            {hasEvents ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" /> : null}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        <div className="mt-3">
                            <div className="text-xs text-stone-500 mb-2">
                                {selectedDate
                                    ? selectedDate.toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                                    : '-'}
                            </div>
                            {selectedEvents.length === 0 ? (
                                <div className="text-xs text-stone-500">{t('reproNoEventsDay')}</div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedEvents.slice(0, 4).map((item, idx) => (
                                        <div key={`${item.label}-${idx}`} className="text-xs text-stone-600">
                                            <span className="font-semibold text-stone-700">{item.label}</span> · {item.title}
                                            {item.meta ? <div className="text-[10px] text-stone-400">{item.meta}</div> : null}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Compact Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">format_list_bulleted</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">{t('activeHorsesLabel')}</h3>
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
                        <h3 className="text-stone-500 text-sm font-medium font-sans">{t('pendingReviewLabel')}</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.pendingReview}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">edit_note</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">{t('draftReportsLabel')}</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.draftReports}</p>
                    </div>
                    <div className="bg-white p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-[#1a3c34]/5 rounded-lg">
                                <span className="material-symbols-outlined text-[#1a3c34]">verified</span>
                            </div>
                        </div>
                        <h3 className="text-stone-500 text-sm font-medium font-sans">{t('approvedReportsLabel')}</h3>
                        <p className="text-3xl font-bold text-[#1a3c34] mt-1 font-display">{stats.approvedReports}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-200 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-bold text-stone-800">{t('recentReports') || 'Recent Reports'}</h2>
                        <div className="flex items-center gap-2 text-xs text-stone-500 sm:hidden">
                            <span className="material-symbols-outlined text-base">swipe</span>
                            <span>{t('scrollHorizontal')}</span>
                        </div>
                    </div>
                    <div className="relative overflow-x-auto">
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent sm:hidden" />
                        <table className="w-full">
                            <thead className="bg-stone-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('horseName')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reportTitle')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Type</th>
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
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${report.reportType === 'departure' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                                {report.reportType === 'departure' ? 'Departure' : 'Monthly'}
                                            </span>
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
                                                {(() => {
                                                    const s = (report.status || '').trim();
                                                    // Exact matches (after trim)
                                                    if (s === 'pending_jp_check' || s === 'pending_en_check') return t('status_InReview');
                                                    if (s.toLowerCase() === 'approved') return t('status_Approved');
                                                    if (s.toLowerCase() === 'draft') return t('status_Draft');
                                                    if (s === 'Training') return t('status_Training');
                                                    if (s === 'Resting') return t('status_Resting');
                                                    if (s === 'Spelling') return t('status_Spelling');

                                                    // Handle "調整中" or other variations if needed
                                                    if (s === '調整中') return language === 'en' ? 'Training' : s; // Or map to 'Training' translation if desired

                                                    return s;
                                                })()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteReport(report.id);
                                                    }}
                                                    className="text-stone-400 hover:text-red-500 transition-colors"
                                                    title={t('deleteReport')}
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                                <span className="text-stone-400 hover:text-stone-600">
                                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {reports.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-stone-500 text-sm">
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
