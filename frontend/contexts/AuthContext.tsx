'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
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

    useEffect(() => {
        let mounted = true;
        let activeAuthEmail: string | null = null;
        let whitelistCheckTimeoutId: ReturnType<typeof setTimeout> | null = null;

        // 1. Setup failsafe timeout (in case auth event never fires due to locks/errors)
        const timeoutId = setTimeout(() => {
            if (mounted) {
                console.warn('Auth check timed out, forcing UI to load');
                setIsLoading(false);
            }
        }, 8000);

        // 1.5 Try to read current session immediately (avoids relying solely on auth events)
        (async () => {
            try {
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!mounted) return;
                setSession(currentSession ?? null);
                setUser(currentSession?.user ?? null);
                setIsLoading(false);
            } catch (err) {
                console.error('Initial session fetch failed:', err);
            }
        })();

        const verifyAllowedUser = async (email: string) => {
            try {
                const { count, error } = await supabase
                    .from('allowed_users')
                    .select('*', { count: 'exact', head: true })
                    .eq('email', email);

                if (!mounted || activeAuthEmail !== email) return;
                if (error) {
                    console.error('Whitelist check failed:', error);
                    return;
                }
                if (count === 0) {
                    console.warn('Access denied for:', email);
                    await supabase.auth.signOut();
                    alert('Access Denied: Your email is not permitted to access this application.');
                    router.replace('/login');
                }
            } catch (err) {
                console.error('Whitelist check exception:', err);
            }
        };

        const scheduleWhitelistCheck = (email: string) => {
            if (whitelistCheckTimeoutId) clearTimeout(whitelistCheckTimeoutId);
            whitelistCheckTimeoutId = setTimeout(() => {
                whitelistCheckTimeoutId = null;
                void verifyAllowedUser(email);
            }, 0);
        };

        // 2. Listen for auth changes
        // This usually fires immediately with 'INITIAL_SESSION'
        // Keep this callback synchronous. Awaiting another Supabase call here can
        // lock the auth client and prevent later getSession() calls from returning.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (!mounted) return;

            // Clear timeout since we got a response
            clearTimeout(timeoutId);

            const currentUser = session?.user;
            activeAuthEmail = currentUser?.email ?? null;

            // Update state
            setSession(session);
            setUser(currentUser ?? null);
            setIsLoading(false);

            if (_event === 'SIGNED_OUT') {
                router.replace('/login');
                return;
            }

            // Run the whitelist query only after the auth callback has returned.
            if (currentUser?.email) {
                scheduleWhitelistCheck(currentUser.email);
            }
        });

        return () => {
            mounted = false;
            clearTimeout(timeoutId);
            if (whitelistCheckTimeoutId) clearTimeout(whitelistCheckTimeoutId);
            subscription.unsubscribe();
        };
    }, [router]);

    // 3. Route Protection Logic
    useEffect(() => {
        if (isLoading) return;

        const isLoginPage = pathname === '/login';
        const isDebugPage = pathname === '/debug-connection';
        // Define public paths if needed, e.g. landing page. 
        // For this app, everything else is protected.

        if (!session && !isLoginPage && !isDebugPage) {
            // No user, not on login -> Redirect to login
            router.replace('/login');
        } else if (session && isLoginPage) {
            // User exists, but on login -> Redirect to dashboard
            router.replace('/dashboard');
        }
    }, [session, isLoading, pathname, router]);

    // 4. Keep session fresh without forcing logout on transient refresh failures.
    useEffect(() => {
        if (isLoading) return;

        const refreshSession = async () => {
            try {
                const { data, error } = await supabase.auth.refreshSession();
                if (error) {
                    console.warn('Session refresh failed:', error.message);
                }
                if (data?.session) {
                    setSession(data.session);
                    setUser(data.session.user ?? null);
                }
            } catch (err) {
                console.warn('Session refresh exception:', err);
            }
        };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                refreshSession();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        const intervalId = setInterval(() => {
            refreshSession();
        }, 10 * 60 * 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            clearInterval(intervalId);
        };
    }, [isLoading]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {isLoading ? (
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
