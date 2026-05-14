'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import Image from 'next/image';

type MobileMenuDrawerProps = {
    open: boolean;
    onClose: () => void;
};

export default function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { signOut } = useAuth();
    const { branding, resolvedLogoUrl } = useBranding();
    const { capabilities } = usePlanAccess();
    const navItems = [
        { href: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
        { href: '/dashboard/horses', icon: 'format_list_bulleted', labelKey: 'horses' },
        { href: '/dashboard/clients', icon: 'group', labelKey: 'clients' },
        ...(capabilities.canUseWeightBulkInput ? [{ href: '/dashboard/weights', icon: 'monitoring', labelKey: 'weights' }] : []),
        ...(capabilities.canUseTrainerManagement ? [{ href: '/dashboard/trainers', icon: 'badge', labelKey: 'trainers' }] : []),
        ...(capabilities.canUseVetRecords ? [{ href: '/dashboard/care-records', icon: 'medical_services', labelKey: 'careRecords' }] : []),
        { href: '/dashboard/settings', icon: 'settings', labelKey: 'settings' },
        { href: '/dashboard/help', icon: 'school', labelKey: 'help' },
        { href: '/dashboard/billing', icon: 'credit_card', labelKey: 'billing' },
    ];

    if (!open) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-50">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="Close menu"
            />
            <div className="app-panel relative h-full w-72 max-w-[80%] border-r border-stone-200 p-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Image
                            src={resolvedLogoUrl || (branding.logoConcept === 'nature' ? '/shinba-nature.svg' : '/brand-mark.png')}
                            alt={branding.farmName}
                            width={40}
                            height={40}
                            className="rounded-xl"
                        />
                        <div>
                            <div className="text-sm font-semibold text-[var(--brand-primary)]">{branding.farmName}</div>
                            <div className="text-[11px] uppercase tracking-[0.2em] text-[var(--brand-accent)]">Shinba</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-stone-500 hover:text-stone-800"
                        aria-label="Close menu"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>
                <nav className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`dashboard-nav-link flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-white ${isActive ? 'dashboard-nav-link-active' : ''}`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                <span className="text-sm font-medium">{t(item.labelKey)}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="mt-6 border-t border-stone-200 pt-4">
                    <button
                        onClick={() => {
                            onClose();
                            signOut();
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-stone-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <span className="material-symbols-outlined">logout</span>
                        <span className="text-sm font-medium">{t('signOut')}</span>
                    </button>
                    <div className="mt-4">
                        <LanguageToggle />
                    </div>
                </div>
            </div>
        </div>
    );
}
