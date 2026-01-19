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

        const initAuth = async () => {
            try {
                // Determine session via onAuthStateChange which fires INITIAL_SESSION
                // We rely on this for the main logic.
                // However, getSession is sometimes faster or preferred for checking init state without waiting for event.

                // We'll use getSession just to seed, but handle errors silently
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;

                if (mounted) {
                    setSession(session);
                    setUser(session?.user ?? null);
                    // Don't set isLoading(false) here, wait for subscription or use separate logic if needed.
                    // Actually, if we have session here, we are good?
                    // No, onAuthStateChange will fire and might have newer info or handle the whitelist check.
                }
            } catch (error) {
                // Ignore AbortError and generic errors during init, let onAuthStateChange handle it
                if (mounted) console.warn('Init session warning:', error);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            const currentUser = session?.user;

            // --- WHITELIST CHECK WITH DB ---
            // Only perform check if we have a user and we are strictly logging in (or session refreshed)
            // To avoid excessive DB calls, maybe we can optimize, but for now this is fine.
            if (currentUser?.email) {
                try {
                    const { count, error } = await supabase
                        .from('allowed_users')
                        .select('*', { count: 'exact', head: true })
                        .eq('email', currentUser.email);

                    if (!error && count === 0) {
                        console.warn('Access denied for:', currentUser.email);
                        await supabase.auth.signOut();
                        alert('Access Denied: Your email is not permitted to access this application.');
                        router.replace('/login');
                        return;
                    }
                } catch (err) {
                    console.error('Whitelist check error:', err);
                }
            }
            // -----------------------

            setSession(session);
            setUser(currentUser ?? null);
            setIsLoading(false);

            if (_event === 'SIGNED_OUT') {
                router.replace('/login');
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
