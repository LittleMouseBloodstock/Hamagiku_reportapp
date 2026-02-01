'use client';

import { useState, useEffect } from 'react';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

export default function NewHorsePage() {
    const { t } = useLanguage();
    const { session } = useAuth();
    const refreshKey = useResumeRefresh();
    interface Client {
        id: string;
        name: string;
    }
    interface Trainer {
        id: string;
        trainer_name: string;
        trainer_name_en?: string | null;
        trainer_location?: string | null;
    }

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [clients, setClients] = useState<Client[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [trainerId, setTrainerId] = useState('');
    const [isNewTrainer, setIsNewTrainer] = useState(false);
    const [newTrainer, setNewTrainer] = useState({
        trainer_name: '',
        trainer_name_en: '',
        trainer_location: ''
    });

    const calculateHorseAge = (birthDate?: string) => {
        if (!birthDate) return '';
        const year = new Date(birthDate).getFullYear();
        if (Number.isNaN(year)) return '';
        return `${new Date().getFullYear() - year}`;
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        owner_id: '',
        sire: '',
        dam: '',
        birth_date: '',
        horse_status: 'Active'
    });

    const [ownerSearch, setOwnerSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const getRestHeaders = () => {
        if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
            throw new Error('Missing env vars or access token for REST');
        }
        return {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        };
    };

    const restGet = async (path: string) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: getRestHeaders() });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST GET failed: ${res.status} ${text}`);
        }
        return res.json();
    };

    const restPost = async (path: string, body: unknown) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
            method: 'POST',
            headers: { ...getRestHeaders(), 'Prefer': 'return=representation' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST POST failed: ${res.status} ${text}`);
        }
        return res.json();
    };

    // Filter clients based on search
    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    useEffect(() => {
        if (!session?.access_token) return;
        const fetchClients = async () => {
            const data = await restGet('clients?select=id,name&order=name');
            if (data) setClients(data);
        };
        const fetchTrainers = async () => {
            const data = await restGet('trainers?select=id,trainer_name,trainer_name_en,trainer_location&order=trainer_name');
            if (data) setTrainers(data);
        };
        fetchClients();
        fetchTrainers();
    }, [session?.access_token, refreshKey]);

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
                    const created = await restPost('clients', { name: ownerSearch });
                    if (!created || created.length === 0) throw new Error('Failed to create client');
                    finalOwnerId = created[0].id;
                }
            }

            let finalTrainerId: string | null = trainerId || null;
            if (isNewTrainer) {
                if (!newTrainer.trainer_name.trim()) {
                    throw new Error('Trainer name (JP) is required');
                }
                const createdTrainer = await restPost('trainers', {
                    trainer_name: newTrainer.trainer_name,
                    trainer_name_en: newTrainer.trainer_name_en || null,
                    trainer_location: newTrainer.trainer_location || null
                });
                if (!createdTrainer || createdTrainer.length === 0) throw new Error('Failed to create trainer');
                finalTrainerId = createdTrainer[0].id;
            }

            await restPost('horses', {
                name: formData.name,
                name_en: formData.name_en,
                owner_id: finalOwnerId || null,
                trainer_id: finalTrainerId,
                sire: formData.sire,
                dam: formData.dam,
                birth_date: formData.birth_date || null,
                horse_status: formData.horse_status || 'Active'
            });
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
                                placeholder="e.g. Hamagiku Vega"
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

                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Trainer</label>
                        <select
                            className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                            value={trainerId}
                            onChange={(e) => setTrainerId(e.target.value)}
                            disabled={isNewTrainer}
                        >
                            <option value="">-- None --</option>
                            {trainers.map((trainer) => (
                                <option key={trainer.id} value={trainer.id}>
                                    {trainer.trainer_name}{trainer.trainer_name_en ? ` / ${trainer.trainer_name_en}` : ''}{trainer.trainer_location ? ` (${trainer.trainer_location})` : ''}
                                </option>
                            ))}
                        </select>
                        <div className="mt-2">
                            <button
                                type="button"
                                className="text-xs text-[#1a3c34] hover:underline"
                                onClick={() => {
                                    setIsNewTrainer((prev) => !prev);
                                    if (!isNewTrainer) setTrainerId('');
                                }}
                            >
                                {isNewTrainer ? 'Use existing trainer' : 'Add new trainer'}
                            </button>
                        </div>
                        {isNewTrainer && (
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Trainer Name (JP)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={newTrainer.trainer_name}
                                        onChange={(e) => setNewTrainer({ ...newTrainer, trainer_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Trainer Name (EN)</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={newTrainer.trainer_name_en}
                                        onChange={(e) => setNewTrainer({ ...newTrainer, trainer_name_en: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-stone-600 mb-1">Location</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={newTrainer.trainer_location}
                                        onChange={(e) => setNewTrainer({ ...newTrainer, trainer_location: e.target.value })}
                                    />
                                </div>
                            </div>
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
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Birth Date</label>
                            <input
                                type="date"
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.birth_date}
                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                            />
                            <p className="mt-1 text-xs text-stone-500">
                                Age: {calculateHorseAge(formData.birth_date) || '-'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">{t('horseStatusLabel')}</label>
                            <select
                                className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                value={formData.horse_status}
                                onChange={(e) => setFormData({ ...formData, horse_status: e.target.value })}
                            >
                                <option value="Active">{t('horseStatusActive')}</option>
                                <option value="Resting">{t('horseStatusResting')}</option>
                                <option value="Injured">{t('horseStatusInjured')}</option>
                                <option value="Retired">{t('horseStatusRetired')}</option>
                                <option value="Sold">{t('horseStatusSold')}</option>
                                <option value="Other">{t('horseStatusOther')}</option>
                            </select>
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
