'use client';

import { useEffect, useState } from 'react';

const useResumeRefresh = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                setRefreshKey((v) => v + 1);
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                setRefreshKey((v) => v + 1);
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pageshow', handlePageShow);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pageshow', handlePageShow);
        };
    }, []);

    return refreshKey;
};

export default useResumeRefresh;
