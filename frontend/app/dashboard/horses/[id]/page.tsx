'use client';
import { useEffect, useState } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, FileText, Calendar, Activity, User } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

import Link from 'next/link';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    photo_url: string | null;
    sire: string;
    sire_en?: string;
    dam: string;
    dam_en?: string;
    updated_at: string;
    owner_id: string | null;
    clients: { id: string, name: string } | null;
};

type Report = {
    id: string;
    created_at: string;
    title: string | null;
    status_training: string | null;
    weight: number | null;
    horse_id: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metrics_json?: any;
};

type Client = {
    id: string;
    name: string;
};

export default function HorseDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { language, t } = useLanguage();
    const [horse, setHorse] = useState<Horse | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [editMode, setEditMode] = useState(false);

    // Form & Owner State
    const [clients, setClients] = useState<Client[]>([]);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        sire: '',
        sire_en: '',
        dam: '',
        dam_en: '',
        owner_id: ''
    });

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;

            // 1. Fetch all clients for autocomplete
            const { data: clientsData } = await supabase.from('clients').select('id, name').order('name');
            if (clientsData) setClients(clientsData);

            // 2. Fetch Horse with Owner Info
            // Note: We select clients(id, name) to get the joined data
            const { data: h } = await supabase
                .from('horses')
                .select('*, clients(id, name)')
                .eq('id', id)
                .single();

            if (h) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const horseData = h as any; // Cast to handle the joined 'clients' property easily if strict typing issues arise
                setHorse(horseData);

                setFormData({
                    name: horseData.name || '',
                    name_en: horseData.name_en || '',
                    sire: horseData.sire || '',
                    sire_en: horseData.sire_en || '',
                    dam: horseData.dam || '',
                    dam_en: horseData.dam_en || '',
                    owner_id: horseData.owner_id || ''
                });

                // Set initial owner search text
                if (horseData.clients) {
                    setOwnerSearch(horseData.clients.name);
                } else {
                    setOwnerSearch('');
                }
            }

            // 3. Fetch Reports
            const { data: r } = await supabase
                .from('reports')
                .select('*')
                .eq('horse_id', id)
                .order('created_at', { ascending: false });
            if (r) setReports(r);
        };
        fetchData();
    }, [id]);

    const handleUpdateHorse = async () => {
        try {
            let finalOwnerId: string | null = formData.owner_id;

            // Owner Update Logic (Same as New Horse Page)
            // If text is entered but no existing ID matches (or name changed), create/find client
            if (ownerSearch && (!finalOwnerId || clients.find(c => c.id === finalOwnerId)?.name !== ownerSearch)) {
                // Check exact match
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
            } else if (!ownerSearch) {
                // If search cleared, remove owner
                finalOwnerId = null;
            }

            const { error } = await supabase
                .from('horses')
                .update({
                    name: formData.name,
                    name_en: formData.name_en,
                    sire: formData.sire,
                    sire_en: formData.sire_en,
                    dam: formData.dam,
                    dam_en: formData.dam_en,
                    owner_id: finalOwnerId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);

            if (error) throw error;

            // Refetch to get updated relation data
            // Or just update local state if we trust it. Let's refetch for safety on owner change.
            const { data: h } = await supabase
                .from('horses')
                .select('*, clients(id, name)')
                .eq('id', id)
                .single();

            if (h) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const horseData = h as any;
                setHorse(horseData);
                setEditMode(false);
                // Update client list if we added one (optional, but good practice)
                const { data: clientsData } = await supabase.from('clients').select('id, name').order('name');
                if (clientsData) setClients(clientsData);
            }

        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert('Failed to update: ' + error.message);
        }
    };

    const createReport = async () => {
        const { data } = await supabase
            .from('reports')
            .insert([{ horse_id: id, status_training: 'Training' }])
            .select()
            .single();

        if (data) {
            router.push(`/reports/${data.id}`);
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!window.confirm(t('confirmDeleteReport'))) return;

        try {
            const { error } = await supabase.from('reports').delete().eq('id', reportId);

            if (error) throw error;

            alert(t('deleteSuccess'));
            setReports(prev => prev.filter(r => r.id !== reportId));

        } catch (error) {
            console.error('Error deleting report:', error);
            alert(t('deleteError') + (error as Error).message);
        }
    };

    if (!horse) return <div className="p-10 text-center">Loading...</div>;

    const displayName = language === 'ja' ? horse.name : horse.name_en;
    const displaySubName = language === 'ja' ? horse.name_en : horse.name;

    // Fallback for sire/dam if only one exists
    const displaySire = language === 'ja' ? horse.sire : (horse.sire_en || horse.sire);
    const displayDam = language === 'ja' ? horse.dam : (horse.dam_en || horse.dam);

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Nav */}
            <div className="bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
                <Link href="/dashboard/horses" className="text-gray-500 hover:text-gray-800 flex items-center gap-1 text-sm font-bold">
                    <ArrowLeft size={16} /> {language === 'ja' ? '馬一覧に戻る' : 'Back to Horses'}
                </Link>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono hidden sm:block">ID: {horse.id.slice(0, 8)}</span>
                    <LanguageToggle />
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-4 py-8">
                {/* Horse Header */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8 flex flex-col md:flex-row gap-6 items-start border border-gray-100">
                    <div className="flex-1 w-full">
                        {editMode ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Name Fields */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('horseNameJp')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('horseNameEn')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} />
                                    </div>

                                    {/* Owner Selection Field - COPIED FROM NEW PAGE */}
                                    <div className="col-span-1 md:col-span-2 relative">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><User size={12} /> {t('ownerTransfer')}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded p-2 pl-8 focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent outline-none"
                                                placeholder={t('searchOwnerPlaceholder')}
                                                value={ownerSearch}
                                                onChange={e => {
                                                    setOwnerSearch(e.target.value);
                                                    setFormData({ ...formData, owner_id: '' }); // Clear ID implies change
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                            />
                                            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
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
                                                        {t('newOwnerWillBeCreated')} &quot;{ownerSearch}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Overlay to close suggestions */}
                                        {showSuggestions && (
                                            <div className="fixed inset-0 z-0" onClick={() => setShowSuggestions(false)} />
                                        )}
                                    </div>

                                    {/* Sire/Dam Fields */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('sireJp')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.sire} onChange={e => setFormData({ ...formData, sire: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('sireEn')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.sire_en} onChange={e => setFormData({ ...formData, sire_en: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('damJp')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.dam} onChange={e => setFormData({ ...formData, dam: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('damEn')}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.dam_en} onChange={e => setFormData({ ...formData, dam_en: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">{displayName}</h1>
                                <p className="text-lg text-gray-400 font-serif mb-4">{displaySubName}</p>
                                <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('sire')}</span> {displaySire || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('dam')}</span> {displayDam || '-'}</div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100"><span className="font-bold text-gray-300 block text-xs uppercase">{t('owner')}</span> {horse.clients?.name || t('noOwner')}</div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={createReport}
                            className="bg-[var(--color-primary)] hover:brightness-110 text-white px-5 py-2.5 rounded-full font-bold shadow-md flex items-center gap-2 transition-all whitespace-nowrap"
                        >
                            <Plus size={18} /> {t('createReportBtn')}
                        </button>
                        {editMode ? (
                            <div className="flex gap-2">
                                <button onClick={handleUpdateHorse} className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold flex-1">{t('save')}</button>
                                <button onClick={() => setEditMode(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-bold flex-1">{t('cancel')}</button>
                            </div>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2 rounded-full text-sm font-bold transition-all">
                                {t('editProfile')}
                            </button>
                        )}
                    </div>
                </div>

                {/* Reports List */}
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">{language === 'ja' ? 'レポート履歴' : 'Report History'}</h2>

                {reports.length === 0 ? (
                    <div className="text-center py-10 bg-white rounded-lg border border-dashed border-gray-300 text-gray-400">
                        {language === 'ja' ? 'レポートはまだありません。作成してください！' : 'No reports yet. Create one!'}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {reports.map(report => (
                            <Link href={`/reports/${report.id}`} key={report.id}>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-[var(--color-light-bg)] group-hover:text-[var(--color-primary)] transition-colors">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-700">{report.title || (language === 'ja' ? '無題のレポート' : 'Untitled Report')}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-3 mt-1">
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(report.created_at).toLocaleDateString()}</span>
                                                {(report.status_training || report.metrics_json?.statusEn) && (
                                                    <span className="flex items-center gap-1">
                                                        <Activity size={10} />
                                                        {language === 'ja' ? (report.status_training || report.metrics_json?.statusJp) : (report.metrics_json?.statusEn || report.status_training)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end justify-between">
                                        <span className="text-sm font-bold text-[var(--color-primary)] mb-2">{report.weight ? `${report.weight}kg` : '-'}</span>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteReport(report.id);
                                            }}
                                            className="text-gray-300 hover:text-red-500 transition-colors"
                                            title={t('deleteReport')}
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
