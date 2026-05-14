'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import Link from 'next/link';

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
    const { workspaceId } = useWorkspace();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || !workspaceId) return;

        let isMounted = true;
        const fetchClients = async (retryCount = 0) => {
            try {
                const { data, error } = await supabase
                    .from('clients')
                    .select('*')
                    .eq('workspace_id', workspaceId)
                    .order('name');

                if (error) throw error;
                if (isMounted) setClients(data as Client[] || []);
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Error fetching clients:', error);

                if (isMounted && retryCount < 2) {
                    console.log(`Retrying fetch... (${retryCount + 1})`);
                    setTimeout(() => fetchClients(retryCount + 1), 500);
                } else if (isMounted && session?.access_token) {
                    // FALLBACK: Raw Fetch
                    try {
                        console.warn('Attempting raw fetch fallback for clients...');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        if (!supabaseUrl || !anonKey) throw new Error('Missing env vars');

                        const res = await fetch(`${supabaseUrl}/rest/v1/clients?select=*&workspace_id=eq.${workspaceId}&order=name`, {
                            headers: {
                                'apikey': anonKey,
                                'Authorization': `Bearer ${session.access_token}`
                            }
                        });

                        if (!res.ok) throw new Error('Raw fetch failed');
                        const rawData = await res.json();

                        if (isMounted) setClients(rawData);
                    } catch (fallbackError) {
                        console.error('Fallback failed:', fallbackError);
                    }
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchClients();

        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id, session?.access_token, workspaceId]);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`${t('deleteConfirm') || 'Are you sure you want to delete'} "${name}"?`)) return;
        if (!workspaceId) return;

        try {
            const { data, error } = await supabase.from('clients').delete().eq('workspace_id', workspaceId).eq('id', id).select();
            if (error) throw error;
            if (!data || data.length === 0) {
                // If RLS denies delete, it often returns no error but deletes 0 rows.
                throw new Error('Delete operation affected 0 rows. Check RLS policies.');
            }
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Delete error:', error);
            alert(`Failed to delete: ${error.message || 'Unknown error'}`);
        }
    };

    if (loading) {
        return <div className="p-6 text-stone-500">{t('loading')}</div>;
    }

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-white border-b border-stone-200 gap-3 sm:gap-0">
                <div className="dashboard-page-title flex items-center gap-2 text-xl">
                    <span className="material-symbols-outlined">group</span>
                    {t('clients') || 'Clients'}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link href="/dashboard/clients/new" className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-3 py-2 text-white shadow-sm transition-all sm:px-4">
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
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('clientName')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('email')}</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-stone-500">{t('phone')}</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-stone-500">{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {clients.map((client) => (
                                    <tr key={client.id} className="hover:bg-stone-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="bg-primary-soft text-primary mr-3 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
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
                                                {t('view')}
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(client.id, client.name)}
                                                className="text-stone-400 hover:text-red-500 transition-colors"
                                                title={t('deleteReport')}
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
