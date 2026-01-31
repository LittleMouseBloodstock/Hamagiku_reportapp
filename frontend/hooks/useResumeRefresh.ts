'use client';

import { useEffect, useState } from 'react';

const useResumeRefresh = () => {
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        const triggerRefresh = () => setRefreshKey((v) => v + 1);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                triggerRefresh();
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) {
                triggerRefresh();
            }
        };

        const handleOnline = () => {
            triggerRefresh();
        };

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('online', handleOnline);

        const intervalId = setInterval(triggerRefresh, 60 * 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('online', handleOnline);
            clearInterval(intervalId);
        };
    }, []);

    return refreshKey;
};

export default useResumeRefresh;
