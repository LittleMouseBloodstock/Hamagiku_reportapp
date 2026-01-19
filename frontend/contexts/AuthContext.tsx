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

        // Listen for changes (initial session is also handled here)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            const currentUser = session?.user;

            // 1. Update state IMMEDIATELY to prevent white screen / blocking
            setSession(session);
            setUser(currentUser ?? null);
            setIsLoading(false);

            if (_event === 'SIGNED_OUT') {
                router.replace('/login');
                return;
            }

            // 2. Perform Whitelist Check asynchronously (don't block UI)
            // Only perform check if we have a user and we are strictly logging in or refreshing
            if (currentUser?.email) {
                // Determine if we need to check (maybe skip if already checked? simpler to just check)
                try {
                    const { count, error } = await supabase
                        .from('allowed_users')
                        .select('*', { count: 'exact', head: true })
                        .eq('email', currentUser.email);

                    // Only deny if we are SURE they are not allowed
                    if (!error && count === 0) {
                        console.warn('Access denied for:', currentUser.email);
                        await supabase.auth.signOut();
                        alert('Access Denied: Your email is not permitted to access this application.');
                        router.replace('/login');
                    }
                    if (error) {
                        console.warn('Whitelist check failed (non-blocking):', error.message);
                    }
                } catch (err) {
                    console.error('Whitelist check exception:', err);
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [router]);

    // 3. Route Protection Logic
    useEffect(() => {
        if (isLoading) return;

        const isLoginPage = pathname === '/login';
        // Define public paths if needed, e.g. landing page. 
        // For this app, everything else is protected.

        if (!session && !isLoginPage) {
            // No user, not on login -> Redirect to login
            router.replace('/login');
        } else if (session && isLoginPage) {
            // User exists, but on login -> Redirect to dashboard
            router.replace('/dashboard');
        }
    }, [session, isLoading, pathname, router]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
