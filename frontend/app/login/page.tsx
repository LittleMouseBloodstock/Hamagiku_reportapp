'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';

const LOGIN_BUILD_MARKER = 'login-refresh-20260406-1';

export default function LoginPage() {
    const { t } = useLanguage();
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
            const normalizedEmail = email.trim().toLowerCase();
            console.log('Attempting auth:', isSignUp ? 'Sign Up' : 'Sign In', { email: normalizedEmail });

            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({
                    email: normalizedEmail,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/dashboard`
                    }
                });
                console.log('Sign Up Result:', { data, error });
                if (error) throw error;
                setMessage({ text: t('loginConfirmation'), type: 'success' });
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: normalizedEmail,
                    password
                });
                console.log('Sign In Result:', { data, error });
                if (error) throw error;
                // Redirect is handled by AuthContext
            }
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Auth Error:', error);
            const rawMessage = typeof error?.message === 'string' ? error.message : 'Authentication failed.';
            const normalizedMessage = rawMessage.toLowerCase().includes('rate limit')
                ? '登録試行回数が一時的な上限に達しました。少し時間を置いてから再度お試しください。'
                : rawMessage;
            setMessage({ text: normalizedMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#f5efe1_0%,#f8f4eb_40%,#fdfcf8_100%)] px-4 py-10 font-sans">
            <span className="sr-only" data-build={LOGIN_BUILD_MARKER}>login build marker</span>
            <div className="w-full max-w-md rounded-[28px] border border-stone-200 bg-white/95 p-8 text-center shadow-[0_24px_80px_-42px_rgba(0,0,0,0.28)] backdrop-blur">
                <div className="mb-8 flex flex-col items-center">
                    <div className="mb-4 rounded-[22px] border border-[#e4dac6] bg-[#f8f3e8] p-3 shadow-sm">
                        <Image src="/brand-mark.png" alt="Shinba Report" width={72} height={72} className="rounded-2xl" />
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#b38b43]">Shinba Report</p>
                    <h1 className="mt-3 text-2xl font-bold text-[#1a3c34] font-display">{t('loginTitle')}</h1>
                    <p className="mt-2 text-sm leading-6 text-stone-500">{t('loginSubtitle')}</p>
                </div>

                <div className="space-y-4">
                    <form onSubmit={handleEmailAuth} className="space-y-3 text-left">
                        {message && (
                            <div className={`text-xs p-2 rounded ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message.text}
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('loginEmail')}</label>
                            <input
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-[#1a3c34]"
                                placeholder="name@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">{t('loginPassword')}</label>
                            <input
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-transparent focus:ring-2 focus:ring-[#1a3c34]"
                                placeholder="••••••••"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full font-bold py-3 px-4 rounded-lg transition-colors shadow-sm"
                        >
                            {loading ? t('loginProcessing') : (isSignUp ? t('loginSignUp') : t('loginSignIn'))}
                        </button>
                    </form>

                    <div className="text-xs text-center text-gray-500">
                        {isSignUp ? `${t('loginToggleSignIn')} ` : `${t('loginToggleSignUp')} `}
                        <button
                            onClick={() => { setIsSignUp(!isSignUp); setMessage(null); }}
                            className="text-[#1a3c34] font-bold hover:underline"
                        >
                            {isSignUp ? t('loginSignIn') : t('loginSignUp')}
                        </button>
                    </div>
                </div>

                <div className="mt-8 space-y-3 text-xs text-stone-400">
                    <div>&copy; 2026 Shinba Report. All rights reserved.</div>
                    <Link href="/" className="inline-flex items-center justify-center text-[#1a3c34] hover:underline">
                        {t('backToHome')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
