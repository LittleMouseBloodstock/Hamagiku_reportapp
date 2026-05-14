'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getPlanCapabilities, normalizePlan, type Plan } from '@/lib/planCapabilities';

type UsePlanAccessResult = {
    loading: boolean;
    hasProductAccess: boolean;
    plan: Plan;
    planStatus: string;
    capabilities: ReturnType<typeof getPlanCapabilities>;
};

export function usePlanAccess(): UsePlanAccessResult {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [plan, setPlan] = useState<Plan>('basic');
    const [planStatus, setPlanStatus] = useState('inactive');
    const [hasProductAccess, setHasProductAccess] = useState(false);

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            if (!user?.id) {
                if (!cancelled) {
                    setPlan('basic');
                    setPlanStatus('inactive');
                    setHasProductAccess(false);
                    setLoading(false);
                }
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('customers')
                    .select('plan_status, subscription_plan')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error) throw error;

                const active = data?.plan_status === 'active' || data?.plan_status === 'trialing';
                const resolvedPlan = active ? normalizePlan(data?.subscription_plan || 'pro') : 'basic';

                if (!cancelled) {
                    setPlan(resolvedPlan);
                    setPlanStatus(data?.plan_status || 'inactive');
                    setHasProductAccess(active);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Failed to load plan access:', error);
                if (!cancelled) {
                    setPlan('basic');
                    setPlanStatus('inactive');
                    setHasProductAccess(false);
                    setLoading(false);
                }
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    return useMemo(() => ({
        loading,
        hasProductAccess,
        plan,
        planStatus,
        capabilities: getPlanCapabilities(plan),
    }), [hasProductAccess, loading, plan, planStatus]);
}
