'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewHorsePage() {
    interface Client {
        id: string;
        name: string;
    }

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        owner_id: '',
        sire: '',
        dam: ''
    });

    const [ownerSearch, setOwnerSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Filter clients based on search
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    useEffect(() => {
        const fetchClients = async () => {
            const { data } = await supabase.from('clients').select('id, name').order('name');
            if (data) setClients(data);
        };
        fetchClients();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
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
                        .insert({ name: ownerSearch })
                        .select()
                        .single();

                    if (clientError) throw clientError;
                    finalOwnerId = newClient.id;
                }
            }

            const { error } = await supabase.from('horses').insert({
                name: formData.name,
                name_en: formData.name_en,
                owner_id: finalOwnerId || null,
                sire: formData.sire,
                dam: formData.dam
            });

            if (error) throw error;
            router.push('/dashboard/horses');
            router.refresh();
        } catch (error: unknown) {
            alert('Error creating horse: ' + (error as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 lg:p-12">
            <div className="mb-8 flex items-center gap-4">
                <Link href="/dashboard/horses" className="text-stone-500 hover:text-stone-800">
                    <span className="material-symbols-outlined">arrow_back</span>
                </Link>
                <h1 className="text-2xl font-bold text-stone-800">Register New Horse</h1>
            </div>

            <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Horse Name (JP)</label>
                            <input
                                required
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                placeholder="例: ハマギクベガ"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Horse Name (EN)</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                placeholder="e.g. Demo Vega"
                                value={formData.name_en}
                                onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="relative">
                        <label className="block text-sm font-medium text-stone-700 mb-1">Owner (Client)</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20 pl-10"
                                placeholder="Search or create new owner..."
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
                                    <div className="px-4 py-2 text-sm text-[#1a3c34] bg-[#1a3c34]/5 font-medium">
                                        New owner will be created: &quot;{ownerSearch}&quot;
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
                            <label className="block text-sm font-medium text-stone-700 mb-1">Sire</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.sire}
                                onChange={e => setFormData({ ...formData, sire: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Dam</label>
                            <input
                                type="text"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.dam}
                                onChange={e => setFormData({ ...formData, dam: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-stone-100 flex justify-end gap-3">
                        <Link href="/dashboard/horses" className="px-5 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-[#1a3c34] text-white rounded-lg font-medium hover:bg-[#122b25] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading ? 'Saving...' : 'Register Horse'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
