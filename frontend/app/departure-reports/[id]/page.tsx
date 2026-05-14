'use client';

import { useEffect, useRef, useState } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Printer, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import LanguageToggle from '@/components/LanguageToggle';
import DepartureReportTemplate, { type DepartureReportData } from '@/components/DepartureReportTemplate';
import { normalizeHorseSex } from '@/lib/horseProfile';

type OutputMode = 'japanese_only' | 'english_only' | 'bilingual';

function buildDepartureInitialData(params: {
    horse?: {
        name?: string | null;
        name_en?: string | null;
        sire?: string | null;
        sire_en?: string | null;
        dam?: string | null;
        dam_en?: string | null;
        birth_date?: string | null;
        sex?: string | null;
        trainers?: {
            trainer_name?: string | null;
            trainer_name_en?: string | null;
        } | null;
    } | null;
    ownerName?: string | null;
    metrics?: Record<string, unknown> | null;
}): Partial<DepartureReportData> {
    const horse = params.horse;
    const metrics = params.metrics || {};
    return {
        reportDate: String(metrics.reportDate || new Date().toISOString().slice(0, 10)),
        outputMode: (metrics.outputMode as OutputMode) || 'bilingual',
        ownerName: String(metrics.ownerName || params.ownerName || ''),
        horseNameJp: horse?.name || '',
        horseNameEn: horse?.name_en || '',
        birthDate: String(metrics.birthDate || horse?.birth_date || ''),
        horseSex: String(metrics.horseSex || normalizeHorseSex(horse?.sex) || ''),
        trainerNameJp: String(metrics.trainerNameJp || horse?.trainers?.trainer_name || ''),
        trainerNameEn: String(metrics.trainerNameEn || horse?.trainers?.trainer_name_en || ''),
        sireJp: String(metrics.sireJp || horse?.sire || ''),
        sireEn: String(metrics.sireEn || horse?.sire_en || horse?.sire || ''),
        damJp: String(metrics.damJp || horse?.dam || ''),
        damEn: String(metrics.damEn || horse?.dam_en || horse?.dam || ''),
        weight: String(metrics.weightText || ''),
        weightDate: String(metrics.weightDate || ''),
        farrierJp: String(metrics.farrierJp || ''),
        farrierEn: String(metrics.farrierEn || ''),
        farrierDate: String(metrics.farrierDate || ''),
        wormingJp: String(metrics.wormingJp || ''),
        wormingEn: String(metrics.wormingEn || ''),
        wormingDate: String(metrics.wormingDate || ''),
        feedingJp: String(metrics.feedingJp || ''),
        feedingEn: String(metrics.feedingEn || ''),
        exerciseJp: String(metrics.exerciseJp || ''),
        exerciseEn: String(metrics.exerciseEn || ''),
        commentJp: String(metrics.commentJp || ''),
        commentEn: String(metrics.commentEn || ''),
    };
}

export default function DepartureReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const isNew = id === 'new';
    const { user } = useAuth();
    const { workspaceId, isWorkspaceLoading, refreshWorkspace } = useWorkspace();
    const { t, language } = useLanguage();
    const { hasProductAccess, capabilities, loading: planLoading } = usePlanAccess();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [horseId, setHorseId] = useState<string | null>(null);
    const [initialData, setInitialData] = useState<Partial<DepartureReportData>>({});
    const [outputMode, setOutputMode] = useState<OutputMode>('bilingual');
    const reportDataRef = useRef<DepartureReportData | null>(null);

    const billingLockMessage = language === 'ja'
        ? '退厩時レポートは Premium プランで利用できます。プラン管理からアップグレードしてください。'
        : 'Departure reports are available on the Premium plan. Please upgrade from Billing.';

    useEffect(() => {
        if (!id || !workspaceId || !user?.id) return;
        let mounted = true;

        const load = async () => {
            try {
                if (isNew) {
                    const params = new URLSearchParams(window.location.search);
                    const paramHorseId = params.get('horseId');
                    if (!paramHorseId) {
                        if (mounted) setLoading(false);
                        return;
                    }

                    const { data: horse, error: horseError } = await supabase
                        .from('horses')
                        .select('*, clients(name), trainers(trainer_name, trainer_name_en)')
                        .eq('workspace_id', workspaceId)
                        .eq('id', paramHorseId)
                        .single();

                    if (horseError) throw horseError;
                    if (!mounted) return;

                    setHorseId(paramHorseId);
                    const next = buildDepartureInitialData({
                        horse,
                        ownerName: horse?.clients?.name || '',
                    });
                    setInitialData(next);
                    setOutputMode((next.outputMode as OutputMode) || 'bilingual');
                    setLoading(false);
                    return;
                }

                const { data: report, error: reportError } = await supabase
                    .from('reports')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .eq('id', id)
                    .single();

                if (reportError) throw reportError;

                const metrics = report.metrics_json || {};
                const { data: horse, error: horseError } = await supabase
                    .from('horses')
                    .select('*, clients(name), trainers(trainer_name, trainer_name_en)')
                    .eq('workspace_id', workspaceId)
                    .eq('id', report.horse_id)
                    .single();

                if (horseError) throw horseError;
                if (!mounted) return;

                setHorseId(report.horse_id);
                const next = buildDepartureInitialData({
                    horse,
                    ownerName: horse?.clients?.name || '',
                    metrics,
                });
                setInitialData(next);
                setOutputMode((next.outputMode as OutputMode) || 'bilingual');
                setLoading(false);
            } catch (error) {
                console.error('Departure report load error:', error);
                if (mounted) setLoading(false);
            }
        };

        void load();
        return () => {
            mounted = false;
        };
    }, [id, isNew, user?.id, workspaceId]);

    const saveReport = async () => {
        if (!reportDataRef.current || !workspaceId || !horseId) return;
        if (!hasProductAccess || !capabilities.canUseDepartureReports) {
            window.alert(billingLockMessage);
            return;
        }

        setSaving(true);
        const d = reportDataRef.current;
        const metricsJson = {
            reportType: 'departure',
            reportDate: d.reportDate,
            outputMode: d.outputMode || outputMode,
            ownerName: d.ownerName,
            birthDate: d.birthDate || '',
            horseSex: d.horseSex || '',
            trainerNameJp: d.trainerNameJp || '',
            trainerNameEn: d.trainerNameEn || '',
            sireJp: d.sireJp,
            sireEn: d.sireEn,
            damJp: d.damJp,
            damEn: d.damEn,
            weightText: d.weight,
            weightDate: d.weightDate,
            farrierJp: d.farrierJp,
            farrierEn: d.farrierEn,
            farrierDate: d.farrierDate,
            wormingJp: d.wormingJp,
            wormingEn: d.wormingEn,
            wormingDate: d.wormingDate,
            feedingJp: d.feedingJp,
            feedingEn: d.feedingEn,
            exerciseJp: d.exerciseJp,
            exerciseEn: d.exerciseEn,
            commentJp: d.commentJp,
            commentEn: d.commentEn,
        };

        const numericWeight = parseFloat((d.weight || '').replace(/[^0-9.]/g, '') || '0');
        const payload = {
            workspace_id: workspaceId,
            horse_id: horseId,
            title: d.reportDate,
            body: (d.outputMode || outputMode) === 'english_only' ? d.commentEn : d.commentJp,
            weight: numericWeight || null,
            status_training: language === 'ja' ? '退厩' : 'Departed',
            target: null,
            metrics_json: metricsJson,
            updated_at: new Date().toISOString(),
        };

        try {
            if (isNew) {
                const { data, error } = await supabase.from('reports').insert(payload).select().single();
                if (error) throw error;
                setLastSaved(new Date());
                if (data) router.replace(`/departure-reports/${data.id}`);
            } else {
                const { error } = await supabase.from('reports').update(payload).eq('workspace_id', workspaceId).eq('id', id);
                if (error) throw error;
                setLastSaved(new Date());
            }
        } catch (error) {
            console.error('Departure report save error:', error);
            window.alert(language === 'ja' ? '退厩時レポートの保存に失敗しました。' : 'Failed to save departure report.');
        } finally {
            setSaving(false);
        }
    };

    if ((loading && isWorkspaceLoading) || planLoading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-400">{t('loading')}</div>;
    }

    if (loading && !workspaceId) {
        return (
            <div className="min-h-screen flex items-start justify-center bg-gray-100 px-4 pt-10 sm:pt-20">
                <div className="w-full max-w-2xl rounded-xl border border-stone-200 bg-white p-6 shadow-xl">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-primary">{t('workspaceSetupRequiredTitle')}</h2>
                        <LanguageToggle />
                    </div>
                    <p className="mb-6 text-sm leading-7 text-stone-500">{t('workspaceSetupRequiredBody')}</p>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={() => void refreshWorkspace()} className="btn-primary rounded-lg px-4 py-2 text-sm font-semibold">
                            {t('retryWorkspaceLoad')}
                        </button>
                        <Link href="/dashboard" className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                            {t('backToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center bg-gray-100 py-3 font-sans sm:py-8 print:block print:min-h-0 print:bg-white print:py-0">
            <div className="control-panel btn-primary sticky top-0 z-50 mb-4 w-full max-w-[210mm] rounded-none px-3 py-3 shadow-lg no-print sm:top-4 sm:mb-6 sm:rounded-md sm:p-4">
                <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,180px)_minmax(0,1fr)_auto] lg:items-center">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <Link href="/dashboard" className="flex shrink-0 items-center gap-1 text-white/80 transition-colors hover:text-white">
                                <ArrowLeft size={20} />
                            </Link>
                            <div className="min-w-0">
                                <div className="text-sm font-bold leading-tight">{language === 'ja' ? '退厩時レポート' : 'Departure Report'}</div>
                                {lastSaved && <div className="mt-1 flex items-center gap-1 text-[10px] text-white/70"><Check size={8} /> {t('savedAt')} {lastSaved.toLocaleTimeString()}</div>}
                            </div>
                        </div>
                        <div className="shrink-0 sm:hidden">
                            <LanguageToggle />
                        </div>
                    </div>

                    <div className="hidden items-center text-[11px] text-white/65 sm:flex">
                        Premium / Departure Report
                    </div>

                    <div className="flex items-center justify-between gap-2 lg:justify-end">
                        <div className="hidden sm:block">
                            <LanguageToggle />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={saveReport}
                                disabled={saving || !hasProductAccess || !capabilities.canUseDepartureReports}
                                title={!hasProductAccess || !capabilities.canUseDepartureReports ? billingLockMessage : undefined}
                                className="btn-primary flex items-center gap-2 rounded px-3 py-2 text-sm font-bold transition-all disabled:opacity-50 sm:px-4"
                            >
                                <Save size={16} />
                                {saving ? t('saving') : t('saveReport')}
                            </button>
                            <button
                                onClick={() => {
                                    if (!hasProductAccess || !capabilities.canUseDepartureReports) {
                                        window.alert(billingLockMessage);
                                        return;
                                    }
                                    window.print();
                                }}
                                disabled={!hasProductAccess || !capabilities.canUseDepartureReports}
                                title={!hasProductAccess || !capabilities.canUseDepartureReports ? billingLockMessage : undefined}
                                className="btn-accent flex items-center gap-2 rounded px-3 py-2 text-sm font-bold transition-all disabled:opacity-50 sm:px-4"
                            >
                                <Printer size={16} /> PDF
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {(!hasProductAccess || !capabilities.canUseDepartureReports) && (
                <div className="mb-4 w-full max-w-[210mm] rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 no-print">
                    <div className="font-semibold">{language === 'ja' ? '退厩時レポートは利用できません' : 'Departure reports are unavailable'}</div>
                    <div className="mt-1">{billingLockMessage}</div>
                    <div className="mt-3">
                        <Link href="/dashboard/billing" className="inline-flex rounded-lg border border-amber-400 px-3 py-2 font-semibold text-amber-900 hover:bg-amber-100">
                            {language === 'ja' ? 'プラン管理を開く' : 'Open Billing'}
                        </Link>
                    </div>
                </div>
            )}

            <div className="flex w-full justify-center overflow-x-auto pb-8 print:overflow-visible print:pb-0">
                <DepartureReportTemplate
                    initialData={initialData}
                    onDataChange={(data) => {
                        reportDataRef.current = data;
                    }}
                    readOnly={!hasProductAccess || !capabilities.canUseDepartureReports}
                    outputMode={outputMode}
                    onOutputModeChange={(mode) => setOutputMode(mode as OutputMode)}
                    userId={user?.id || null}
                />
            </div>
        </div>
    );
}
