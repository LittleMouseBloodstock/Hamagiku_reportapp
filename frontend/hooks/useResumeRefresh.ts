'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const useResumeRefresh = (intervalMs: number = 60_000) => {
    const [refreshKey, setRefreshKey] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshKey((v) => v + 1);
    }, []);

    useEffect(() => {
        const safeRefreshSession = async () => {
            try {
                await supabase.auth.refreshSession();
            } catch (err) {
                console.warn('Resume refresh: session refresh failed', err);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void safeRefreshSession();
                triggerRefresh();
            }
        };

        const handlePageShow = (event: PageTransitionEvent) => {
            void safeRefreshSession();
            if (event.persisted) {
                triggerRefresh();
            } else {
                triggerRefresh();
            }
        };

        const handleOnline = () => {
            void safeRefreshSession();
            triggerRefresh();
        };
        const handleFocus = () => {
            void safeRefreshSession();
            triggerRefresh();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('online', handleOnline);
        window.addEventListener('focus', handleFocus);

        const id = window.setInterval(() => {
            void safeRefreshSession();
            triggerRefresh();
        }, intervalMs);

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
