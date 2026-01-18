'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function HorsesPage() {
    const { t, language } = useLanguage();
    const [horses, setHorses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHorses();
    }, []);

    const fetchHorses = async () => {
        try {
            // Try fetching with clients first
            const { data, error } = await supabase
                .from('horses')
                .select('*, clients(name)')
                .order('name');

            if (error) {
                // Warning: Relationship might not exist yet if SQL wasn't run
                console.warn('Fetch with clients failed, falling back to simple fetch:', error.message);
                const { data: simpleData, error: simpleError } = await supabase
                    .from('horses')
                    .select('*')
                    .order('name');

                if (simpleError) throw simpleError;
                setHorses(simpleData || []);
            } else {
                setHorses(data || []);
            }
        } catch (error: any) {
            console.error('Error fetching horses:', error.message || error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-stone-200">
                <div className="text-xl font-bold text-stone-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">format_list_bulleted</span>
                    {t('horses') || 'Horses'}
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/horses/new" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg shadow-sm hover:bg-primary-dark transition-all">
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">Add Horse</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Owner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                            {horses.map((horse) => (
                                <tr key={horse.id} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-stone-200 flex items-center justify-center text-stone-500 font-bold text-lg mr-3">
                                                {(language === 'ja' ? horse.name : horse.name_en)?.charAt(0) || 'H'}
                                            </div>
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
                                        {horse.clients?.name || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Active
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/dashboard/horses/${horse.id}`} className="text-primary hover:text-primary-dark">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
