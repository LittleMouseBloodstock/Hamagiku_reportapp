'use client';

import { useSearchParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const searchParams = useSearchParams();
    const isPrintView = searchParams?.get('print') === '1';

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
        <div className="flex h-screen w-full bg-background-light text-stone-850 font-sans antialiased overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
