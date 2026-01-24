'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

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

// DEMO VERSION: Always Authenticated
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Simulate immediate login
        const mockUser: any = {
            id: 'demo-user',
            email: 'demo@demofarm.com',
            aud: 'authenticated',
            role: 'authenticated',
        };

        const mockSession: any = {
            access_token: 'demo-token',
            token_type: 'bearer',
            user: mockUser,
        };

        setUser(mockUser);
        setSession(mockSession);
        setIsLoading(false);
    }, []);

    const signOut = async () => {
        // Do nothing in demo
        alert("Sign out is disabled in Demo Mode.");
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
            {isLoading ? (
                <div className="flex items-center justify-center min-h-screen bg-[#FDFCF8]">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-[#1a3c34]/20 border-t-[#1a3c34] rounded-full animate-spin"></div>
                        <p className="text-[#1a3c34] font-medium animate-pulse">Loading Demo...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
