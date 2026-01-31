'use client';

import { useEffect } from 'react';

export default function BfcacheReload() {
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                window.location.reload();
            }
        };
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                window.location.reload();
            }
        };
        window.addEventListener('pageshow', handlePageShow);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            window.removeEventListener('pageshow', handlePageShow);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return null;
}
