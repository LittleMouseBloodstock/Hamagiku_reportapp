'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';

type MobileMenuDrawerProps = {
    open: boolean;
    onClose: () => void;
};

const navItems = [
    { href: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
    { href: '/dashboard/horses', icon: 'format_list_bulleted', labelKey: 'horses' },
    { href: '/dashboard/repro', icon: 'monitor_heart', labelKey: 'reproManagement' },
    { href: '/dashboard/clients', icon: 'group', labelKey: 'clients' },
    { href: '/dashboard/trainers', icon: 'badge', labelKey: 'trainers' },
    { href: '/dashboard/weights', icon: 'monitoring', labelKey: 'weights' },
    { href: '/dashboard/settings', icon: 'settings', labelKey: 'settings' }
];

export default function MobileMenuDrawer({ open, onClose }: MobileMenuDrawerProps) {
    const pathname = usePathname();
    const { t } = useLanguage();
    const { signOut } = useAuth();

    if (!open) return null;

    return (
        <div className="lg:hidden fixed inset-0 z-50">
            <button
                type="button"
                className="absolute inset-0 bg-black/40"
                onClick={onClose}
                aria-label="Close menu"
            />
            <div className="relative h-full w-72 max-w-[80%] bg-[#F5F4F0] border-r border-stone-200 shadow-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-stone-700">{t('dashboard')}</div>
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
                                className={`flex items-center gap-3 px-3 py-3 rounded-lg ${isActive ? 'bg-white text-[#1a3c34]' : 'text-stone-600 hover:bg-white'}`}
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
                        <span className="text-sm font-medium">Original Sign Out</span>
                    </button>
                    <div className="mt-4">
                        <LanguageToggle />
                    </div>
                </div>
            </div>
        </div>
    );
}
