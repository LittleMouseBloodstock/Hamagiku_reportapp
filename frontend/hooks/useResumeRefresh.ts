'use client';

import { useCallback, useEffect, useState } from 'react';

const useResumeRefresh = (intervalMs: number = 60_000) => {
    const [refreshKey, setRefreshKey] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshKey((v) => v + 1);
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                triggerRefresh();
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                triggerRefresh();
            } else {
                triggerRefresh();
            }
        };

        const handleOnline = () => {
            triggerRefresh();
        };
        const handleFocus = () => {
            triggerRefresh();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);

        const id = window.setInterval(triggerRefresh, intervalMs);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('focus', handleFocus);
            window.clearInterval(id);
        };
    }, [triggerRefresh, intervalMs]);

    return refreshKey;
};

export default useResumeRefresh;
