'use client';

import { useEffect, useMemo, useState } from 'react';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { buildRestHeaders, restGet, restPost } from '@/lib/restClient';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    horse_status?: string | null;
};

type HorseWeight = {
    horse_id: string;
    weight: number | null;
    measured_at: string;
};

const getTodayIso = () => new Date().toISOString().slice(0, 10);

export default function WeightsPage() {
    const { t, language } = useLanguage();
    const { user, session } = useAuth();
    const refreshKey = useResumeRefresh();

    const [selectedDate, setSelectedDate] = useState(getTodayIso());
    const [horses, setHorses] = useState<Horse[]>([]);
    const [weights, setWeights] = useState<Record<string, string>>({});
    const [latestMap, setLatestMap] = useState<Record<string, HorseWeight | null>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const hasHorses = horses.length > 0;

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
                    `horses?select=id,name,name_en,horse_status&or=${orFilter}&order=name`,
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

                const ids = horseData.map((h: Horse) => h.id);
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
                    setHorses(horseData);
                    setLatestMap(latestByHorse);
                    setWeights(weightsMap);
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

    const handleSave = async () => {
        if (!hasHorses) return;
        setSaving(true);
        try {
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
                    bearerToken: session.access_token,
                    prefer: 'resolution=merge-duplicates,return=representation'
                })
            );

            const idsFilter = encodeURIComponent(`(${horses.map(h => h.id).join(',')})`);
            const latestWeightsRes = await restGet(
                `horse_weights?select=horse_id,weight,measured_at&horse_id=in.${idsFilter}&order=measured_at.desc`,
                buildRestHeaders({ bearerToken: session.access_token })
            );

            const latestByHorse: Record<string, HorseWeight | null> = {};
            (latestWeightsRes || []).forEach((row: HorseWeight) => {
                if (!latestByHorse[row.horse_id]) {
                    latestByHorse[row.horse_id] = row;
                }
            });
            setLatestMap(latestByHorse);
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
                <div className="text-xl font-bold text-stone-800 flex items-center gap-2">
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
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200">
                                    {rows.map(({ horse, latest }) => (
                                        <tr key={horse.id} className="hover:bg-stone-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-stone-900">
                                                    {language === 'ja' ? horse.name : horse.name_en}
                                                </div>
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
                                                    onChange={(e) => setWeights(prev => ({ ...prev, [horse.id]: e.target.value }))}
                                                    className="w-32 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700"
                                                    placeholder="kg"
                                                />
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
