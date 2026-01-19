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
        // 1. Check active session
        const initSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setSession(session);
                setUser(session?.user ?? null);
            } catch (error) {
                console.error('Session check failed', error);
            } finally {
                setIsLoading(false);
            }
        };

        initSession();

        // 2. Listen for changes
        // 2. Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user;

            // --- WHITELIST CHECK WITH DB ---
            if (currentUser?.email) {
                try {
                    // Check if email exists in 'allowed_users' table
                    // We use count because we just need existence check
                    const { count, error } = await supabase
                        .from('allowed_users')
                        .select('*', { count: 'exact', head: true })
                        .eq('email', currentUser.email);

                    if (error) {
                        console.error('Whitelist check error:', error);
                        // Fallback: If DB check fails, don't let them in easily.
                    }

                    // If count is 0, user is not in whitelist
                    if (count === 0) {
                        console.warn('Access denied for:', currentUser.email);
                        await supabase.auth.signOut();
                        alert('Access Denied: Your email is not permitted to access this application.');
                        router.replace('/login');
                        return;
                    }

                } catch (err) {
                    console.error('Unexpected error during whitelist check:', err);
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

        return () => subscription.unsubscribe();
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
