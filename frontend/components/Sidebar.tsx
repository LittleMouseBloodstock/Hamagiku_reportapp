'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import LanguageToggle from '@/components/LanguageToggle';
import { dashboardNavItems } from '@/components/dashboardNavItems';

export default function Sidebar() {
    const { t } = useLanguage();
    const { signOut } = useAuth();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="hidden lg:block w-64 h-screen bg-[#FDFCF8] border-r border-stone-200" />;
    }

    return (
        <aside className="hidden lg:flex h-screen min-h-0 w-64 shrink-0 flex-col border-r border-stone-200 bg-[#F5F4F0] backdrop-blur-sm transition-all duration-300">
            <div className="shrink-0 px-6 pt-4 pb-4 border-b border-stone-200">
                <div className="relative w-full h-14 max-w-[150px] mb-3">
                    <Image
                        src="/HamagikuLogoSVG.svg"
                        alt="Hamagiku Farm"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </div>
                <LanguageToggle />
            </div>
            <nav className="min-h-0 flex-1 overflow-y-auto px-4 flex flex-col gap-2 py-4">
                {dashboardNavItems.map((item) => (
                    <Link
                        key={item.href}
                        className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200"
                        href={item.href}
                    >
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">{item.icon}</span>
                        <span className="hidden lg:block text-sm font-medium">{t(item.labelKey) || item.labelKey}</span>
                    </Link>
                ))}
            </nav>
            <div className="shrink-0 border-t border-stone-200 px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3">
                <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-red-600 hover:bg-red-50 transition-colors group"
                >
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">logout</span>
                    <span className="hidden lg:block text-sm font-medium">Original Sign Out</span>
                </button>
                <div className="flex justify-start">
                    <LanguageToggle />
                </div>
            </div>
        </aside >
    );
}
