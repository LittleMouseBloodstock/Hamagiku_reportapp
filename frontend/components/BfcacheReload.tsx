'use client';

import { useEffect } from 'react';

export default function BfcacheReload() {
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                // Avoid forced reloads which can wipe in-progress form edits.
                // Data refresh is handled by per-page fetch logic and resume hooks.
                console.warn('bfcache restore detected: skipping hard reload to preserve form state');
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    return null;
}
