'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function DemoInit() {
    const searchParams = useSearchParams();

    useEffect(() => {
        if (searchParams.get('demo') === 'true') {
            if (!sessionStorage.getItem('DEMO_MODE')) {
                sessionStorage.setItem('DEMO_MODE', 'true');
                // Force reload to apply mock client
                window.location.reload();
            }
        }
    }, [searchParams]);

    return null;
}
