'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import LanguageToggle from '@/components/LanguageToggle';

export default function Sidebar() {
    const { t } = useLanguage();
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
        </Link>
                {/* <a className="group flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-primary hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="#">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">settings</span>
                    <span className="hidden lg:block text-sm font-medium">{t('settings')}</span>
                </a> */}
            </nav >
        <div className="p-2 lg:p-4 mt-auto border-t border-stone-200 flex justify-center lg:block">
            <LanguageToggle />
        </div>
        </aside >
    );
}
