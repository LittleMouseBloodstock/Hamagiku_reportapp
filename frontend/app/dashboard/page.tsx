'use client';
import { useEffect, useState } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Search, Plus, FileText, Calendar, Activity, ChevronRight, Menu, Grid, Users, FileStack, Settings, LogOut } from 'lucide-react';
import LanguageToggle from '@/components/LanguageToggle';

type Horse = {
    id: string;
    name: string;
    name_en: string;
    photo_url: string | null;
    sire: string;
    dam: string;
    updated_at: string;
};

export default function Dashboard() {
    const [horses, setHorses] = useState<Horse[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const fetchHorses = async () => {
            const { data, error } = await supabase
                .from('horses')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) console.error(error);
            if (data) setHorses(data);
            setLoading(false);
        };
        fetchHorses();
    }, [refreshKey]);

    async function createHorse() {
        const name = prompt("馬名を入力してください (例: テンコーウィナー)");
        if (!name) return;

        const { error } = await supabase
            .from('horses')
            .insert([{ name, updated_at: new Date().toISOString() }]);

        if (error) {
            console.error(error);
            alert("エラーが発生しました");
        } else {
            setRefreshKey(prev => prev + 1);
        }
    }

    const filteredHorses = horses.filter(h =>
        h.name.includes(search) || h.name_en?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-background-light dark:bg-background-dark font-display text-[#141514] dark:text-gray-100 transition-colors duration-200">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-72 flex-col justify-between border-r border-gray-200 dark:border-gray-800 bg-surface-light dark:bg-surface-dark transition-all duration-300">
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="p-6 pb-2">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-primary/10 p-2 rounded-xl">
                                <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Hamagiku Report</h1>
                                <p className="text-slate-custom text-xs font-medium uppercase tracking-wider">Pro Edition</p>
                            </div>
                        </div>
                        {/* Navigation */}
                        <nav className="flex flex-col gap-1.5">
                            <a className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary dark:text-primary-light transition-all duration-200 group relative overflow-hidden" href="#">
                                <Grid size={20} className="icon-filled" />
                                <span className="font-semibold text-sm">Dashboard</span>
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>
                            </a>
                            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200" href="#">
                                <Calendar size={20} />
                                <span className="font-medium text-sm">Schedule</span>
                            </a>
                            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200" href="#">
                                <Users size={20} />
                                <span className="font-medium text-sm">Clients</span>
                            </a>
                            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200" href="#">
                                <Activity size={20} />
                                <span className="font-medium text-sm">Horses</span>
                            </a>
                            <a className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200" href="#">
                                <FileStack size={20} />
                                <span className="font-medium text-sm">Reports</span>
                            </a>
                        </nav>
                    </div>
                    {/* Bottom Section */}
                    <div className="p-6 mt-auto">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 cursor-pointer mb-4">
                            <Settings size={20} />
                            <span className="font-medium text-sm">Settings</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                            <div className="bg-center bg-no-repeat bg-cover rounded-xl size-10 shadow-inner bg-gray-200" />
                            <div className="flex flex-col overflow-hidden">
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white truncate">User</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Admin</p>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative scroll-smooth">
                {/* Top Mobile Header */}
                <div className="lg:hidden flex items-center justify-between p-4 bg-surface-light dark:bg-surface-dark sticky top-0 z-20 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                        <span className="font-bold text-gray-900 dark:text-white">Hamagiku</span>
                    </div>
                    <button className="p-2 text-gray-600 dark:text-gray-300">
                        <Menu size={24} />
                    </button>
                </div>

                <div className="flex-1 w-full max-w-[1200px] mx-auto p-4 md:p-8 lg:p-12 flex flex-col gap-8">
                    {/* Greeting & Stats Summary */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Good morning, Team</h1>
                            <p className="text-slate-500 dark:text-slate-400 text-lg">Here is your daily overview.</p>
                        </div>
                        <div className="flex items-center gap-4 text-sm font-medium">
                            <LanguageToggle />
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full z-10">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="text-primary/70" size={20} />
                        </div>
                        <input
                            className="w-full h-16 pl-12 pr-4 rounded-2xl border-0 bg-white dark:bg-surface-dark text-gray-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 shadow-tactile transition-all text-lg"
                            placeholder="Search horses..."
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="absolute inset-y-0 right-2 flex items-center">
                            <button
                                onClick={createHorse}
                                className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
                            >
                                <Plus size={16} /> Add Horse
                            </button>
                        </div>
                    </div>

                    {/* Stats Overview Row (Static for MVP) */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-surface-dark p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-32">
                            <div className="flex items-start justify-between">
                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Horses</span>
                                <Activity className="text-primary/40" size={20} />
                            </div>
                            <div>
                                <span className="text-3xl font-bold text-gray-900 dark:text-white">{horses.length}</span>
                                <span className="text-primary text-xs font-bold ml-2 bg-primary/10 px-1.5 py-0.5 rounded">+Active</span>
                            </div>
                        </div>
                        {/* Other stats can be placeholders or calculated */}
                    </div>

                    {/* Horses List (Grid) - Replacing "Today's Schedule" */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-1">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Active Horses</h2>
                        </div>

                        {loading ? (
                            <div className="text-center py-20 text-gray-400">Loading horses...</div>
                        ) : filteredHorses.length === 0 ? (
                            <div className="text-center py-20 text-gray-400">No horses found.</div>
                        ) : (
                            <div className="bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                                {filteredHorses.map(horse => (
                                    <Link href={`/horses/${horse.id}`} key={horse.id}>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer">
                                            <div className="flex items-center gap-4 min-w-[140px]">
                                                <div className="size-12 rounded-xl bg-gray-100 dark:bg-gray-700 overflow-hidden">
                                                    {horse.photo_url ? (
                                                        <img src={horse.photo_url} alt={horse.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Activity size={20} /></div>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{horse.name}</span>
                                                    <span className="text-xs text-slate-500">{horse.name_en || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                                        <span className="text-xs uppercase font-bold text-slate-400">Sire</span> {horse.sire || '-'}
                                                        <span className="size-1 rounded-full bg-slate-300"></span>
                                                        <span className="text-xs uppercase font-bold text-slate-400">Dam</span> {horse.dam || '-'}
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-slate-300" size={20} />
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
