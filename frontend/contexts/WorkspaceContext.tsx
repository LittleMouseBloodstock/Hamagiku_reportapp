'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Workspace = {
    id: string;
    name: string;
    slug?: string | null;
    role?: string;
};

type WorkspaceContextType = {
    workspace: Workspace | null;
    workspaceId: string | null;
    isWorkspaceLoading: boolean;
    refreshWorkspace: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(true);

    const refreshWorkspace = useCallback(async () => {
        if (!user) {
            setWorkspace(null);
            setIsWorkspaceLoading(false);
            return;
        }

        setIsWorkspaceLoading(true);

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('workspace_id')
            .eq('user_id', user.id)
            .maybeSingle();

        let workspaceId = profile?.workspace_id ?? null;
        let role: string | undefined;

        if (!workspaceId) {
            const { data: membership } = await supabase
                .from('workspace_memberships')
                .select('workspace_id, role')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true })
                .limit(1)
                .maybeSingle();

            workspaceId = membership?.workspace_id ?? null;
            role = membership?.role;
        }

        if (!workspaceId) {
            setWorkspace(null);
            setIsWorkspaceLoading(false);
            return;
        }

        const { data: workspaceData } = await supabase
            .from('workspaces')
            .select('id, name, slug')
            .eq('id', workspaceId)
            .maybeSingle();

        setWorkspace(
            workspaceData
                ? { ...workspaceData, role }
                : { id: workspaceId, name: 'Workspace', slug: null, role },
        );
        setIsWorkspaceLoading(false);
    }, [user]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void refreshWorkspace();
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [refreshWorkspace]);

    useEffect(() => {
        const handleSync = () => {
            void refreshWorkspace();
        };

        window.addEventListener('shinba-workspace-sync', handleSync);
        return () => {
            window.removeEventListener('shinba-workspace-sync', handleSync);
        };
    }, [refreshWorkspace]);

    const value = useMemo(
        () => ({
            workspace,
            workspaceId: workspace?.id ?? null,
            isWorkspaceLoading,
            refreshWorkspace,
        }),
        [workspace, isWorkspaceLoading, refreshWorkspace],
    );

    return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within WorkspaceProvider');
    }
    return context;
}
