'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Search, Activity } from 'lucide-react';
import Link from 'next/link';

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

    const fetchHorses = useCallback(async () => {
        const { data, error } = await supabase
            .from('horses')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) console.error(error);
        if (data) setHorses(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchHorses();
    }, [fetchHorses]);

    async function createHorse() {
        const name = prompt("馬名を入力してください (例: テンコーウィナー)");
        if (!name) return;

        const { data, error } = await supabase
            .from('horses')
            .insert([{ name, name_en: 'New Horse' }])
            .select()
            .single();

        if (data) {
            setHorses([data, ...horses]);
            // Ideally redirect to edit page, but for now just refresh list
        }
    }

    const filteredHorses = horses.filter(h =>
        h.name.includes(search) || h.name_en?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 text-[#333] font-sans pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-[var(--color-primary)] text-white p-1.5 rounded">
                            <Activity size={20} />
                        </div>
                        <span className="font-bold text-lg tracking-tight">GEMINI STABLE</span>
                    </div>
                    <button
                        onClick={createHorse}
                        className="bg-[var(--color-primary)] hover:bg-[#2c4a3b] text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <Plus size={16} /> Add Horse
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-5xl mx-auto px-4 py-8">

                {/* Search */}
                <div className="mb-8 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search horses..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all"
                    />
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="text-center py-20 text-gray-400">Loading...</div>
                ) : filteredHorses.length === 0 ? (
                    <div className="text-center py-20 text-gray-400">No horses found. Add one!</div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredHorses.map(horse => (
                            <Link href={`/horses/${horse.id}`} key={horse.id}>
                                <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-gray-100 group h-full flex flex-col">
                                    {/* Image Area */}
                                    <div className="h-48 bg-gray-100 relative overflow-hidden">
                                        {horse.photo_url ? (
                                            <img src={horse.photo_url} alt={horse.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                <Activity size={48} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="font-bold text-lg text-gray-800">{horse.name}</h3>
                                            <span className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-500">{horse.updated_at.split('T')[0]}</span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-serif mb-3">{horse.name_en || '-'}</p>

                                        <div className="mt-auto pt-3 border-t border-gray-50 text-xs text-gray-400 flex gap-4">
                                            <span>Sire: {horse.sire || '-'}</span>
                                            <span>Dam: {horse.dam || '-'}</span>
                                        </div>
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
