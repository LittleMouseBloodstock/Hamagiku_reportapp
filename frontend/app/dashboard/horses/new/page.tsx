'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NewHorsePage() {
    interface Client {
        id: string;
        name: string;
    }

    const router = useRouter();
    const { workspaceId, isWorkspaceLoading, refreshWorkspace } = useWorkspace();
    const { t, language } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        owner_id: '',
        sire: '',
        dam: '',
        birth_date: '',
        sex: ''
    });

    const [ownerSearch, setOwnerSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter clients based on search
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    useEffect(() => {
        const fetchClients = async () => {
            if (!workspaceId) return;
            const { data } = await supabase.from('clients').select('id, name').eq('workspace_id', workspaceId).order('name');
            if (data) setClients(data);
        };
        fetchClients();
    }, [workspaceId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (!workspaceId) throw new Error('No active workspace found.');
            let finalOwnerId = formData.owner_id;

            // If text is entered but no existing ID selected (or name changed), create new client
            if (ownerSearch && (!finalOwnerId || clients.find(c => c.id === finalOwnerId)?.name !== ownerSearch)) {
                // Check if exact match exists to avoid duplicates
                const existing = clients.find(c => c.name.toLowerCase() === ownerSearch.toLowerCase());
                if (existing) {
                    finalOwnerId = existing.id;
                } else {
                    // Create new client
                    const { data: newClient, error: clientError } = await supabase
                        .from('clients')
                        .insert({ workspace_id: workspaceId, name: ownerSearch })
                        .select()
                        .single();

                    if (clientError) throw clientError;
                    finalOwnerId = newClient.id;
                }
            }

            const { error } = await supabase.from('horses').insert({
                workspace_id: workspaceId,
                name: formData.name,
                name_en: formData.name_en,
                owner_id: finalOwnerId || null,
                sire: formData.sire,
                dam: formData.dam,
                birth_date: formData.birth_date || null,
                sex: formData.sex || null
            });

            if (error) throw error;
            router.push('/dashboard/horses');
            router.refresh();
        } catch (error: unknown) {
            alert(`${t('addHorse')} error: ` + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    if (isWorkspaceLoading) {
        return <div className="mx-auto flex min-h-[40vh] max-w-2xl items-center justify-center p-6 text-stone-500">{t('loadingWorkspace')}</div>;
    }

    if (!workspaceId) {
        return (
            <div className="max-w-2xl mx-auto p-6 lg:p-12">
                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 p-8 space-y-4">
                    <h1 className="dashboard-page-title text-2xl">{t('workspaceSetupRequiredTitle')}</h1>
                    <p className="text-sm leading-7 text-stone-600">{t('workspaceSetupRequiredBody')}</p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => void refreshWorkspace()}
                            className="bg-primary hover:bg-primary-dark rounded-lg px-5 py-2.5 font-medium text-white shadow-sm transition-all"
                        >
                            {t('retryWorkspaceLoad')}
                        </button>
                        <Link href="/dashboard" className="px-5 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors">
                            {t('backToHome')}
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto p-6 lg:p-12">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/dashboard/horses" className="text-stone-500 hover:text-stone-800">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="dashboard-page-title text-2xl">{t('addHorse')}</h1>
            </div>

            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-stone-700">{t('horseNameJp')}</label>
                            <input
                                required
                                type="text"
                                className="input-brand w-full px-3 py-2"
                                placeholder="例: シンバベガ"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-stone-700">{t('horseNameEn')}</label>
                            <input
                                type="text"
                                className="input-brand w-full px-3 py-2"
                                placeholder="e.g. Demo Vega"
                                value={formData.name_en}
                                onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="mb-1 block text-sm font-medium text-stone-700">{t('owner')}</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="input-brand w-full py-2 pl-10 pr-3"
                                placeholder={t('searchOwnerPlaceholder')}
                                value={ownerSearch}
                                onChange={e => {
                                    setOwnerSearch(e.target.value);
                                    setFormData({ ...formData, owner_id: '' }); // Clear ID when typing
                                    setShowSuggestions(true);
                                }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">search</span>
                        </div>

                        {/* Suggestions Dropdown */}
                        {showSuggestions && ownerSearch && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {filteredClients.length > 0 ? (
                                    filteredClients.map(client => (
                                        <div
                                            key={client.id}
                                            className="px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm text-stone-700"
                                            onClick={() => {
                                                setOwnerSearch(client.name);
                                                setFormData({ ...formData, owner_id: client.id });
                                                setShowSuggestions(false);
                                            }}
                                        >
                                            {client.name}
                                        </div>
                                    ))
                                ) : (
                                    <div className="bg-primary-soft text-primary px-4 py-2 text-sm font-medium">
                                        {t('newOwnerWillBeCreated')} &quot;{ownerSearch}&quot;
                                    </div>
                                )}
                            </div>
                        )}
                        {showSuggestions && !ownerSearch && clients.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {clients.map(client => (
                                    <div
                                        key={client.id}
                                        className="px-4 py-2 hover:bg-stone-50 cursor-pointer text-sm text-stone-700"
                                        onClick={() => {
                                            setOwnerSearch(client.name);
                                            setFormData({ ...formData, owner_id: client.id });
                                            setShowSuggestions(false);
                                        }}
                                    >
                                        {client.name}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Overlay to close suggestions */}
                        {showSuggestions && (
                            <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)} />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-stone-700">{t('sire')}</label>
                            <input
                                type="text"
                                className="input-brand w-full px-3 py-2"
                                value={formData.sire}
                                onChange={e => setFormData({ ...formData, sire: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-stone-700">{t('dam')}</label>
                            <input
                                type="text"
                                className="input-brand w-full px-3 py-2"
                                value={formData.dam}
                                onChange={e => setFormData({ ...formData, dam: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-stone-700">{t('birthDate')}</label>
                            <input
                                type="date"
                                lang={language === 'ja' ? 'ja-JP' : 'en-GB'}
                                className="input-brand w-full px-3 py-2"
                                value={formData.birth_date}
                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-stone-700">{t('sex')}</label>
                            <select
                                className="input-brand w-full px-3 py-2"
                                value={formData.sex}
                                onChange={e => setFormData({ ...formData, sex: e.target.value })}
                            >
                                <option value="">{t('selectCondition')}</option>
                                <option value="male">{language === 'ja' ? '牡' : 'Male'}</option>
                                <option value="female">{language === 'ja' ? '牝' : 'Female'}</option>
                                <option value="gelding">{language === 'ja' ? '騸' : 'Gelding'}</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                        <Link href="/dashboard/horses" className="px-5 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors">
                            {t('cancel')}
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-white shadow-sm transition-all disabled:opacity-50"
                        >
                            {loading ? t('saving') : t('addHorse')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
