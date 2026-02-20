'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

const navItems = [
    { href: '/dashboard', icon: 'dashboard', labelKey: 'dashboard' },
    { href: '/dashboard/horses', icon: 'format_list_bulleted', labelKey: 'horses' },
    { href: '/dashboard/repro', icon: 'monitor_heart', labelKey: 'reproManagement' },
    { href: '/dashboard/weights', icon: 'monitoring', labelKey: 'weights' }
];

export default function BottomBar() {
    const pathname = usePathname();
    const { t, language } = useLanguage();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#F5F4F0] border-t border-stone-200 px-2 py-2">
            <div className="flex items-center justify-around">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg ${isActive ? 'text-[#1a3c34]' : 'text-stone-500'}`}
                        >
                            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                            {language === 'ja' ? (
                                <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
                            ) : null}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
