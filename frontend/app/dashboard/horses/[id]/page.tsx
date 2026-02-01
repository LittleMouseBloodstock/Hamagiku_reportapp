'use client';
import { useEffect, useState } from 'react';
export const runtime = 'edge';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, FileText, Calendar, Activity, User } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

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
    birth_date?: string | null;
    horse_status?: string | null;
    owner_id: string | null;
    clients: { id: string, name: string } | null;
    trainer_id?: string | null;
    trainers?: { id: string; trainer_name: string; trainer_name_en?: string | null; trainer_location?: string | null; trainer_location_en?: string | null; } | null;
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
type Trainer = {
    id: string;
    trainer_name: string;
    trainer_name_en?: string | null;
    trainer_location?: string | null;
    trainer_location_en?: string | null;
};

export default function HorseDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { language, t } = useLanguage();
    const { user, session } = useAuth();
    const refreshKey = useResumeRefresh();
    const [horse, setHorse] = useState<Horse | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [editMode, setEditMode] = useState(false);

    // Form & Owner State
    const [clients, setClients] = useState<Client[]>([]);
    const [trainers, setTrainers] = useState<Trainer[]>([]);
    const [ownerSearch, setOwnerSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [trainerId, setTrainerId] = useState('');
    const [isNewTrainer, setIsNewTrainer] = useState(false);
    const [newTrainer, setNewTrainer] = useState({
        trainer_name: '',
        trainer_name_en: '',
        trainer_location: '',
        trainer_location_en: ''
    });

    const calculateHorseAge = (birthDate?: string | null) => {
        if (!birthDate) return '';
        const year = new Date(birthDate).getFullYear();
        if (Number.isNaN(year)) return '';
        return `${new Date().getFullYear() - year}`;
    };

    const [formData, setFormData] = useState({
        name: '',
        name_en: '',
        sire: '',
        sire_en: '',
        dam: '',
        dam_en: '',
        owner_id: '',
        birth_date: '',
        horse_status: 'Active'
    });

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

    const restPatch = async (path: string, body: unknown) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
            method: 'PATCH',
            headers: { ...getRestHeaders(), 'Prefer': 'return=representation' },
            body: JSON.stringify(body)
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST PATCH failed: ${res.status} ${text}`);
        }
        return res.json();
    };

    const restDelete = async (path: string) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
            method: 'DELETE',
            headers: getRestHeaders()
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST DELETE failed: ${res.status} ${text}`);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(ownerSearch.toLowerCase())
    );

    useEffect(() => {
        if (!session?.access_token || !id) return; // Wait for auth + id

        let isMounted = true;
        const fetchData = async (retryCount = 0) => {
            try {
                const [clientsData, trainersData, horseData, reportsData] = await Promise.all([
                    restGet('clients?select=id,name&order=name'),
                    restGet('trainers?select=id,trainer_name,trainer_name_en,trainer_location,trainer_location_en&order=trainer_name'),
                    restGet(`horses?select=*,clients(id,name),trainers(id,trainer_name,trainer_name_en,trainer_location,trainer_location_en)&id=eq.${id}`),
                    restGet(`reports?select=*&horse_id=eq.${id}&order=created_at.desc`)
                ]);

                if (isMounted) {
                    setClients(clientsData || []);
                    setTrainers(trainersData || []);
                }

                const h = horseData && horseData.length > 0 ? horseData[0] : null;
                if (h && isMounted) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const horseDataItem = h as any;
                    setHorse(horseDataItem);
                    setFormData({
                        name: horseDataItem.name || '',
                        name_en: horseDataItem.name_en || '',
                        sire: horseDataItem.sire || '',
                        sire_en: horseDataItem.sire_en || '',
                        dam: horseDataItem.dam || '',
                        dam_en: horseDataItem.dam_en || '',
                        owner_id: horseDataItem.owner_id || '',
                        birth_date: horseDataItem.birth_date || '',
                        horse_status: horseDataItem.horse_status || 'Active'
                    });
                    setTrainerId(horseDataItem.trainer_id || '');
                    if (horseDataItem.clients) setOwnerSearch(horseDataItem.clients.name);
                    else setOwnerSearch('');
                }

                if (reportsData && isMounted) setReports(reportsData);

            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                console.error('Error fetching horse details:', error);

                // Retry logic
                if (isMounted && retryCount < 2) {
                    console.log(`Retrying detail fetch... (${retryCount + 1})`);
                    setTimeout(() => fetchData(retryCount + 1), 500);
                }
            }
        };

        fetchData();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, user?.id, session?.access_token, refreshKey]);

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
                    const created = await restPost('clients', { name: ownerSearch });
                    if (!created || created.length === 0) throw new Error('Failed to create client');
                    finalOwnerId = created[0].id;
                }
            } else if (!ownerSearch) {
                // If search cleared, remove owner
                finalOwnerId = null;
            }

            let finalTrainerId: string | null = trainerId || null;
            if (isNewTrainer) {
                if (!newTrainer.trainer_name.trim()) {
                    throw new Error('Trainer name (JP) is required');
                }
                const createdTrainer = await restPost('trainers', {
                    trainer_name: newTrainer.trainer_name,
                    trainer_name_en: newTrainer.trainer_name_en || null,
                    trainer_location: newTrainer.trainer_location || null,
                    trainer_location_en: newTrainer.trainer_location_en || null
                });
                if (!createdTrainer || createdTrainer.length === 0) throw new Error('Failed to create trainer');
                finalTrainerId = createdTrainer[0].id;
            }

            await restPatch(`horses?id=eq.${id}`, {
                name: formData.name,
                name_en: formData.name_en,
                sire: formData.sire,
                sire_en: formData.sire_en,
                dam: formData.dam,
                dam_en: formData.dam_en,
                owner_id: finalOwnerId,
                trainer_id: finalTrainerId,
                birth_date: formData.birth_date || null,
                horse_status: formData.horse_status || 'Active',
                updated_at: new Date().toISOString()
            });

            // Refetch to get updated relation data
            // Or just update local state if we trust it. Let's refetch for safety on owner change.
            const hRes = await restGet(`horses?select=*,clients(id,name),trainers(id,trainer_name,trainer_name_en,trainer_location,trainer_location_en)&id=eq.${id}`);
            const h = hRes && hRes.length > 0 ? hRes[0] : null;

            if (h) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const horseData = h as any;
                setHorse(horseData);
                setTrainerId(horseData.trainer_id || '');
                setEditMode(false);
                // Update client list if we added one (optional, but good practice)
                const [clientsData, trainersData] = await Promise.all([
                    restGet('clients?select=id,name&order=name'),
                    restGet('trainers?select=id,trainer_name,trainer_name_en,trainer_location,trainer_location_en&order=trainer_name')
                ]);
                if (clientsData) setClients(clientsData);
                if (trainersData) setTrainers(trainersData);
            }

        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert('Failed to update: ' + error.message);
        }
    };

    const createReport = async () => {
        const created = await restPost('reports', [{ horse_id: id, status_training: 'Training' }]);
        if (created && created.length > 0) {
            router.push(`/reports/${created[0].id}`);
        }
    };

    const handleDeleteReport = async (reportId: string) => {
        if (!window.confirm(t('confirmDeleteReport'))) return;

        try {
            await restDelete(`reports?id=eq.${reportId}`);

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

                                    {/* Trainer Selection */}
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">{t('trainer')}</label>
                                        <select
                                            className="w-full border border-gray-300 rounded p-2"
                                            value={trainerId}
                                            onChange={(e) => setTrainerId(e.target.value)}
                                            disabled={isNewTrainer}
                                        >
                                            <option value="">{t('noTrainer')}</option>
                                            {trainers.map((trainer) => (
                                                <option key={trainer.id} value={trainer.id}>
                                                    {trainer.trainer_name}
                                                    {trainer.trainer_name_en ? ` / ${trainer.trainer_name_en}` : ''}
                                                    {(() => {
                                                        const loc = language === 'ja'
                                                            ? trainer.trainer_location
                                                            : (trainer.trainer_location_en || trainer.trainer_location);
                                                        return loc ? ` (${loc})` : '';
                                                    })()}
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
                                                {isNewTrainer ? t('useExistingTrainer') : t('addNewTrainer')}
                                            </button>
                                        </div>
                                        {isNewTrainer && (
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('trainerNameJp')}</label>
                                                    <input className="w-full border border-gray-300 rounded p-2" value={newTrainer.trainer_name} onChange={e => setNewTrainer({ ...newTrainer, trainer_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('trainerNameEn')}</label>
                                                    <input className="w-full border border-gray-300 rounded p-2" value={newTrainer.trainer_name_en} onChange={e => setNewTrainer({ ...newTrainer, trainer_name_en: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{t('trainerLocation')}</label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <input
                                                            className="w-full border border-gray-300 rounded p-2"
                                                            placeholder="JP"
                                                            value={newTrainer.trainer_location}
                                                            onChange={e => setNewTrainer({ ...newTrainer, trainer_location: e.target.value })}
                                                        />
                                                        <input
                                                            className="w-full border border-gray-300 rounded p-2"
                                                            placeholder="EN"
                                                            value={newTrainer.trainer_location_en}
                                                            onChange={e => setNewTrainer({ ...newTrainer, trainer_location_en: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
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
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('birthDate')}</label>
                                        <input
                                            type="date"
                                            className="w-full border border-gray-300 rounded p-2"
                                            value={formData.birth_date}
                                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                        />
                                        <div className="text-xs text-gray-500 mt-1">{t('age')}: {calculateHorseAge(formData.birth_date) || '-'}</div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{t('horseStatusLabel')}</label>
                                        <select
                                            className="w-full border border-gray-300 rounded p-2"
                                            value={formData.horse_status}
                                            onChange={e => setFormData({ ...formData, horse_status: e.target.value })}
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
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">{displayName}</h1>
                                <p className="text-lg text-gray-400 font-serif mb-4">{displaySubName}</p>
                                <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('sire')}</span> {displaySire || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{t('dam')}</span> {displayDam || '-'}</div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{t('birthDate')}</span>
                                        {horse.birth_date || '-'} / {t('age')}: {calculateHorseAge(horse.birth_date) || '-'}
                                    </div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100"><span className="font-bold text-gray-300 block text-xs uppercase">{t('owner')}</span> {horse.clients?.name || t('noOwner')}</div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{t('trainer')}</span>
                                        {horse.trainers
                                            ? `${language === 'ja'
                                                ? horse.trainers.trainer_name
                                                : (horse.trainers.trainer_name_en || horse.trainers.trainer_name)}${(() => {
                                                    const loc = language === 'ja'
                                                        ? horse.trainers.trainer_location
                                                        : (horse.trainers.trainer_location_en || horse.trainers.trainer_location);
                                                    return loc ? ` (${loc})` : '';
                                                })()}`
                                            : t('noTrainer')}
                                    </div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{t('horseStatusLabel')}</span>
                                        {horse.horse_status ? t(`horseStatus${horse.horse_status}`) : t('horseStatusActive')}
                                    </div>
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
                            <div
                                key={report.id}
                                onClick={() => router.push(`/reports/${report.id}`)}
                                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-[var(--color-accent)] hover:shadow-md transition-all cursor-pointer flex items-center justify-between group"
                            >
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
                                            e.stopPropagation(); // Only stopPropagation needed as there is no default link behavior
                                            handleDeleteReport(report.id);
                                        }}
                                        className="text-gray-300 hover:text-red-500 transition-colors"
                                        title={t('deleteReport')}
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
