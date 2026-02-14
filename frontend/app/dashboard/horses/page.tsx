'use client';

import { useState, useEffect } from 'react';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { buildRestHeaders, restDelete, restGet, restPatch } from '@/lib/restClient';

export default function HorsesPage() {
    interface Horse {
        id: string;
        name: string;
        name_en: string;
        birth_date?: string | null;
        horse_status?: string | null;
        departure_date?: string | null;
        owner_id?: string;
        clients?: { name: string; };
        trainer_id?: string | null;
        trainers?: { trainer_name: string; trainer_name_en?: string | null; trainer_location?: string | null; trainer_location_en?: string | null; };
    }

    const { t, language } = useLanguage();
    const { user, session } = useAuth();
    const [horses, setHorses] = useState<Horse[]>([]);
    const [sortMode, setSortMode] = useState<'name' | 'trainer'>('name');
    const [showMode, setShowMode] = useState<'active' | 'retired'>(() => {
        if (typeof window !== 'undefined') {
            const stored = window.sessionStorage.getItem('horsesShowMode');
            if (stored === 'retired') return 'retired';
        }
        return 'active';
    });
    const refreshKey = useResumeRefresh();

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

    const statusOptions = [
        { value: 'Active', label: t('horseStatusActive') },
        { value: 'Resting', label: t('horseStatusResting') },
        { value: 'Injured', label: t('horseStatusInjured') },
        { value: 'Retired', label: t('horseStatusRetired') },
        { value: 'Sold', label: t('horseStatusSold') },
        { value: 'Other', label: t('horseStatusOther') }
    ];

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.sessionStorage.setItem('horsesShowMode', showMode);
        }
    }, [showMode]);

    useEffect(() => {
        // Allow refetch on resume even if user is temporarily null

        let isMounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchHorses = async (retryCount = 0) => {
            try {
                if (!session?.access_token) return;
                const data = await restGet('horses?select=*,clients(name),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en)&order=name', getRestHeaders());
                if (isMounted) setHorses(data as Horse[] || []);
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const msg = String(error?.message || '');
                if (msg.includes('AbortError') && isMounted && retryCount < 3) {
                    setTimeout(() => fetchHorses(retryCount + 1), 800);
                    return;
                }
                console.error('Error fetching horses:', error);
                if (isMounted && retryCount < 2) {
                    setTimeout(() => fetchHorses(retryCount + 1), 800);
                }
            }
        };

        fetchHorses();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, session?.access_token, refreshKey]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t('deleteConfirm') || 'Are you sure you want to delete'} "${name}"?`)) return;

        try {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            await restDelete(`horses?id=eq.${id}`, buildRestHeaders({ bearerToken: session.access_token }));
            setHorses(prev => prev.filter(h => h.id !== id));
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Delete error:', error);
            alert(`Failed to delete: ${error.message || 'Unknown error'}`);
        }
    };

    const updateHorseStatus = async (horse: Horse, nextStatus: string) => {
        if (!session?.access_token) {
            alert('Missing access token for REST');
            return;
        }
        const prevStatus = horse.horse_status || 'Active';
        const prevDeparture = horse.departure_date || null;
        const shouldRetire = nextStatus === 'Retired';
        const nextDeparture = shouldRetire ? new Date().toISOString().slice(0, 10) : null;

        setHorses(prev => prev.map((h) => (
            h.id === horse.id
                ? { ...h, horse_status: nextStatus, departure_date: nextDeparture }
                : h
        )));

        if (shouldRetire) {
            setShowMode('retired');
        }

        try {
            await restPatch(
                `horses?id=eq.${horse.id}`,
                {
                    horse_status: nextStatus,
                    departure_date: nextDeparture,
                    updated_at: new Date().toISOString()
                },
                buildRestHeaders({ bearerToken: session.access_token })
            );
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Status update error:', error);
            alert(`Failed to update status: ${error.message || 'Unknown error'}`);
            setHorses(prev => prev.map((h) => (
                h.id === horse.id
                    ? { ...h, horse_status: prevStatus, departure_date: prevDeparture }
                    : h
            )));
            if (shouldRetire) {
                setShowMode(prevDeparture ? 'retired' : 'active');
            }
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
                        value={showMode}
                        onChange={(e) => setShowMode(e.target.value as 'active' | 'retired')}
                        className="text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white text-stone-600"
                    >
                        <option value="active">{t('showActiveOnly')}</option>
                        <option value="retired">{t('showRetiredOnly')}</option>
                    </select>
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
                                    .filter((horse) => {
                                        const isRetired = !!horse.departure_date;
                                        return showMode === 'active' ? !isRetired : isRetired;
                                    })
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
                                                        {(() => {
                                                            const loc = language === 'ja'
                                                                ? horse.trainers.trainer_location
                                                                : (horse.trainers.trainer_location_en || horse.trainers.trainer_location);
                                                            return loc ? (
                                                                <span className="text-xs text-stone-400">{loc}</span>
                                                            ) : null;
                                                        })()}
                                                    </div>
                                                )
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <select
                                                value={horse.horse_status || 'Active'}
                                                onChange={(e) => updateHorseStatus(horse, e.target.value)}
                                                className="text-xs font-semibold rounded-full px-2 py-1 border border-stone-200 bg-white text-stone-700"
                                            >
                                                {statusOptions.map((opt) => (
                                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                ))}
                                            </select>
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
