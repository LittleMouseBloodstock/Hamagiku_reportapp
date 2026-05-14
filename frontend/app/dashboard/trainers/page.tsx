'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';

type Trainer = {
    id: string;
    trainer_name: string;
    trainer_name_en: string | null;
    trainer_location: string | null;
    trainer_location_en: string | null;
    report_output_mode: string | null;
};

const initialForm = {
    trainer_name: '',
    trainer_name_en: '',
    trainer_location: '',
    trainer_location_en: '',
    report_output_mode: 'pdf',
};

export default function TrainersPage() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const { workspaceId } = useWorkspace();
    const { loading: planLoading, hasProductAccess, capabilities } = usePlanAccess();

    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        if (!user || !workspaceId || !hasProductAccess || !capabilities.canUseTrainerManagement) return;

        let cancelled = false;

        const fetchTrainers = async () => {
            try {
                const { data, error } = await supabase
                    .from('trainers')
                    .select('id, trainer_name, trainer_name_en, trainer_location, trainer_location_en, report_output_mode')
                    .eq('workspace_id', workspaceId)
                    .order('trainer_name');

                if (error) throw error;
                if (!cancelled) setTrainers((data || []) as Trainer[]);
            } catch (error) {
                console.error('Failed to load trainers:', error);
            }
        };

        void fetchTrainers();

        return () => {
            cancelled = true;
        };
    }, [user, workspaceId, hasProductAccess, capabilities.canUseTrainerManagement]);

    const filteredTrainers = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return trainers;
        return trainers.filter((trainer) => {
            return [
                trainer.trainer_name,
                trainer.trainer_name_en,
                trainer.trainer_location,
                trainer.trainer_location_en,
            ].some((value) => String(value || '').toLowerCase().includes(q));
        });
    }, [searchQuery, trainers]);

    const resetForm = () => {
        setEditingId(null);
        setFormData(initialForm);
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!workspaceId || !formData.trainer_name.trim()) return;

        setSaving(true);
        try {
            const payload = {
                workspace_id: workspaceId,
                trainer_name: formData.trainer_name.trim(),
                trainer_name_en: formData.trainer_name_en.trim() || null,
                trainer_location: formData.trainer_location.trim() || null,
                trainer_location_en: formData.trainer_location_en.trim() || null,
                report_output_mode: formData.report_output_mode,
            };

            if (editingId) {
                const { error } = await supabase
                    .from('trainers')
                    .update(payload)
                    .eq('workspace_id', workspaceId)
                    .eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('trainers').insert(payload);
                if (error) throw error;
            }

            const { data, error } = await supabase
                .from('trainers')
                .select('id, trainer_name, trainer_name_en, trainer_location, trainer_location_en, report_output_mode')
                .eq('workspace_id', workspaceId)
                .order('trainer_name');

            if (error) throw error;
            setTrainers((data || []) as Trainer[]);
            resetForm();
        } catch (error) {
            console.error('Failed to save trainer:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!workspaceId || !window.confirm(`${t('deleteConfirm')} "${name}"?`)) return;

        try {
            const { error } = await supabase.from('trainers').delete().eq('workspace_id', workspaceId).eq('id', id);
            if (error) throw error;
            setTrainers((prev) => prev.filter((trainer) => trainer.id !== id));
            if (editingId === id) resetForm();
        } catch (error) {
            console.error('Failed to delete trainer:', error);
        }
    };

    const handleEdit = (trainer: Trainer) => {
        setEditingId(trainer.id);
        setFormData({
            trainer_name: trainer.trainer_name || '',
            trainer_name_en: trainer.trainer_name_en || '',
            trainer_location: trainer.trainer_location || '',
            trainer_location_en: trainer.trainer_location_en || '',
            report_output_mode: trainer.report_output_mode || 'pdf',
        });
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="flex flex-col gap-3 border-b border-stone-200 bg-white px-4 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
                <div className="dashboard-page-title flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">badge</span>
                    {t('trainers')}
                </div>
                <div className="self-end sm:self-auto">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('searchOwnerPlaceholder')}
                        className="input-brand px-3 py-2 text-sm"
                    />
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                {planLoading ? (
                    <div className="text-center text-stone-400">{t('loading')}</div>
                ) : !hasProductAccess || !capabilities.canUseTrainerManagement ? (
                    <div className="mx-auto max-w-2xl rounded-2xl border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm">
                        <div className="text-lg font-bold">{t('trainerLockedTitle')}</div>
                        <div className="mt-2 text-sm leading-7">{t('trainerLockedBody')}</div>
                        <div className="mt-4">
                            <Link href="/dashboard/billing" className="inline-flex rounded-lg border border-amber-400 px-4 py-2 font-semibold text-amber-900 hover:bg-amber-100">
                                {t('billing')}
                            </Link>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-600">{t('trainerNameJp')}</label>
                                    <input className="input-brand w-full px-3 py-2 text-sm" value={formData.trainer_name} onChange={(e) => setFormData((prev) => ({ ...prev, trainer_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-600">{t('trainerNameEn')}</label>
                                    <input className="input-brand w-full px-3 py-2 text-sm" value={formData.trainer_name_en} onChange={(e) => setFormData((prev) => ({ ...prev, trainer_name_en: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-600">{t('trainerLocation')} (JP)</label>
                                    <input className="input-brand w-full px-3 py-2 text-sm" value={formData.trainer_location} onChange={(e) => setFormData((prev) => ({ ...prev, trainer_location: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-stone-600">{t('trainerLocation')} (EN)</label>
                                    <input className="input-brand w-full px-3 py-2 text-sm" value={formData.trainer_location_en} onChange={(e) => setFormData((prev) => ({ ...prev, trainer_location_en: e.target.value }))} />
                                </div>
                                <div className="md:col-span-4 flex justify-end gap-3 pt-2">
                                    {editingId ? (
                                        <button type="button" onClick={resetForm} className="rounded-lg bg-stone-100 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-200">
                                            {t('cancel')}
                                        </button>
                                    ) : null}
                                    <button type="submit" disabled={saving} className="btn-primary rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50">
                                        {editingId ? t('saveChanges') : saving ? t('saving') : t('addTrainer')}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-stone-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('trainerNameJp')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('trainerNameEn')}</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('trainerLocation')}</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200">
                                        {filteredTrainers.map((trainer) => (
                                            <tr key={trainer.id} className="transition-colors hover:bg-stone-50">
                                                <td className="px-6 py-4 text-sm text-stone-900">{trainer.trainer_name}</td>
                                                <td className="px-6 py-4 text-sm text-stone-600">{trainer.trainer_name_en || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-stone-600">
                                                    {language === 'ja'
                                                        ? trainer.trainer_location || trainer.trainer_location_en || '-'
                                                        : trainer.trainer_location_en || trainer.trainer_location || '-'}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-medium">
                                                    <button type="button" onClick={() => handleEdit(trainer)} className="mr-4 text-primary hover:text-primary-dark">
                                                        {t('editTrainer')}
                                                    </button>
                                                    <button type="button" onClick={() => handleDelete(trainer.id, trainer.trainer_name)} className="text-stone-400 hover:text-red-500">
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredTrainers.length === 0 ? (
                                            <tr>
                                                <td className="px-6 py-6 text-sm text-stone-400" colSpan={4}>
                                                    {t('noTrainersFound')}
                                                </td>
                                            </tr>
                                        ) : null}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
