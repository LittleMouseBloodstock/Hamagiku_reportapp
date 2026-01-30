'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

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
    const { user } = useAuth();

    const [selectedDate, setSelectedDate] = useState(getTodayIso());
    const [horses, setHorses] = useState<Horse[]>([]);
    const [weights, setWeights] = useState<Record<string, string>>({});
    const [latestMap, setLatestMap] = useState<Record<string, HorseWeight | null>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const hasHorses = horses.length > 0;

    useEffect(() => {
        if (!user) return;

        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                const { data: horseData, error: hErr } = await supabase
                    .from('horses')
                    .select('id, name, name_en, horse_status')
                    .or('horse_status.is.null,horse_status.eq.Active')
                    .order('name');
                if (hErr) throw hErr;

                if (!horseData || horseData.length === 0) {
                    if (isMounted) {
                        setHorses([]);
                        setWeights({});
                        setLatestMap({});
                        setLoading(false);
                    }
                    return;
                }

                const ids = horseData.map(h => h.id);
                const [dayWeightsRes, latestWeightsRes] = await Promise.all([
                    supabase
                        .from('horse_weights')
                        .select('horse_id, weight, measured_at')
                        .eq('measured_at', selectedDate)
                        .in('horse_id', ids),
                    supabase
                        .from('horse_weights')
                        .select('horse_id, weight, measured_at')
                        .in('horse_id', ids)
                        .order('measured_at', { ascending: false })
                ]);

                if (dayWeightsRes.error) throw dayWeightsRes.error;
                if (latestWeightsRes.error) throw latestWeightsRes.error;

                const dayWeights = dayWeightsRes.data || [];
                const latestWeights = latestWeightsRes.data || [];

                const latestByHorse: Record<string, HorseWeight | null> = {};
                latestWeights.forEach((row) => {
                    if (!latestByHorse[row.horse_id]) {
                        latestByHorse[row.horse_id] = row;
                    }
                });

                const weightsMap: Record<string, string> = {};
                dayWeights.forEach((row) => {
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
                if (isMounted) setLoading(false);
            }
        };

        fetchData();
        return () => { isMounted = false; };
    }, [user?.id, selectedDate]);

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

            const { error } = await supabase
                .from('horse_weights')
                .upsert(payload, { onConflict: 'horse_id,measured_at' });

            if (error) throw error;

            const { data: latestWeightsRes, error: latestErr } = await supabase
                .from('horse_weights')
                .select('horse_id, weight, measured_at')
                .in('horse_id', horses.map(h => h.id))
                .order('measured_at', { ascending: false });
            if (latestErr) throw latestErr;

            const latestByHorse: Record<string, HorseWeight | null> = {};
            (latestWeightsRes || []).forEach((row) => {
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
