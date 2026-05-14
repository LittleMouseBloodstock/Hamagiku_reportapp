'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';
import Image from 'next/image';

export default function Sidebar() {
    const { t } = useLanguage();
    const { signOut } = useAuth();
    const { branding, resolvedLogoUrl } = useBranding();
    const { capabilities } = usePlanAccess();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        return <div className="app-shell h-screen w-64 border-r border-stone-200" />;
    }

    return (
        <aside className="app-panel hidden w-72 shrink-0 flex-col justify-between border-r border-stone-200 backdrop-blur-sm transition-all duration-300 lg:flex">
            <div className="h-24 flex items-center justify-center lg:justify-start lg:px-6 relative">
                <div className="relative flex w-full items-center gap-3">
                    <Image
                        src={resolvedLogoUrl || (branding.logoConcept === 'nature' ? '/shinba-nature.svg' : '/brand-mark.png')}
                        alt={branding.farmName}
                        width={48}
                        height={48}
                        className="rounded-2xl shadow-sm"
                    />
                    <div className="min-w-0">
                        <div className="truncate text-lg font-bold text-[var(--brand-primary)]">{branding.farmName}</div>
                        <div className="text-xs uppercase tracking-[0.24em] text-[var(--brand-accent)]">Shinba Report</div>
                    </div>
                </div>
            </div>
            <nav className="flex-1 px-4 flex flex-col gap-2 py-4">
                <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">dashboard</span>
                    <span className="hidden lg:block text-sm font-medium">{t('dashboard')}</span>
                </Link>
                <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/horses">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">format_list_bulleted</span>
                    <span className="hidden lg:block text-sm font-medium">{t('horses') || 'Horses'}</span>
                </Link>
                <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/clients">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">group</span>
                    <span className="hidden lg:block text-sm font-medium">{t('clients') || 'Clients'}</span>
                </Link>
                {capabilities.canUseWeightBulkInput ? (
                    <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/weights">
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">monitoring</span>
                        <span className="hidden lg:block text-sm font-medium">{t('weights')}</span>
                    </Link>
                ) : null}
                {capabilities.canUseTrainerManagement ? (
                    <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/trainers">
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">badge</span>
                        <span className="hidden lg:block text-sm font-medium">{t('trainers')}</span>
                    </Link>
                ) : null}
                {capabilities.canUseVetRecords ? (
                    <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/care-records">
                        <span className="material-symbols-outlined group-hover:fill-1 transition-all">medical_services</span>
                        <span className="hidden lg:block text-sm font-medium">{t('careRecords')}</span>
                    </Link>
                ) : null}
                <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/settings">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">settings</span>
                    <span className="hidden lg:block text-sm font-medium">{t('settings') || 'Settings'}</span>
                </Link>
                <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/billing">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">credit_card</span>
                    <span className="hidden lg:block text-sm font-medium">{t('billing')}</span>
                </Link>
                <Link className="dashboard-nav-link group flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-white transition-colors shadow-sm ring-1 ring-transparent hover:ring-stone-200" href="/dashboard/help">
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">school</span>
                    <span className="hidden lg:block text-sm font-medium">{t('help')}</span>
                </Link>
            </nav>
            <div className="p-2 lg:p-4 mt-auto border-t border-stone-200 flex flex-col gap-4 justify-center lg:block">
                <button
                    onClick={() => signOut()}
                    className="group mb-2 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-stone-600 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                    <span className="material-symbols-outlined group-hover:fill-1 transition-all">logout</span>
                    <span className="hidden lg:block text-sm font-medium">{t('signOut')}</span>
                </button>
                <LanguageToggle />
            </div>
        </aside >
    );
}
