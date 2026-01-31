'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Trainer = {
    id: string;
    trainer_name: string;
    trainer_name_en?: string | null;
    trainer_location?: string | null;
    report_output_mode?: string | null;
    created_at?: string;
};

export default function TrainersPage() {
    const { user, session } = useAuth();
    const { t } = useLanguage();
    const refreshKey = useResumeRefresh();
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditingId, setIsEditingId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState({
        trainer_name: '',
        trainer_name_en: '',
        trainer_location: '',
        report_output_mode: 'pdf'
    });

    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        const fetchTrainers = async (retryCount = 0) => {
            try {
                const { data, error } = await supabase
                    .from('trainers')
                    .select('*')
                    .order('trainer_name');

                if (error) throw error;
                if (isMounted) setTrainers(data as Trainer[] || []);
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Error fetching trainers:', error);

                if (isMounted && retryCount < 2) {
                    setTimeout(() => fetchTrainers(retryCount + 1), 500);
                } else if (isMounted && session?.access_token) {
                    try {
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        if (!supabaseUrl || !anonKey) throw new Error('Missing env vars');

                        const res = await fetch(`${supabaseUrl}/rest/v1/trainers?select=*&order=trainer_name`, {
                            headers: {
                                'apikey': anonKey,
                                'Authorization': `Bearer ${session.access_token}`
                            }
                        });
                        if (!res.ok) throw new Error('Raw fetch failed');
                        const rawData = await res.json();
                        if (isMounted) setTrainers(rawData);
                    } catch (fallbackError) {
                        console.error('Fallback failed:', fallbackError);
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchTrainers();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, session?.access_token, refreshKey]);

    const resetForm = () => {
        setFormData({ trainer_name: '', trainer_name_en: '', trainer_location: '', report_output_mode: 'pdf' });
        setIsEditingId(null);
    };

    const handleEdit = (trainer: Trainer) => {
        setIsEditingId(trainer.id);
        setFormData({
            trainer_name: trainer.trainer_name || '',
            trainer_name_en: trainer.trainer_name_en || '',
            trainer_location: trainer.trainer_location || '',
            report_output_mode: trainer.report_output_mode || 'pdf'
        });
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t('deleteConfirm') || 'Are you sure you want to delete'} "${name}"?`)) return;
        try {
            const { data, error } = await supabase.from('trainers').delete().eq('id', id).select();
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Delete operation affected 0 rows. Check RLS policies.');
            }
            setTrainers(prev => prev.filter(t => t.id !== id));
            if (isEditingId === id) resetForm();
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Failed to delete: ${error.message || 'Unknown error'}`);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.trainer_name.trim()) {
            alert('Trainer Name (JP) is required');
            return;
        }

        try {
            if (isEditingId) {
                const { error } = await supabase
                    .from('trainers')
                    .update({
                        trainer_name: formData.trainer_name,
                        trainer_name_en: formData.trainer_name_en || null,
                        trainer_location: formData.trainer_location || null,
                        report_output_mode: formData.report_output_mode
                    })
                    .eq('id', isEditingId);

                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('trainers')
                    .insert({
                        trainer_name: formData.trainer_name,
                        trainer_name_en: formData.trainer_name_en || null,
                        trainer_location: formData.trainer_location || null,
                        report_output_mode: formData.report_output_mode
                    });

                if (error) throw error;
            }

            resetForm();
            const { data } = await supabase.from('trainers').select('*').order('trainer_name');
            if (data) setTrainers(data as Trainer[]);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert('Failed to save: ' + (error.message || 'Unknown error'));
        }
    };

    if (loading) {
        return <div className="p-6 text-stone-500">Loading trainers...</div>;
    }

    const filteredTrainers = trainers.filter((trainer) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        const jp = (trainer.trainer_name || '').toLowerCase();
        const en = (trainer.trainer_name_en || '').toLowerCase();
        const loc = (trainer.trainer_location || '').toLowerCase();
        return jp.includes(q) || en.includes(q) || loc.includes(q);
    });

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-white border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-stone-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">badge</span>
                    {t('trainers') || 'Trainers'}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('searchPlaceholder') || 'Search...'}
                            className="w-56 rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20 px-3 py-2 text-sm"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 mb-6">
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{t('trainerNameJp')}</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.trainer_name}
                                onChange={(e) => setFormData({ ...formData, trainer_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{t('trainerNameEn')}</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.trainer_name_en}
                                onChange={(e) => setFormData({ ...formData, trainer_name_en: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{t('trainerLocation')}</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.trainer_location}
                                onChange={(e) => setFormData({ ...formData, trainer_location: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-stone-600 mb-1">{t('reportOutputMode')}</label>
                            <select
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.report_output_mode}
                                onChange={(e) => setFormData({ ...formData, report_output_mode: e.target.value })}
                            >
                                <option value="pdf">{t('reportOutputPdf')}</option>
                                <option value="print">{t('reportOutputPrint')}</option>
                            </select>
                        </div>

                        <div className="md:col-span-4 flex gap-3 justify-end pt-2">
                            {isEditingId && (
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="px-4 py-2 text-sm rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200"
                                >
                                    {t('cancel') || 'Cancel'}
                                </button>
                            )}
                            <button
                                type="submit"
                                className="px-5 py-2 text-sm rounded-lg bg-[#1a3c34] text-white hover:bg-[#122b25] shadow-sm"
                            >
                                {isEditingId ? t('saveChanges') || 'Save Changes' : t('addTrainer') || 'Add Trainer'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('trainerNameJp')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('trainerNameEn')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('trainerLocation')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('reportOutputMode')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">{t('actions') || 'Actions'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {filteredTrainers.map((trainer) => (
                                    <tr key={trainer.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-stone-900">{trainer.trainer_name}</td>
                                        <td className="px-6 py-4 text-sm text-stone-600">{trainer.trainer_name_en || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-stone-600">{trainer.trainer_location || '-'}</td>
                                        <td className="px-6 py-4 text-sm text-stone-600">
                                            {trainer.report_output_mode === 'print' ? t('reportOutputPrint') : t('reportOutputPdf')}
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleEdit(trainer)}
                                                className="text-primary hover:text-primary-dark mr-4"
                                            >
                                                {t('editTrainer') || 'Edit'}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(trainer.id, trainer.trainer_name)}
                                                className="text-stone-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredTrainers.length === 0 && (
                                    <tr>
                                        <td className="px-6 py-6 text-sm text-stone-400" colSpan={4}>
                                            {searchQuery ? 'No matching trainers.' : 'No trainers found.'}
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
