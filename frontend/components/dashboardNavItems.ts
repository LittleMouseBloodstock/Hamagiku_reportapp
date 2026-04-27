'use client';

export type DashboardNavItem = {
    href: string;
    icon: string;
    labelKey: string;
    showInBottomBar?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
    { href: '/dashboard', icon: 'dashboard', labelKey: 'dashboard', showInBottomBar: true },
    { href: '/dashboard/horses', icon: 'format_list_bulleted', labelKey: 'horses', showInBottomBar: true },
    { href: '/dashboard/repro', icon: 'monitor_heart', labelKey: 'reproManagement', showInBottomBar: true },
    { href: '/dashboard/clients', icon: 'group', labelKey: 'clients' },
    { href: '/dashboard/trainers', icon: 'badge', labelKey: 'trainers' },
    { href: '/dashboard/weights', icon: 'monitoring', labelKey: 'weights', showInBottomBar: true },
    { href: '/dashboard/care-records', icon: 'medical_services', labelKey: 'careRecords', showInBottomBar: true },
    { href: '/dashboard/settings', icon: 'settings', labelKey: 'settings' }
];
