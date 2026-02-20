'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';
import Sidebar from '@/components/Sidebar';
import BottomBar from '@/components/BottomBar';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';
import LanguageToggle from '@/components/LanguageToggle';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const searchParams = useSearchParams();
    const isPrintView = searchParams?.get('print') === '1';
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    if (isPrintView) {
        return (
            <div className="block w-full min-h-screen bg-white text-stone-850 font-sans antialiased">
                <main className="block w-full h-auto overflow-visible">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-background-light text-stone-850 font-sans antialiased overflow-hidden relative">
            <Sidebar />
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-12 bg-[#FDFCF8] border-b border-stone-200 flex items-center justify-between px-3">
                <button
                    type="button"
                    onClick={() => setMobileMenuOpen(true)}
                    className="bg-white/90 border border-stone-200 rounded-lg p-1.5 shadow-sm"
                    aria-label="Open menu"
                >
                    <span className="material-symbols-outlined text-stone-700">menu</span>
                </button>
                <div className="relative h-7 w-28">
                    <Image
                        src="/HamagikuLogoSVG.svg"
                        alt="Hamagiku Farm"
                        fill
                        className="object-contain"
                        priority
                    />
                </div>
                <div className="scale-90 origin-right">
                    <LanguageToggle />
                </div>
            </div>
            <MobileMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-20 lg:pb-0 pt-12 lg:pt-0">
                {children}
            </main>
            <BottomBar />
        </div>
    );
}
