'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { syncWorkspaceInvite } from '@/lib/api';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    isLoading: true,
    signOut: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();
    const isPublicRoute =
        pathname === '/' ||
        pathname === '/login' ||
        pathname === '/report' ||
        pathname.startsWith('/legal/') ||
        pathname.startsWith('/features/') ||
        pathname.startsWith('/use-cases/') ||
        pathname.startsWith('/compare/');

    const syncAuthCookie = (hasSession: boolean) => {
        if (typeof document === 'undefined') return;

        if (hasSession) {
            document.cookie = 'shinba-auth=1; Path=/; Max-Age=2592000; SameSite=Lax';
            return;
        }

        document.cookie = 'shinba-auth=; Path=/; Max-Age=0; SameSite=Lax';
    };

    const syncWorkspaceInviteIfNeeded = async (nextSession: Session | null) => {
        if (!nextSession?.access_token) return;

        try {
            await syncWorkspaceInvite(nextSession.access_token);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('shinba-workspace-sync'));
            }
        } catch (error) {
            console.error('Failed to sync workspace invite:', error);
        }
    };

    useEffect(() => {
        let mounted = true;

        const loadSession = async () => {
            try {
                const {
                    data: { session: currentSession },
                } = await supabase.auth.getSession();

                await syncWorkspaceInviteIfNeeded(currentSession ?? null);

                if (!mounted) return;

                setSession(currentSession ?? null);
                setUser(currentSession?.user ?? null);
                syncAuthCookie(Boolean(currentSession));
            } catch (error) {
                console.error('Initial session fetch failed:', error);
            } finally {
                if (mounted) setIsLoading(false);
            }
        };

        loadSession();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
            void syncWorkspaceInviteIfNeeded(nextSession ?? null);

            if (!mounted) return;

            setSession(nextSession ?? null);
            setUser(nextSession?.user ?? null);
            setIsLoading(false);
            syncAuthCookie(Boolean(nextSession));

            if (_event === 'SIGNED_OUT') {
                router.replace('/login');
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    useEffect(() => {
        if (isLoading) return;

        const isLoginPage = pathname === '/login';
        const nextPath = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('next')
            : null;

        if (!session && !isPublicRoute) {
            router.replace('/login');
        } else if (session && isLoginPage) {
            router.replace(nextPath || '/dashboard');
        }
    }, [session, isLoading, pathname, router, isPublicRoute]);

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Sign out failed:', error);
        }
        syncAuthCookie(false);
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {isLoading && !isPublicRoute ? (
                <div className="flex items-center justify-center min-h-screen bg-[#FDFCF8]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#1a3c34]/20 border-t-[#1a3c34] rounded-full animate-spin"></div>
                        <p className="text-[#1a3c34] font-medium animate-pulse">Loading...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
