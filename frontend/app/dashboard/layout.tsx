'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import BottomBar from '@/components/BottomBar';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';

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
            <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-40 bg-white/90 border border-stone-200 rounded-lg p-2 shadow-sm"
                aria-label="Open menu"
            >
                <span className="material-symbols-outlined text-stone-700">menu</span>
            </button>
            <MobileMenuDrawer open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative pb-20 lg:pb-0">
                {children}
            </main>
            <BottomBar />
        </div>
    );
}
