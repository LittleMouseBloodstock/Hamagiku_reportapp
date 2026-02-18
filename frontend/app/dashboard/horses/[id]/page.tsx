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
    sex?: string | null;
    horse_status?: string | null;
    departure_date?: string | null;
    last_farrier_date?: string | null;
    last_farrier_note?: string | null;
    last_worming_date?: string | null;
    last_worming_note?: string | null;
    owner_id: string | null;
    clients: { id: string, name: string } | null;
    trainer_id?: string | null;
    trainers?: { id: string; trainer_name: string; trainer_name_en?: string | null; trainer_location?: string | null; trainer_location_en?: string | null; } | null;
    broodmare_flag?: boolean | null;
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
    const [covers, setCovers] = useState<Array<{ id: string; cover_date: string; stallion_name?: string | null; note?: string | null }>>([]);
    const [scans, setScans] = useState<Array<{ id: string; cover_id: string; scheduled_date: string; actual_date?: string | null; result?: string | null; note?: string | null }>>([]);
    const [rules, setRules] = useState<Array<{ rule_name: string; days_after: number[] }>>([]);
    const [newCover, setNewCover] = useState({ cover_date: '', stallion_name: '', note: '', rule_name: 'default' });

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

    const formatHorseSex = (sex?: string | null) => {
        if (!sex) return '-';
        const map: Record<string, { ja: string; en: string }> = {
            Colt: { ja: '牡', en: 'Colt' },
            Filly: { ja: '牝', en: 'Filly' },
            Gelding: { ja: 'セン', en: 'Gelding' },
            Mare: { ja: '繁殖', en: 'Mare' },
            Stallion: { ja: '種牡馬', en: 'Stallion' }
        };
        return map[sex] ? map[sex][language] : sex;
    };

    const formatDateByLanguage = (value?: string | null) => {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return language === 'ja' ? date.toLocaleDateString('ja-JP') : date.toLocaleDateString('en-CA');
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
        sex: '',
        horse_status: 'Active',
        departure_date: '',
        last_farrier_date: '',
        last_farrier_note: '',
        last_worming_date: '',
        last_worming_note: '',
        broodmare_flag: false
    });

    const sexOptions = [
        { value: 'Colt', label: 'Colt（牡）' },
        { value: 'Filly', label: 'Filly（牝）' },
        { value: 'Gelding', label: 'Gelding（セン）' },
        { value: 'Mare', label: 'Mare（繁殖）' },
        { value: 'Stallion', label: 'Stallion（種牡馬）' }
    ];

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
                        sex: horseDataItem.sex || '',
                        horse_status: horseDataItem.horse_status || 'Active',
                        departure_date: horseDataItem.departure_date || '',
                        last_farrier_date: horseDataItem.last_farrier_date || '',
                        last_farrier_note: horseDataItem.last_farrier_note || '',
                        last_worming_date: horseDataItem.last_worming_date || '',
                        last_worming_note: horseDataItem.last_worming_note || '',
                        broodmare_flag: !!horseDataItem.broodmare_flag
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

    useEffect(() => {
        if (!session?.access_token || !id) return;
        let mounted = true;
        const fetchReproData = async () => {
            const [rulesData, coverData, scanData] = await Promise.all([
                restGet('repro_followup_rules?select=rule_name,days_after&order=rule_name.asc'),
                restGet(`repro_covers?select=id,cover_date,stallion_name,note&horse_id=eq.${id}&order=cover_date.desc`),
                restGet(`repro_scans?select=id,cover_id,scheduled_date,actual_date,result,note&horse_id=eq.${id}&order=scheduled_date.asc`)
            ]);
            if (!mounted) return;
            let nextRules = (rulesData || []) as Array<{ rule_name: string; days_after: number[] }>;
            if (nextRules.length === 0) {
                const created = await restPost('repro_followup_rules', {
                    rule_name: 'default',
                    days_after: [15, 17, 28, 40],
                    enabled: true
                });
                nextRules = created || [{ rule_name: 'default', days_after: [15, 17, 28, 40] }];
            }
            setRules(nextRules);
            setCovers(coverData || []);
            setScans(scanData || []);
        };
        fetchReproData().catch((error) => {
            console.warn('Failed to load repro data', error);
        });
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, session?.access_token]);

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
                sex: formData.sex || null,
                horse_status: formData.horse_status || 'Active',
                departure_date: formData.departure_date || null,
                last_farrier_date: formData.last_farrier_date || null,
                last_farrier_note: formData.last_farrier_note || null,
                last_worming_date: formData.last_worming_date || null,
                last_worming_note: formData.last_worming_note || null,
                broodmare_flag: formData.broodmare_flag || false,
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

    const handleCreateCover = async () => {
        if (!newCover.cover_date) {
            alert('Cover date is required');
            return;
        }
        try {
            await restPost('rpc/repro_create_cover', {
                horse_id: id,
                cover_date: newCover.cover_date,
                stallion_name: newCover.stallion_name || null,
                note: newCover.note || null,
                p_rule_name: newCover.rule_name || 'default'
            });
            const [coverData, scanData] = await Promise.all([
                restGet(`repro_covers?select=id,cover_date,stallion_name,note&horse_id=eq.${id}&order=cover_date.desc`),
                restGet(`repro_scans?select=id,cover_id,scheduled_date,actual_date,result,note&horse_id=eq.${id}&order=scheduled_date.asc`)
            ]);
            setCovers(coverData || []);
            setScans(scanData || []);
            setNewCover({ cover_date: '', stallion_name: '', note: '', rule_name: newCover.rule_name || 'default' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Failed to create cover: ${error.message || 'Unknown error'}`);
        }
    };

    const updateScan = async (scanId: string, patch: Partial<{ actual_date: string | null; result: string | null; note: string | null }>) => {
        try {
            await restPatch(`repro_scans?id=eq.${scanId}`, {
                ...patch,
                updated_at: new Date().toISOString()
            });
            setScans((prev) => prev.map((scan) => (scan.id === scanId ? { ...scan, ...patch } : scan)));
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Failed to update scan: ${error.message || 'Unknown error'}`);
        }
    };

    const createReport = async () => {
        const created = await restPost('reports', [{ horse_id: id, status_training: 'Training' }]);
        if (created && created.length > 0) {
            router.push(`/reports/${created[0].id}`);
        }
    };

    const createDepartureReport = () => {
        router.push(`/reports/new?horseId=${id}&reportType=departure`);
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
    const isBroodmare = horse.sex === 'Mare' || (horse.sex === 'Filly' && horse.broodmare_flag);

    return (
        <div className="flex-1 overflow-y-auto bg-gray-50 pb-20 font-sans">
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
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('horseNameJp') : 'Horse Name (JP)'}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('horseNameEn') : 'Horse Name (EN)'}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} />
                                    </div>

                                    {/* Owner Selection Field - COPIED FROM NEW PAGE */}
                                    <div className="col-span-1 md:col-span-2 relative">
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><User size={12} /> {language === 'ja' ? t('ownerTransfer') : 'Owner'}</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded p-2 pl-8 focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent outline-none"
                                                placeholder={language === 'ja' ? t('searchOwnerPlaceholder') : 'Search owner...'}
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
                                                        {language === 'ja' ? t('newOwnerWillBeCreated') : 'New owner will be created:'} &quot;{ownerSearch}&quot;
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
                                        <label className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">{language === 'ja' ? t('trainer') : 'Trainer'}</label>
                                        <select
                                            className="w-full border border-gray-300 rounded p-2"
                                            value={trainerId}
                                            onChange={(e) => setTrainerId(e.target.value)}
                                            disabled={isNewTrainer}
                                        >
                                            <option value="">{language === 'ja' ? t('noTrainer') : 'No trainer'}</option>
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
                                                {language === 'ja' ? (isNewTrainer ? t('useExistingTrainer') : t('addNewTrainer')) : (isNewTrainer ? 'Use existing trainer' : 'Add new trainer')}
                                            </button>
                                        </div>
                                        {isNewTrainer && (
                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{language === 'ja' ? t('trainerNameJp') : 'Trainer Name (JP)'}</label>
                                                    <input className="w-full border border-gray-300 rounded p-2" value={newTrainer.trainer_name} onChange={e => setNewTrainer({ ...newTrainer, trainer_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{language === 'ja' ? t('trainerNameEn') : 'Trainer Name (EN)'}</label>
                                                    <input className="w-full border border-gray-300 rounded p-2" value={newTrainer.trainer_name_en} onChange={e => setNewTrainer({ ...newTrainer, trainer_name_en: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase">{language === 'ja' ? t('trainerLocation') : 'Trainer Location'}</label>
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
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('sireJp') : 'Sire (JP)'}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.sire} onChange={e => setFormData({ ...formData, sire: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('sireEn') : 'Sire (EN)'}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.sire_en} onChange={e => setFormData({ ...formData, sire_en: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('damJp') : 'Dam (JP)'}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.dam} onChange={e => setFormData({ ...formData, dam: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('damEn') : 'Dam (EN)'}</label>
                                        <input className="w-full border border-gray-300 rounded p-2" value={formData.dam_en} onChange={e => setFormData({ ...formData, dam_en: e.target.value })} />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('birthDate') : 'Birth Date'}</label>
                                        {language === 'ja' ? (
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded p-2"
                                                value={formData.birth_date}
                                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="YYYY-MM-DD"
                                                className="w-full border border-gray-300 rounded p-2"
                                                value={formData.birth_date}
                                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                            />
                                        )}
                                        <div className="text-xs text-gray-500 mt-1">{language === 'ja' ? t('age') : 'Age'}: {calculateHorseAge(formData.birth_date) || '-'}</div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('sex') : 'Sex'}</label>
                                        <select
                                            className="w-full border border-gray-300 rounded p-2"
                                            value={formData.sex}
                                            onChange={e => setFormData({ ...formData, sex: e.target.value })}
                                        >
                                            <option value="">--</option>
                                            {sexOptions.map((opt) => (
                                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {formData.sex === 'Filly' && (
                                        <div className="col-span-1 md:col-span-2">
                                            <label className="text-xs font-bold text-gray-400 uppercase">{t('broodmareFlag')}</label>
                                            <label className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                                <input
                                                    type="checkbox"
                                                    checked={!!formData.broodmare_flag}
                                                    onChange={(e) => setFormData({ ...formData, broodmare_flag: e.target.checked })}
                                                />
                                                {t('broodmareFlag')}
                                            </label>
                                        </div>
                                    )}
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('horseStatusLabel') : 'Status'}</label>
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
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('departureDate') : 'Departure Date'}</label>
                                        {language === 'ja' ? (
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded p-2"
                                                value={formData.departure_date}
                                                onChange={e => setFormData({ ...formData, departure_date: e.target.value })}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                placeholder="YYYY-MM-DD"
                                                className="w-full border border-gray-300 rounded p-2"
                                                value={formData.departure_date}
                                                onChange={e => setFormData({ ...formData, departure_date: e.target.value })}
                                            />
                                        )}
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('lastFarrier') : 'Last Farrier'}</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded p-2"
                                                value={formData.last_farrier_date}
                                                onChange={e => setFormData({ ...formData, last_farrier_date: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded p-2"
                                                placeholder={language === 'ja' ? '例: 両前装蹄' : 'e.g. Front Shoes'}
                                                value={formData.last_farrier_note}
                                                onChange={e => setFormData({ ...formData, last_farrier_note: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase">{language === 'ja' ? t('lastWorming') : 'Recent Worming'}</label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <input
                                                type="date"
                                                className="w-full border border-gray-300 rounded p-2"
                                                value={formData.last_worming_date}
                                                onChange={e => setFormData({ ...formData, last_worming_date: e.target.value })}
                                            />
                                            <input
                                                type="text"
                                                className="w-full border border-gray-300 rounded p-2"
                                                placeholder={language === 'ja' ? '例: エクイバランゴールド' : 'e.g. Eqvulan Gold'}
                                                value={formData.last_worming_note}
                                                onChange={e => setFormData({ ...formData, last_worming_note: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">{displayName}</h1>
                                <p className="text-lg text-gray-400 font-serif mb-4">{displaySubName}</p>
                                <div className="flex gap-6 text-sm text-gray-500 flex-wrap">
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{language === 'ja' ? t('sire') : 'Sire'}</span> {displaySire || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">{language === 'ja' ? t('dam') : 'Dam'}</span> {displayDam || '-'}</div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{language === 'ja' ? t('birthDate') : 'Birth Date'}</span>
                                        {horse.birth_date || '-'} / {language === 'ja' ? t('age') : 'Age'}: {calculateHorseAge(horse.birth_date) || '-'}
                                    </div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{language === 'ja' ? t('sex') : 'Sex'}</span>
                                        {formatHorseSex(horse.sex)}
                                    </div>
                                    {horse.sex === 'Filly' && horse.broodmare_flag ? (
                                        <div className="bg-amber-50 px-3 py-1 rounded border border-amber-200 text-amber-700">
                                            <span className="font-bold text-gray-300 block text-xs uppercase">{t('broodmareFlag')}</span>
                                            {t('broodmareFlag')}
                                        </div>
                                    ) : null}
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100"><span className="font-bold text-gray-300 block text-xs uppercase">{language === 'ja' ? t('owner') : 'Owner'}</span> {horse.clients?.name || (language === 'ja' ? t('noOwner') : 'No owner')}</div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{language === 'ja' ? t('trainer') : 'Trainer'}</span>
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
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{t('departureDate')}</span>
                                        {formatDateByLanguage(horse.departure_date)}
                                    </div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{t('lastFarrier')}</span>
                                        {horse.last_farrier_date ? `${horse.last_farrier_date} ${horse.last_farrier_note || ''}`.trim() : '-'}
                                    </div>
                                    <div className="bg-gray-50 px-3 py-1 rounded border border-gray-100">
                                        <span className="font-bold text-gray-300 block text-xs uppercase">{t('lastWorming')}</span>
                                        {horse.last_worming_date ? `${horse.last_worming_date} ${horse.last_worming_note || ''}`.trim() : '-'}
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
                        <button
                            onClick={createDepartureReport}
                            className="bg-white border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white px-5 py-2.5 rounded-full font-bold shadow-sm flex items-center gap-2 transition-all whitespace-nowrap"
                        >
                            <FileText size={18} /> {t('createDepartureReport')}
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

                {isBroodmare && (
                    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('scanSchedule')}</h2>
                            <span className="text-xs text-gray-400">{t('reproManagement')}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">{t('coverDate')}</label>
                                <input
                                    type="date"
                                    className="w-full border border-gray-300 rounded p-2"
                                    value={newCover.cover_date}
                                    onChange={(e) => setNewCover({ ...newCover, cover_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">{t('stallionName')}</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-2"
                                    value={newCover.stallion_name}
                                    onChange={(e) => setNewCover({ ...newCover, stallion_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">{t('ruleDaysAfter')}</label>
                                <select
                                    className="w-full border border-gray-300 rounded p-2"
                                    value={newCover.rule_name}
                                    onChange={(e) => setNewCover({ ...newCover, rule_name: e.target.value })}
                                >
                                    {rules.map((rule) => (
                                        <option key={rule.rule_name} value={rule.rule_name}>
                                            {rule.rule_name} ({rule.days_after.join(',')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase">Note</label>
                                <input
                                    type="text"
                                    className="w-full border border-gray-300 rounded p-2"
                                    value={newCover.note}
                                    onChange={(e) => setNewCover({ ...newCover, note: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end mb-6">
                            <button
                                onClick={handleCreateCover}
                                className="bg-[var(--color-primary)] hover:brightness-110 text-white px-4 py-2 rounded-full text-sm font-bold"
                            >
                                {t('addCover')}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase mb-2">{t('coverDate')}</div>
                                <div className="space-y-2">
                                    {covers.length === 0 ? (
                                        <div className="text-sm text-gray-400">-</div>
                                    ) : (
                                        covers.map((cover) => (
                                            <div key={cover.id} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                                <div className="font-semibold">{cover.cover_date}</div>
                                                <div>{cover.stallion_name || '-'}</div>
                                                {cover.note ? <div className="text-xs text-gray-400">{cover.note}</div> : null}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase mb-2">{t('scanSchedule')}</div>
                                <div className="space-y-2">
                                    {scans.length === 0 ? (
                                        <div className="text-sm text-gray-400">-</div>
                                    ) : (
                                        scans.map((scan) => (
                                            <div key={scan.id} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                                <div className="font-semibold">{scan.scheduled_date}</div>
                                                <div className="grid grid-cols-2 gap-2 mt-2">
                                                    <input
                                                        type="date"
                                                        className="w-full border border-gray-300 rounded p-1 text-xs"
                                                        value={scan.actual_date || ''}
                                                        onChange={(e) => updateScan(scan.id, { actual_date: e.target.value || null })}
                                                    />
                                                    <select
                                                        className="w-full border border-gray-300 rounded p-1 text-xs"
                                                        value={scan.result || ''}
                                                        onChange={(e) => updateScan(scan.id, { result: e.target.value || null })}
                                                    >
                                                        <option value="">--</option>
                                                        <option value="pregnant">Pregnant</option>
                                                        <option value="empty">Empty</option>
                                                        <option value="uncertain">Uncertain</option>
                                                    </select>
                                                </div>
                                                <input
                                                    type="text"
                                                    className="mt-2 w-full border border-gray-300 rounded p-1 text-xs"
                                                    placeholder="note"
                                                    value={scan.note || ''}
                                                    onChange={(e) => updateScan(scan.id, { note: e.target.value || null })}
                                                />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
