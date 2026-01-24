'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function LoginPage() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            console.log('Attempting auth:', isSignUp ? 'Sign Up' : 'Sign In', { email });

            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/dashboard`
                    }
                });
                console.log('Sign Up Result:', { data, error });
                if (error) throw error;
                setMessage({ text: 'Confirmation email sent! Please check your inbox.', type: 'success' });
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });
                console.log('Sign In Result:', { data, error });
                if (error) throw error;
                // Redirect is handled by AuthContext
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Auth Error:', error);
            setMessage({ text: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCF8] flex items-center justify-center font-sans">
            <div className="bg-white p-8 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.05)] border border-stone-200 w-full max-w-md text-center">
                <div className="mb-8 flex flex-col items-center">
                    {/* App Logo Placeholder */}
                    <div className="w-16 h-16 bg-[#1a3c34] rounded-full flex items-center justify-center mb-4 shadow-md">
                        <span className="material-symbols-outlined text-white text-3xl">description</span>
                    </div>
                    <h1 className="text-2xl font-bold text-[#1a3c34] font-display">Demo Farm</h1>
                    <p className="text-stone-500 text-sm mt-1">Report Management System</p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
                        {message && (
                            <div className={`text-xs p-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message.text}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent outline-none"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
                            <input
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full border-gray-300 rounded-lg text-sm px-3 py-2 text-gray-900 focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1a3c34] hover:bg-[#122b25] text-white font-bold py-3 px-4 rounded-lg transition-colors shadow-sm"
                        >
                            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Sign In')}
                        </button>
                    </form>

                    <div className="text-xs text-center text-gray-500">
                        {isSignUp ? "Already have an account? " : "First time? "}
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                            className="text-[#1a3c34] font-bold hover:underline"
                        >
                            {isSignUp ? 'Sign In' : 'Set Password (Sign Up)'}
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-xs text-stone-400">
                    &copy; 2026 Demo Farm. All rights reserved.
                </div>
            </div>
        </div>
    );
}
