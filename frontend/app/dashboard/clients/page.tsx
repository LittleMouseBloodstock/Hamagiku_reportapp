'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function ClientsPage() {
    const { t } = useLanguage();
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clients')
                .select('*')
                .order('name');

            if (error) throw error;
            setClients(data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="h-16 flex items-center justify-between px-6 bg-white border-b border-stone-200">
                <div className="text-xl font-bold text-stone-800 flex items-center gap-2">
                    <span className="material-symbols-outlined">group</span>
                    {t('clients') || 'Clients'}
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/clients/new" className="flex items-center gap-2 px-4 py-2 bg-[#1a3c34] text-white rounded-lg shadow-sm hover:bg-[#122b25] transition-all">
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">Add Client</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-stone-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-stone-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-200">
                            {clients.map((client) => (
                                <tr key={client.id} className="hover:bg-stone-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs mr-3">
                                                {client.name?.charAt(0) || 'C'}
                                            </div>
                                            <div className="text-sm font-medium text-stone-900">
                                                {client.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                        {client.contact_email || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-500">
                                        {client.contact_phone || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/dashboard/clients/${client.id}`} className="text-primary hover:text-primary-dark">
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
