'use client';

import { useState, useEffect } from 'react';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { buildRestHeaders, restDelete, restGet } from '@/lib/restClient';

export default function ClientsPage() {
    interface Client {
        id: string;
        name: string;
        contact_email?: string;
        contact_phone?: string;
        created_at: string;
    }

    const { t } = useLanguage();
    const { user, session } = useAuth();
    const refreshKey = useResumeRefresh();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Allow refetch on resume even if user is temporarily null

        let isMounted = true;

        const getRestHeaders = () => {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            return buildRestHeaders({ bearerToken: session.access_token });
        };

        const fetchClients = async (retryCount = 0) => {
            try {
                if (!session?.access_token) return;
                const data = await restGet('clients?select=*&order=name', getRestHeaders());
                if (isMounted) setClients(data as Client[] || []);
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const msg = String(error?.message || '');
                if (msg.includes('AbortError') && isMounted && retryCount < 3) {
                    setTimeout(() => fetchClients(retryCount + 1), 800);
                    return;
                }
                console.error('Error fetching clients:', error);
                if (isMounted && retryCount < 2) {
                    setTimeout(() => fetchClients(retryCount + 1), 800);
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchClients();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, session?.access_token, refreshKey]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t('deleteConfirm') || 'Are you sure you want to delete'} "${name}"?`)) return;

        try {
            if (!session?.access_token) {
                throw new Error('Missing access token for REST');
            }
            await restDelete(`clients?id=eq.${id}`, buildRestHeaders({ bearerToken: session.access_token }));
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Delete error:', error);
            alert(`Failed to delete: ${error.message || 'Unknown error'}`);
        }
    };

    if (loading) {
        return <div className="p-6 text-stone-500">Loading clients...</div>;
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-white border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">group</span>
                    {t('clients') || 'Clients'}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link href="/dashboard/clients/new" className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[#1a3c34] text-white rounded-lg shadow-sm hover:bg-[#122b25] transition-all">
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">{t('addClient')}</span>
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
                                            <Link href={`/dashboard/clients/${client.id}`} className="text-primary hover:text-primary-dark mr-4">
                                                View
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(client.id, client.name)}
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
