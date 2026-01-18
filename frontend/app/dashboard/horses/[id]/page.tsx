'use client';
import { useEffect, useState } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { Plus, ArrowLeft, FileText, Calendar, Activity, Image as ImageIcon } from 'lucide-react';
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
};

type Report = {
    id: string;
    created_at: string;
    title: string | null;
    status_training: string | null;
    weight: number | null;
    horse_id: string;
    metrics_json?: any;
};

export default function HorseDetail() {
    const { id } = useParams();
    const router = useRouter();
    const { language, t } = useLanguage();
    const [horse, setHorse] = useState<Horse | null>(null);
    const [reports, setReports] = useState<Report[]>([]);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ name: '', name_en: '', sire: '', sire_en: '', dam: '', dam_en: '' });


    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            // Fetch Horse
            const { data: h } = await supabase.from('horses').select('*').eq('id', id).single();
            if (h) {
                setHorse(h);
                setFormData({
                    name: h.name || '',
                    name_en: h.name_en || '',
                    sire: h.sire || '',
                    sire_en: h.sire_en || '',
                    dam: h.dam || '',
                    dam_en: h.dam_en || ''
                });
            }

            // Fetch Reports
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
        const { error } = await supabase
            .from('horses')
            .update({
                name: formData.name,
                name_en: formData.name_en,
                sire: formData.sire,
                sire_en: formData.sire_en,
                dam: formData.dam,
                dam_en: formData.dam_en,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (!error && horse) {
            setHorse({ ...horse, ...formData });
            setEditMode(false);
        } else {
            alert('Failed to update: ' + error?.message);
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Horse Name (JP)</label>
                                    <input className="w-full border border-gray-300 rounded p-2" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Horse Name (EN)</label>
                                    <input className="w-full border border-gray-300 rounded p-2" value={formData.name_en} onChange={e => setFormData({ ...formData, name_en: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Sire (JP)</label>
                                    <input className="w-full border border-gray-300 rounded p-2" value={formData.sire} onChange={e => setFormData({ ...formData, sire: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Sire (EN)</label>
                                    <input className="w-full border border-gray-300 rounded p-2" value={formData.sire_en} onChange={e => setFormData({ ...formData, sire_en: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Dam (JP)</label>
                                    <input className="w-full border border-gray-300 rounded p-2" value={formData.dam} onChange={e => setFormData({ ...formData, dam: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400 uppercase">Dam (EN)</label>
                                    <input className="w-full border border-gray-300 rounded p-2" value={formData.dam_en} onChange={e => setFormData({ ...formData, dam_en: e.target.value })} />
                                </div>
                            </div>
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold text-[var(--color-primary)] mb-1">{displayName}</h1>
                                <p className="text-lg text-gray-400 font-serif mb-4">{displaySubName}</p>
                                <div className="flex gap-6 text-sm text-gray-500">
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">Sire</span> {displaySire || '-'}</div>
                                    <div><span className="font-bold text-gray-300 block text-xs uppercase">Dam</span> {displayDam || '-'}</div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={createReport}
                            className="bg-[var(--color-primary)] hover:brightness-110 text-white px-5 py-2.5 rounded-full font-bold shadow-md flex items-center gap-2 transition-all whitespace-nowrap"
                        >
                            <Plus size={18} /> {language === 'ja' ? '新規レポート' : 'New Report'}
                        </button>
                        {editMode ? (
                            <div className="flex gap-2">
                                <button onClick={handleUpdateHorse} className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold flex-1">{language === 'ja' ? '保存' : 'Save'}</button>
                                <button onClick={() => setEditMode(false)} className="bg-gray-200 text-gray-600 px-4 py-2 rounded-full text-sm font-bold flex-1">{language === 'ja' ? 'キャンセル' : 'Cancel'}</button>
                            </div>
                        ) : (
                            <button onClick={() => setEditMode(true)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2 rounded-full text-sm font-bold transition-all">
                                {language === 'ja' ? '編集' : 'Edit Profile'}
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
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-[var(--color-primary)]">{report.weight ? `${report.weight}kg` : '-'}</span>
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
