'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import LanguageToggle from '@/components/LanguageToggle';

export default function Sidebar() {
    const { t } = useLanguage();
    const { signOut } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="w-64 h-screen bg-[#FDFCF8] border-r border-stone-200" />;
    }

    return (
        <aside className="w-20 lg:w-64 shrink-0 flex flex-col justify-between border-r border-stone-200 bg-[#F5F4F0] backdrop-blur-sm transition-all duration-300">
            <div className="h-24 flex items-center justify-center lg:justify-start lg:px-6 relative">
                <div className="relative w-full h-16 lg:h-20 max-w-[180px]">
                    <Image
                        src="/HamagikuLogoSVG.svg"
                        alt="Hamagiku Farm"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
            </div>
            <nav className="flex-1 px-4 flex flex-col gap-2 py-4">
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">dashboard</span>
                    <span className="hidden lg:block text-sm font-medium">{t('dashboard')}</span>
                </Link>
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/horses">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">format_list_bulleted</span>
                    <span className="hidden lg:block text-sm font-medium">{t('horses') || 'Horses'}</span>
                </Link>
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/repro">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">monitor_heart</span>
                    <span className="hidden lg:block text-sm font-medium">{t('reproManagement') || 'Repro Management'}</span>
                </Link>
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/clients">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">group</span>
                    <span className="hidden lg:block text-sm font-medium">{t('clients') || 'Clients'}</span>
                </Link>
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/trainers">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">badge</span>
                    <span className="hidden lg:block text-sm font-medium">{t('trainers') || 'Trainers'}</span>
                </Link>
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/weights">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">monitoring</span>
                    <span className="hidden lg:block text-sm font-medium">{t('weights') || 'Weight Management'}</span>
                </Link>
                <Link className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/settings">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">settings</span>
                    <span className="hidden lg:block text-sm font-medium">{t('settings') || 'Settings'}</span>
                </Link>
            </nav>
            <div className="p-2 lg:p-4 mt-auto border-t border-stone-200 flex flex-col gap-4 justify-center lg:block">
                <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-red-600 hover:bg-red-50 transition-colors group mb-2"
                >
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">logout</span>
                    <span className="hidden lg:block text-sm font-medium">Original Sign Out</span>
                </button>
                <LanguageToggle />
            </div>
        </aside >
    );
}
