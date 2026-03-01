'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { buildRestHeaders, restGet, restPost } from '@/lib/restClient';
import { useRouter } from 'next/navigation';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    horse_status?: string | null;
    sex?: string | null;
    broodmare_flag?: boolean | null;
};

type HorseWeight = {
    horse_id: string;
    weight: number | null;
    measured_at: string;
};

const getTodayIso = () => new Date().toISOString().slice(0, 10);
const getDraftStorageKey = (date: string) => `weight-draft:${date}`;

export default function WeightsPage() {
    const { t, language } = useLanguage();
    const { user, session } = useAuth();
    const refreshKey = useResumeRefresh();
    const router = useRouter();

    const [selectedDate, setSelectedDate] = useState(getTodayIso());
    const [horses, setHorses] = useState<Horse[]>([]);
    const [weights, setWeights] = useState<Record<string, string>>({});
    const [dirtyMap, setDirtyMap] = useState<Record<string, boolean>>({});
    const [latestMap, setLatestMap] = useState<Record<string, HorseWeight | null>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const hasHorses = horses.length > 0;
    const hasUnsavedChanges = Object.values(dirtyMap).some(Boolean);
    const dirtyMapRef = useRef<Record<string, boolean>>({});

    useEffect(() => {
        dirtyMapRef.current = dirtyMap;
    }, [dirtyMap]);

    useEffect(() => {
        if (!session?.access_token) return;

        let isMounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchData = async (retryCount = 0) => {
            setLoading(true);
            try {
                const orFilter = encodeURIComponent('(horse_status.is.null,horse_status.eq.Active)');
                const horseData = await restGet(
                    `horses?select=id,name,name_en,horse_status,sex,broodmare_flag&or=${orFilter}&order=name`,
                    getRestHeaders()
                );

                if (!horseData || horseData.length === 0) {
                    if (isMounted) {
                        setHorses([]);
                        setWeights({});
                        setLatestMap({});
                        setLoading(false);
                    }
                    return;
                }

                const filteredHorses = (horseData as Horse[]).filter((horse) => {
                    const isMare = horse.sex === 'Mare';
                    const isBroodmareFilly = horse.sex === 'Filly' && horse.broodmare_flag === true;
                    return !(isMare || isBroodmareFilly);
                });

                if (!filteredHorses || filteredHorses.length === 0) {
                    if (isMounted) {
                        setHorses([]);
                        setWeights({});
                        setLatestMap({});
                        setLoading(false);
                    }
                    return;
                }

                const ids = filteredHorses.map((h: Horse) => h.id);
                const idsFilter = encodeURIComponent(`(${ids.join(',')})`);
                const [dayWeights, latestWeights] = await Promise.all([
                    restGet(
                        `horse_weights?select=horse_id,weight,measured_at&measured_at=eq.${selectedDate}&horse_id=in.${idsFilter}`,
                        getRestHeaders()
                    ),
                    restGet(
                        `horse_weights?select=horse_id,weight,measured_at&horse_id=in.${idsFilter}&order=measured_at.desc`,
                        getRestHeaders()
                    )
                ]);

                const latestByHorse: Record<string, HorseWeight | null> = {};
                latestWeights.forEach((row: HorseWeight) => {
                    if (!latestByHorse[row.horse_id]) {
                        latestByHorse[row.horse_id] = row;
                    }
                });

                const weightsMap: Record<string, string> = {};
                dayWeights.forEach((row: HorseWeight) => {
                    weightsMap[row.horse_id] = row.weight !== null && row.weight !== undefined ? String(row.weight) : '';
                });

                if (isMounted) {
                    setHorses(filteredHorses);
                    setLatestMap(latestByHorse);
                    setWeights((prev) => {
                        const next: Record<string, string> = {};
                        filteredHorses.forEach((horse) => {
                            if (dirtyMapRef.current[horse.id]) {
                                next[horse.id] = prev[horse.id] ?? '';
                            } else {
                                next[horse.id] = weightsMap[horse.id] ?? '';
                            }
                        });
                        return next;
                    });
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to load weights:', error);
                const msg = String((error as Error)?.message || '');
                if (msg.includes('AbortError') && isMounted && retryCount < 2) {
                    setTimeout(() => fetchData(retryCount + 1), 800);
                    return;
                }
                if (isMounted && retryCount < 1) {
                    setTimeout(() => fetchData(retryCount + 1), 800);
                    return;
                }
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [user?.id, session?.access_token, selectedDate, refreshKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const savedDraft = window.localStorage.getItem(getDraftStorageKey(selectedDate));
            if (!savedDraft) {
                setDirtyMap({});
                return;
            }

            const parsed = JSON.parse(savedDraft) as Record<string, string>;
            setWeights((prev) => ({ ...prev, ...parsed }));
            setDirtyMap(
                Object.keys(parsed).reduce<Record<string, boolean>>((acc, horseId) => {
                    acc[horseId] = true;
                    return acc;
                }, {})
            );
        } catch (error) {
            console.warn('Failed to restore weight draft:', error);
        }
    }, [selectedDate]);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        if (!hasUnsavedChanges) {
            window.localStorage.removeItem(getDraftStorageKey(selectedDate));
            return;
        }

        const draftPayload = Object.entries(weights).reduce<Record<string, string>>((acc, [horseId, value]) => {
            if (dirtyMap[horseId]) {
                acc[horseId] = value;
            }
            return acc;
        }, {});

        window.localStorage.setItem(getDraftStorageKey(selectedDate), JSON.stringify(draftPayload));
    }, [weights, dirtyMap, hasUnsavedChanges, selectedDate]);

    useEffect(() => {
        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            if (!hasUnsavedChanges) return;
            event.preventDefault();
            event.returnValue = '';
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    const handleSave = async () => {
        if (!hasHorses) return;
        if (!session?.access_token) {
            alert(language === 'ja' ? 'セッションがありません。再ログインしてください。' : 'Session missing. Please re-login.');
            return;
        }
        setSaving(true);
        try {
            const token = session.access_token;
            const payload = horses
                .map((horse) => {
                    const raw = weights[horse.id];
                    const value = raw !== undefined && raw !== '' ? Number(raw) : NaN;
                    if (Number.isNaN(value)) return null;
                    return {
                        horse_id: horse.id,
                        measured_at: selectedDate,
                        weight: value
                    };
                })
                .filter(Boolean);

            if (payload.length === 0) {
                alert(language === 'ja' ? '保存する体重がありません。' : 'No weights to save.');
                setSaving(false);
                return;
            }

            await restPost(
                'horse_weights?on_conflict=horse_id,measured_at',
                payload,
                buildRestHeaders({
                    bearerToken: token,
                    prefer: 'resolution=merge-duplicates,return=representation'
                })
            );

            const idsFilter = encodeURIComponent(`(${horses.map(h => h.id).join(',')})`);
            const latestWeightsRes = await restGet(
                `horse_weights?select=horse_id,weight,measured_at&horse_id=in.${idsFilter}&order=measured_at.desc`,
                buildRestHeaders({ bearerToken: token })
            );

            const latestByHorse: Record<string, HorseWeight | null> = {};
            (latestWeightsRes || []).forEach((row: HorseWeight) => {
                if (!latestByHorse[row.horse_id]) {
                    latestByHorse[row.horse_id] = row;
                }
            });
            setLatestMap(latestByHorse);
            setDirtyMap({});
            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(getDraftStorageKey(selectedDate));
            }
            alert(language === 'ja' ? '保存しました。' : 'Saved.');
        } catch (error) {
            console.error('Failed to save weights:', error);
            alert(language === 'ja' ? '保存に失敗しました。' : 'Failed to save.');
        } finally {
            setSaving(false);
        }
    };

    const rows = useMemo(() => {
        return horses.map(horse => {
            const latest = latestMap[horse.id];
            return {
                horse,
                latest
            };
        });
    }, [horses, latestMap]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-white border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">monitoring</span>
                    {t('weights')}
                </div>
                <div className="flex items-center gap-3">
                    <label className="text-sm text-stone-500">{t('measurementDate')}</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-600"
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving || loading || !hasHorses}
                        className="px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark transition-all disabled:opacity-50"
                    >
                        {saving ? t('savingWeights') : t('saveWeights')}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {loading ? (
                    <div className="text-center text-stone-400">{t('loading')}</div>
                ) : !hasHorses ? (
                    <div className="text-center text-stone-400">{t('noActiveHorses')}</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('horseName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('latestWeight')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('inputWeight')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{language === 'ja' ? '体重サマリー' : 'Weight Summary'}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{language === 'ja' ? '馬詳細' : 'Horse Detail'}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200">
                                    {rows.map(({ horse, latest }) => (
                                        <tr key={horse.id} className="hover:bg-stone-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/dashboard/horses/${horse.id}`)}
                                                    className="text-left"
                                                >
                                                    <div className="text-sm font-medium text-stone-900 hover:text-[var(--color-primary)] transition-colors">
                                                        {language === 'ja' ? horse.name : horse.name_en}
                                                    </div>
                                                </button>
                                                <div className="text-xs text-stone-500">
                                                    {language === 'ja' ? horse.name_en : horse.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                                {latest ? `${latest.weight ?? '-'} kg (${latest.measured_at})` : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={weights[horse.id] ?? ''}
                                                    onChange={(e) => {
                                                        const value = e.target.value;
                                                        setWeights(prev => ({ ...prev, [horse.id]: value }));
                                                        setDirtyMap(prev => ({ ...prev, [horse.id]: true }));
                                                    }}
                                                    className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700"
                                                    placeholder="kg"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/dashboard/horses/${horse.id}#weight-history`)}
                                                    className="rounded-full border border-[var(--color-primary)] px-3 py-2 text-xs font-bold text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-all"
                                                >
                                                    {language === 'ja' ? '見る / 印刷' : 'View / Print'}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/dashboard/horses/${horse.id}`)}
                                                    className="rounded-full bg-stone-100 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-200 transition-all"
                                                >
                                                    {language === 'ja' ? '詳細' : 'Detail'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
