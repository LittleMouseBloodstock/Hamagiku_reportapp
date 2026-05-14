'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePlanAccess } from '@/hooks/usePlanAccess';

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
    const { workspaceId } = useWorkspace();
    const router = useRouter();
    const { loading: planLoading, hasProductAccess, capabilities } = usePlanAccess();

    const [selectedDate, setSelectedDate] = useState(getTodayIso());
    const [horses, setHorses] = useState<Horse[]>([]);
    const [weights, setWeights] = useState<Record<string, string>>({});
    const [latestMap, setLatestMap] = useState<Record<string, HorseWeight | null>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const dateInputLang = language === 'ja' ? 'ja-JP' : 'en-GB';

    useEffect(() => {
        if (!user || !workspaceId || !hasProductAccess || !capabilities.canUseWeightBulkInput) return;

        let isMounted = true;

        const fetchData = async () => {
            setLoading(true);

            try {
                const { data: horseData, error: horseError } = await supabase
                    .from('horses')
                    .select('id, name, name_en, horse_status')
                    .eq('workspace_id', workspaceId)
                    .or('horse_status.is.null,horse_status.eq.Active')
                    .order('name');

                if (horseError) throw horseError;

                const activeHorses = (horseData || []) as Horse[];
                const horseIds = activeHorses.map((horse) => horse.id);

                if (horseIds.length === 0) {
                    if (isMounted) {
                        setHorses([]);
                        setWeights({});
                        setLatestMap({});
                        setLoading(false);
                    }
                    return;
                }

                const [{ data: dayWeights, error: dayError }, { data: allWeights, error: allError }] = await Promise.all([
                    supabase
                        .from('horse_weights')
                        .select('horse_id, weight, measured_at')
                        .eq('workspace_id', workspaceId)
                        .eq('measured_at', selectedDate)
                        .in('horse_id', horseIds),
                    supabase
                        .from('horse_weights')
                        .select('horse_id, weight, measured_at')
                        .eq('workspace_id', workspaceId)
                        .in('horse_id', horseIds)
                        .order('measured_at', { ascending: false }),
                ]);

                if (dayError) throw dayError;
                if (allError) throw allError;

                const latestByHorse: Record<string, HorseWeight | null> = {};
                (allWeights || []).forEach((row) => {
                    const typed = row as HorseWeight;
                    if (!latestByHorse[typed.horse_id]) {
                        latestByHorse[typed.horse_id] = typed;
                    }
                });

                const dayMap: Record<string, string> = {};
                (dayWeights || []).forEach((row) => {
                    const typed = row as HorseWeight;
                    dayMap[typed.horse_id] = typed.weight !== null && typed.weight !== undefined ? String(typed.weight) : '';
                });

                if (isMounted) {
                    setHorses(activeHorses);
                    setLatestMap(latestByHorse);
                    setWeights(dayMap);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to load weights:', error);
                if (isMounted) setLoading(false);
            }
        };

        void fetchData();

        return () => {
            isMounted = false;
        };
    }, [selectedDate, user, workspaceId, hasProductAccess, capabilities.canUseWeightBulkInput]);

    const handleSave = async () => {
        if (!workspaceId || horses.length === 0 || !hasProductAccess || !capabilities.canUseWeightBulkInput) return;

        setSaving(true);
        try {
            const payload = horses
                .map((horse) => {
                    const raw = weights[horse.id];
                    const value = raw !== undefined && raw !== '' ? Number(raw) : NaN;
                    if (Number.isNaN(value)) return null;
                    return {
                        workspace_id: workspaceId,
                        horse_id: horse.id,
                        measured_at: selectedDate,
                        weight: value,
                    };
                })
                .filter(Boolean);

            if (payload.length === 0) {
                window.alert(t('noWeightsToSave'));
                setSaving(false);
                return;
            }

            const { error } = await supabase
                .from('horse_weights')
                .upsert(payload, { onConflict: 'horse_id,measured_at' });

            if (error) throw error;

            const { data: allWeights, error: latestError } = await supabase
                .from('horse_weights')
                .select('horse_id, weight, measured_at')
                .eq('workspace_id', workspaceId)
                .in('horse_id', horses.map((horse) => horse.id))
                .order('measured_at', { ascending: false });

            if (latestError) throw latestError;

            const latestByHorse: Record<string, HorseWeight | null> = {};
            (allWeights || []).forEach((row) => {
                const typed = row as HorseWeight;
                if (!latestByHorse[typed.horse_id]) {
                    latestByHorse[typed.horse_id] = typed;
                }
            });

            setLatestMap(latestByHorse);
            window.alert(t('weightsSaved'));
        } catch (error) {
            console.error('Failed to save weights:', error);
            window.alert(t('weightsSaveFailed'));
        } finally {
            setSaving(false);
        }
    };

    const rows = useMemo(() => horses.map((horse) => ({
        horse,
        latest: latestMap[horse.id],
    })), [horses, latestMap]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="flex flex-col gap-3 border-b border-stone-200 bg-white px-4 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
                <div className="dashboard-page-title flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">monitoring</span>
                    {t('weights')}
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                    <label className="text-sm text-stone-500">{t('measurementDate')}</label>
                    <input
                        type="date"
                        lang={dateInputLang}
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="input-brand px-3 py-2 text-sm"
                    />
                    <button
                        onClick={() => void handleSave()}
                        disabled={saving || loading || horses.length === 0}
                        className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
                    >
                        {saving ? t('savingWeights') : t('saveWeights')}
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {planLoading ? (
                    <div className="text-center text-stone-400">{t('loading')}</div>
                ) : !hasProductAccess || !capabilities.canUseWeightBulkInput ? (
                    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
                        <div className="text-lg font-bold">{t('weightsLockedTitle')}</div>
                        <div className="mt-2 text-sm leading-7">{t('weightsLockedBody')}</div>
                        <div className="mt-4">
                            <Link href="/dashboard/billing" className="inline-flex rounded-lg border border-amber-400 px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100">
                                {t('billing')}
                            </Link>
                        </div>
                    </div>
                ) : loading ? (
                    <div className="text-center text-stone-400">{t('loading')}</div>
                ) : horses.length === 0 ? (
                    <div className="text-center text-stone-400">{t('noActiveHorses')}</div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-stone-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('horseName')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('latestWeight')}</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('inputWeight')}</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200">
                                    {rows.map(({ horse, latest }) => (
                                        <tr key={horse.id} className="transition-colors hover:bg-stone-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/dashboard/horses/${horse.id}`)}
                                                    className="text-left"
                                                >
                                                    <div className="text-sm font-medium text-stone-900 hover:text-primary">
                                                        {language === 'ja' ? horse.name : horse.name_en}
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        {language === 'ja' ? horse.name_en : horse.name}
                                                    </div>
                                                </button>
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
                                                        setWeights((prev) => ({ ...prev, [horse.id]: value }));
                                                    }}
                                                    className="input-brand w-32 px-3 py-2 text-sm"
                                                    placeholder="kg"
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/dashboard/horses/${horse.id}`)}
                                                    className="rounded-full border border-primary px-3 py-2 text-xs font-semibold text-primary transition-all hover:bg-primary hover:text-white"
                                                >
                                                    {t('view')}
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
