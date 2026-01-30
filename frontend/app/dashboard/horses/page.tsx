'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function HorsesPage() {
    interface Horse {
        id: string;
        name: string;
        name_en: string;
        birth_date?: string | null;
        horse_status?: string | null;
        owner_id?: string;
        clients?: { name: string; };
        trainer_id?: string | null;
        trainers?: { trainer_name: string; trainer_name_en?: string | null; trainer_location?: string | null; };
    }

    const { t, language } = useLanguage();
    const { user, session } = useAuth();
    const [horses, setHorses] = useState<Horse[]>([]);
    const [sortMode, setSortMode] = useState<'name' | 'trainer'>('name');

    const calculateHorseAge = (birthDate?: string | null) => {
        if (!birthDate) return '';
        const year = new Date(birthDate).getFullYear();
        if (Number.isNaN(year)) return '';
        return `${new Date().getFullYear() - year}`;
    };

    const getHorseStatus = (status?: string | null) => {
        const normalized = status || 'Active';
        const map: Record<string, { label: string; className: string }> = {
            Active: { label: t('horseStatusActive'), className: 'bg-green-100 text-green-800' },
            Resting: { label: t('horseStatusResting'), className: 'bg-amber-100 text-amber-800' },
            Injured: { label: t('horseStatusInjured'), className: 'bg-red-100 text-red-800' },
            Retired: { label: t('horseStatusRetired'), className: 'bg-gray-100 text-gray-700' },
            Sold: { label: t('horseStatusSold'), className: 'bg-blue-100 text-blue-800' },
            Other: { label: t('horseStatusOther'), className: 'bg-stone-100 text-stone-700' }
        };
        return map[normalized] || map.Other;
    };

    useEffect(() => {
        if (!user) return; // Wait for user

        let isMounted = true;
        const fetchHorses = async (retryCount = 0) => {
            try {
                // Try fetching with clients first
                const { data, error } = await supabase
                    .from('horses')
                    .select('*, clients(name), trainers(trainer_name, trainer_name_en, trainer_location)')
                    .order('name');

                if (error) {
                    // Warning: Relationship might not exist yet if SQL wasn't run
                    console.warn('Fetch with clients failed, try simple fetch:', error.message);
                    const { data: simpleData, error: simpleError } = await supabase
                        .from('horses')
                        .select('*')
                        .order('name');

                    if (simpleError) throw simpleError;
                    if (isMounted) setHorses(simpleData as Horse[] || []);
                } else {
                    if (isMounted) setHorses(data as Horse[] || []);
                }
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Error fetching horses:', error);

                // Retry logic
                if (isMounted && retryCount < 2) {
                    console.log(`Retrying fetch... (${retryCount + 1})`);
                    setTimeout(() => fetchHorses(retryCount + 1), 500);
                } else if (isMounted && session?.access_token) {
                    // FALLBACK: Raw Fetch
                    try {
                        console.warn('Attempting raw fetch fallback for horses...');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        if (!supabaseUrl || !anonKey) throw new Error('Missing env vars');

                        const res = await fetch(`${supabaseUrl}/rest/v1/horses?select=*,clients(name),trainers(trainer_name,trainer_name_en,trainer_location)&order=name`, {
                            headers: {
                                'apikey': anonKey,
                                'Authorization': `Bearer ${session.access_token}`
                            }
                        });

                        if (!res.ok) throw new Error('Raw fetch failed');
                        const rawData = await res.json();

                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const formatted = rawData.map((h: any) => ({
                            ...h,
                            clients: h.clients // Ensure structure matches
                        }));

                        if (isMounted) setHorses(formatted);
                    } catch (fallbackError) {
                        console.error('Fallback failed:', fallbackError);
                    }
                }
            }
        };

        fetchHorses();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, session?.access_token]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t('deleteConfirm') || 'Are you sure you want to delete'} "${name}"?`)) return;

        try {
            const { data, error } = await supabase.from('horses').delete().eq('id', id).select();
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error('Delete operation affected 0 rows. Check RLS policies.');
            }
            setHorses(prev => prev.filter(h => h.id !== id));
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Delete error:', error);
            alert(`Failed to delete: ${error.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-white border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-stone-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">format_list_bulleted</span>
                    {t('horses') || 'Horses'}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value as 'name' | 'trainer')}
                        className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-600"
                    >
                        <option value="name">{t('sortByName')}</option>
                        <option value="trainer">{t('sortByTrainer')}</option>
                    </select>
                    <Link href="/dashboard/horses/new" className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark transition-all">
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">{t('addHorse')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-stone-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('birthDate')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('age')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('trainer')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{t('horseStatusLabel')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {[...horses]
                                    .sort((a, b) => {
                                        if (sortMode === 'trainer') {
                                            const aName = (language === 'ja'
                                                ? a.trainers?.trainer_name
                                                : a.trainers?.trainer_name_en || a.trainers?.trainer_name) || '';
                                            const bName = (language === 'ja'
                                                ? b.trainers?.trainer_name
                                                : b.trainers?.trainer_name_en || b.trainers?.trainer_name) || '';
                                            return aName.localeCompare(bName);
                                        }
                                        const aHorse = (language === 'ja' ? a.name : a.name_en) || '';
                                        const bHorse = (language === 'ja' ? b.name : b.name_en) || '';
                                        return aHorse.localeCompare(bHorse);
                                    })
                                    .map((horse) => (
                                    <tr key={horse.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-1.5 w-1.5 rounded-full bg-stone-300 mr-3"></div>
                                                <div>
                                                    <div className="text-sm font-medium text-stone-900">
                                                        {language === 'ja' ? horse.name : horse.name_en}
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        {language === 'ja' ? horse.name_en : horse.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                            {horse.birth_date || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                            {calculateHorseAge(horse.birth_date) || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                            {horse.clients?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-600">
                                            {horse.trainers
                                                ? (
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {language === 'ja'
                                                                ? horse.trainers.trainer_name
                                                                : (horse.trainers.trainer_name_en || horse.trainers.trainer_name)}
                                                        </span>
                                                        {horse.trainers.trainer_location && (
                                                            <span className="text-xs text-stone-400">{horse.trainers.trainer_location}</span>
                                                        )}
                                                    </div>
                                                )
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {(() => {
                                                const status = getHorseStatus(horse.horse_status);
                                                return (
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.className}`}>
                                                        {status.label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link href={`/dashboard/horses/${horse.id}`} className="text-primary hover:text-primary-dark mr-4">
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(horse.id, language === 'ja' ? horse.name : horse.name_en)}
                                                className="text-stone-400 hover:text-red-500 transition-colors"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}
