'use client';

import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import BottomBar from '@/components/BottomBar';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';
import AnonymizedDataConsentBanner from '@/components/AnonymizedDataConsentBanner';
import { useBranding } from '@/contexts/BrandingContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Image from 'next/image';
import LanguageToggle from '@/components/LanguageToggle';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading: authLoading } = useAuth();
    const { branding, resolvedLogoUrl } = useBranding();
    const { t } = useLanguage();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    if (authLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background-light text-stone-850">
                <div className="text-sm text-stone-500">Loading workspace...</div>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full bg-background-light text-stone-850 font-sans antialiased overflow-hidden">
            <Sidebar />
            <MobileMenuDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-[#FDFCF8] px-4 py-3">
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(true)}
                        className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700"
                    >
                        <span className="material-symbols-outlined text-base">menu</span>
                        {t('mobileMenu')}
                    </button>
                    <div className="flex min-w-0 items-center gap-2">
                        <LanguageToggle />
                        <Image
                            src={resolvedLogoUrl || (branding.logoConcept === 'nature' ? '/shinba-nature.svg' : '/brand-mark.png')}
                            alt={branding.farmName}
                            width={34}
                            height={34}
                            className="rounded-xl"
                        />
                        <div className="text-right">
                            <div className="max-w-[110px] truncate text-sm font-semibold text-[var(--brand-primary)] sm:max-w-[160px]">{branding.farmName}</div>
                            <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--brand-accent)]">Shinba</div>
                        </div>
                    </div>
                </header>
                <AnonymizedDataConsentBanner />
                {children}
                {user ? <BottomBar /> : null}
            </main>
        </div>
    );
}
