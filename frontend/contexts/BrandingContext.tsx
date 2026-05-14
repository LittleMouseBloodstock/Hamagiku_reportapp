'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { usePathname } from 'next/navigation';
import { resolveReportAssetUrl } from '@/lib/storage';

export type LogoConcept = 'monogram' | 'nature';

export type BrandingSettings = {
    farmName: string;
    primaryColor: string;
    accentColor: string;
    locale: 'ja' | 'en';
    logoConcept: LogoConcept;
    themePreset: 'forest' | 'ink' | 'sand' | 'cedar' | 'harbor' | 'midnight' | 'alpine' | 'oxford' | 'terracotta' | 'olive';
    logoUrl: string | null;
};

type BrandingContextType = {
    branding: BrandingSettings;
    resolvedLogoUrl: string | null;
    updateBranding: (updates: Partial<BrandingSettings>) => void;
    saveBranding: () => Promise<{ ok: boolean; error?: string }>;
};

const defaultBranding: BrandingSettings = {
    farmName: 'Shinba Report',
    primaryColor: '#0f766e',
    accentColor: '#d4a84f',
    locale: 'ja',
    logoConcept: 'monogram',
    themePreset: 'forest',
    logoUrl: null,
};

export const themePresets = {
    forest: { primaryColor: '#173d31', accentColor: '#d4a84f', logoConcept: 'monogram' as LogoConcept },
    ink: { primaryColor: '#1f3348', accentColor: '#caa45b', logoConcept: 'monogram' as LogoConcept },
    sand: { primaryColor: '#6f5a3d', accentColor: '#b88a44', logoConcept: 'nature' as LogoConcept },
    cedar: { primaryColor: '#5a2f2f', accentColor: '#d3b17a', logoConcept: 'monogram' as LogoConcept },
    harbor: { primaryColor: '#1f5a5c', accentColor: '#c9d6d0', logoConcept: 'nature' as LogoConcept },
    midnight: { primaryColor: '#1f2430', accentColor: '#d5a65a', logoConcept: 'monogram' as LogoConcept },
    alpine: { primaryColor: '#2f6a4f', accentColor: '#d8d0b2', logoConcept: 'nature' as LogoConcept },
    oxford: { primaryColor: '#2d3e63', accentColor: '#bcc9e6', logoConcept: 'monogram' as LogoConcept },
    terracotta: { primaryColor: '#8a4a32', accentColor: '#e0b06c', logoConcept: 'nature' as LogoConcept },
    olive: { primaryColor: '#4f5a2a', accentColor: '#d8c986', logoConcept: 'nature' as LogoConcept },
};

function adjustHexColor(hex: string, amount: number) {
    const normalized = hex.replace('#', '');
    const safeHex = normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized.padEnd(6, '0').slice(0, 6);

    const num = parseInt(safeHex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));

    return `#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function normalizeHex(hex: string) {
    const normalized = hex.replace('#', '');
    return normalized.length === 3
        ? normalized.split('').map((char) => char + char).join('')
        : normalized.padEnd(6, '0').slice(0, 6);
}

function getContrastText(hex: string) {
    const safeHex = normalizeHex(hex);
    const num = parseInt(safeHex, 16);
    const r = num >> 16;
    const g = (num >> 8) & 0x00ff;
    const b = num & 0x0000ff;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.72 ? '#102018' : '#ffffff';
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

function getCachedBranding(userId?: string) {
    if (typeof window === 'undefined') {
        return defaultBranding;
    }

    const cacheKey = `shinba-branding:${userId ?? 'public'}`;
    const cached = window.localStorage.getItem(cacheKey);
    if (!cached) {
        return defaultBranding;
    }

    try {
        const parsed = JSON.parse(cached) as BrandingSettings;
        return { ...defaultBranding, ...parsed };
    } catch {
        window.localStorage.removeItem(cacheKey);
        return defaultBranding;
    }
}

export function BrandingProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const { setLanguage } = useLanguage();
    const pathname = usePathname();
    const [branding, setBranding] = useState<BrandingSettings>(() => getCachedBranding());
    const [resolvedLogoUrl, setResolvedLogoUrl] = useState<string | null>(null);
    const isDashboardRoute = pathname?.startsWith('/dashboard');

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setBranding(getCachedBranding(user?.id));
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [user?.id]);

    useEffect(() => {
        document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);
        document.documentElement.style.setProperty('--brand-primary-dark', adjustHexColor(branding.primaryColor, -24));
        document.documentElement.style.setProperty('--brand-accent', branding.accentColor);
        document.documentElement.style.setProperty('--brand-on-primary', getContrastText(branding.primaryColor));
        document.documentElement.style.setProperty('--brand-on-accent', getContrastText(branding.accentColor));
    }, [branding.accentColor, branding.primaryColor]);

    useEffect(() => {
        let cancelled = false;

        const loadResolvedLogo = async () => {
            if (!branding.logoUrl) {
                setResolvedLogoUrl(null);
                return;
            }

            const url = await resolveReportAssetUrl(branding.logoUrl, 60 * 60 * 24 * 7);
            if (!cancelled) {
                setResolvedLogoUrl(url);
            }
        };

        loadResolvedLogo();
        return () => {
            cancelled = true;
        };
    }, [branding.logoUrl]);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        const loadProfile = async () => {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('farm_name, primary_color, accent_color, locale, logo_concept, logo_url')
                .eq('user_id', user.id)
                .maybeSingle();

            if (cancelled || error || !data) return;

            const savedLanguage = window.localStorage.getItem('shinba-language');
            if (isDashboardRoute && savedLanguage !== 'ja' && savedLanguage !== 'en') {
                setLanguage(data.locale === 'en' ? 'en' : 'ja');
            }

            setBranding((prev) => ({
                ...prev,
                farmName: data.farm_name || prev.farmName,
                primaryColor: data.primary_color || prev.primaryColor,
                accentColor: data.accent_color || prev.accentColor,
                locale: data.locale === 'en' ? 'en' : 'ja',
                logoConcept: data.logo_concept === 'nature' ? 'nature' : 'monogram',
                logoUrl: data.logo_url || null,
                themePreset: prev.themePreset,
            }));
        };

        loadProfile();

        return () => {
            cancelled = true;
        };
    }, [isDashboardRoute, setLanguage, user]);

    const updateBranding = useCallback((updates: Partial<BrandingSettings>) => {
        setBranding((prev) => {
            const next = { ...prev, ...updates };
            const cacheKey = `shinba-branding:${user?.id ?? 'public'}`;
            window.localStorage.setItem(cacheKey, JSON.stringify(next));
            return next;
        });
    }, [user?.id]);

    const saveBranding = useCallback(async () => {
        if (!user) return { ok: false, error: 'No user signed in.' };

        const { error } = await supabase.from('user_profiles').upsert({
            user_id: user.id,
            farm_name: branding.farmName,
            primary_color: branding.primaryColor,
            accent_color: branding.accentColor,
            locale: branding.locale,
            logo_concept: branding.logoConcept,
            logo_url: branding.logoUrl,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            return { ok: false, error: error.message };
        }

        return { ok: true };
    }, [branding, user]);

    const value = useMemo(
        () => ({ branding, resolvedLogoUrl, updateBranding, saveBranding }),
        [branding, resolvedLogoUrl, saveBranding, updateBranding],
    );

    return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
    const context = useContext(BrandingContext);
    if (!context) {
        throw new Error('useBranding must be used within BrandingProvider');
    }
    return context;
}
