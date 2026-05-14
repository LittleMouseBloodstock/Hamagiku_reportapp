'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlanAccess } from '@/hooks/usePlanAccess';

const navItems = [
    { href: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
    { href: '/dashboard/horses', icon: 'format_list_bulleted', labelKey: 'horses' },
    { href: '/dashboard/clients', icon: 'group', labelKey: 'clients' },
    { href: '/dashboard/billing', icon: 'credit_card', labelKey: 'billing' },
];

export default function BottomBar() {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { capabilities } = usePlanAccess();
    const filteredNavItems = [
        ...navItems.slice(0, 3),
        ...(capabilities.canUseWeightBulkInput ? [{ href: '/dashboard/weights', icon: 'monitoring', labelKey: 'weights' }] : []),
        ...(capabilities.canUseTrainerManagement ? [{ href: '/dashboard/trainers', icon: 'badge', labelKey: 'trainers' }] : []),
        ...(capabilities.canUseVetRecords ? [{ href: '/dashboard/care-records', icon: 'medical_services', labelKey: 'careRecords' }] : []),
        navItems[3],
    ];

    return (
        <nav className="app-panel fixed bottom-0 left-0 right-0 z-40 border-t border-stone-200 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:hidden">
            <div className="flex items-center justify-around gap-1 overflow-x-auto">
                {filteredNavItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`dashboard-nav-link flex min-w-[48px] flex-col items-center gap-1 rounded-lg px-2 py-1 ${isActive ? 'dashboard-nav-link-active' : ''}`}
                        >
                            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                            <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
