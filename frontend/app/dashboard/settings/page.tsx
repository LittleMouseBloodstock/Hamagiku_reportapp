'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { themePresets, useBranding } from '@/contexts/BrandingContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { uploadReportAsset } from '@/lib/storage';
import { inviteWorkspaceUser } from '@/lib/api';

interface AllowedUser {
    email: string;
    role: string;
    created_at: string;
}

const presetCopy = {
    forest: { title: 'presetForest', desc: 'presetForestDesc' },
    ink: { title: 'presetInk', desc: 'presetInkDesc' },
    sand: { title: 'presetSand', desc: 'presetSandDesc' },
    cedar: { title: 'presetCedar', desc: 'presetCedarDesc' },
    harbor: { title: 'presetHarbor', desc: 'presetHarborDesc' },
    midnight: { title: 'presetMidnight', desc: 'presetMidnightDesc' },
    alpine: { title: 'presetAlpine', desc: 'presetAlpineDesc' },
    oxford: { title: 'presetOxford', desc: 'presetOxfordDesc' },
    terracotta: { title: 'presetTerracotta', desc: 'presetTerracottaDesc' },
    olive: { title: 'presetOlive', desc: 'presetOliveDesc' },
} as const;

export default function SettingsPage() {
    const { user, session } = useAuth();
    const { t } = useLanguage();
    const { branding, resolvedLogoUrl, updateBranding, saveBranding } = useBranding();
    const { workspaceId } = useWorkspace();
    const [users, setUsers] = useState<AllowedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');
    const [adding, setAdding] = useState(false);
    const [savingBranding, setSavingBranding] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [savingConsent, setSavingConsent] = useState(false);
    const [consent, setConsent] = useState<boolean | null>(null);
    const [consentDecidedAt, setConsentDecidedAt] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'error' | 'success' } | null>(null);

    const fetchUsers = useCallback(async () => {
        if (!workspaceId) {
            setUsers([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('allowed_users')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            setUsers(data || []);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error fetching users:', error);
            setMessage({ text: 'Failed to load users: ' + error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserEmail || !workspaceId || !session?.access_token) return;

        setAdding(true);
        setMessage(null);

        try {
            const result = await inviteWorkspaceUser(session.access_token, {
                email: newUserEmail,
                role: newUserRole,
            });

            if (result.inviteSent) {
                setMessage({ text: t('userInviteEmailSent'), type: 'success' });
            } else if (result.alreadyRegistered) {
                setMessage({ text: t('userInviteExistingUser'), type: 'success' });
            } else if (result.inviteErrorMessage) {
                setMessage({ text: `${t('userInviteSaved')} ${result.inviteErrorMessage}`, type: 'success' });
            } else {
                setMessage({ text: t('userInviteSaved'), type: 'success' });
            }

            setNewUserEmail('');
            setNewUserRole('user');
            fetchUsers(); // Refresh list
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setMessage({ text: `${t('userInviteError')}${error.message}`, type: 'error' });
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteUser = async (email: string) => {
        if (!workspaceId) return;
        if (!window.confirm(t('confirmRemoveUser').replace('{email}', email))) {
            return;
        }

        try {
            const { error } = await supabase
                .from('allowed_users')
                .delete()
                .eq('workspace_id', workspaceId)
                .eq('email', email);

            if (error) throw error;

            setMessage({ text: t('userRemoved'), type: 'success' });
            fetchUsers(); // Refresh list
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setMessage({ text: t('errorDeleting') + error.message, type: 'error' });
        }
    };

    const fetchConsent = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('anonymized_data_consent, anonymized_data_decided_at')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) throw error;

            setConsent(data?.anonymized_data_consent ?? null);
            setConsentDecidedAt(data?.anonymized_data_decided_at ?? null);
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.error('Error fetching anonymized data consent:', error);
        }
    }, [user]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    useEffect(() => {
        fetchConsent();
    }, [fetchConsent]);

    const handleSaveBranding = async () => {
        setSavingBranding(true);
        setMessage(null);

        const result = await saveBranding();
        if (result.ok) {
            setMessage({ text: t('brandingSaved'), type: 'success' });
        } else {
            setMessage({ text: `${t('brandingSaveError')} ${result.error || ''}`.trim(), type: 'error' });
        }

        setSavingBranding(false);
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !workspaceId || !user) return;

        setUploadingLogo(true);
        setMessage(null);

        try {
            const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
            const path = `${workspaceId}/branding/${user.id}/logo_${Date.now()}.${extension}`;
            const { path: uploadedPath, error } = await uploadReportAsset(path, file);

            if (error || !uploadedPath) {
                throw error || new Error('Upload failed');
            }

            updateBranding({ logoUrl: uploadedPath });
            setMessage({ text: t('logoSavedHint'), type: 'success' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setMessage({ text: `${t('logoUploadError')} ${error?.message || ''}`.trim(), type: 'error' });
        } finally {
            setUploadingLogo(false);
            event.target.value = '';
        }
    };

    const handleConsentDecision = async (nextConsent: boolean) => {
        if (!user) return;

        setSavingConsent(true);
        setMessage(null);

        const decidedAt = new Date().toISOString();
        const { error } = await supabase.from('user_profiles').upsert({
            user_id: user.id,
            anonymized_data_consent: nextConsent,
            anonymized_data_decided_at: decidedAt,
            anonymized_data_version: '2026-03-24',
            updated_at: decidedAt,
        });

        if (error) {
            setMessage({ text: t('consentSaveError'), type: 'error' });
            setSavingConsent(false);
            return;
        }

        setConsent(nextConsent);
        setConsentDecidedAt(decidedAt);
        setMessage({ text: nextConsent ? t('consentAcceptedMessage') : t('consentDeclinedMessage'), type: 'success' });
        setSavingConsent(false);
    };

    return (
        <div className="h-full overflow-y-auto bg-stone-50 p-6 pb-24 md:p-10">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="dashboard-page-title text-3xl">{t('settingsTitle')}</h1>
                    <p className="text-stone-500 mt-2">{t('settingsDesc')}</p>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                        <h2 className="text-primary text-lg font-bold">{t('brandingTitle')}</h2>
                        <p className="text-sm text-stone-500">{t('brandingDesc')}</p>
                    </div>

                    <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
                        <div className="space-y-5">
                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-700">{t('farmName')}</label>
                                <input
                                    type="text"
                                    value={branding.farmName}
                                    onChange={(e) => updateBranding({ farmName: e.target.value })}
                                    className="w-full max-w-[280px] rounded-lg border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary)]"
                                    placeholder={t('farmNamePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block text-xs font-bold text-gray-700">{t('preferredLanguage')}</label>
                                <select
                                    value={branding.locale}
                                    onChange={(e) => updateBranding({ locale: e.target.value as 'ja' | 'en' })}
                                    className="w-full max-w-[280px] rounded-lg border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary)]"
                                >
                                    <option value="ja">日本語</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="mb-3 block text-xs font-bold text-gray-700">{t('themePreset')}</label>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {Object.entries(themePresets).map(([key, preset]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => updateBranding({
                                            themePreset: key as keyof typeof themePresets,
                                            primaryColor: preset.primaryColor,
                                            accentColor: preset.accentColor,
                                            logoConcept: preset.logoConcept,
                                        })}
                                        className={`rounded-xl border p-4 text-left ${branding.themePreset === key ? 'border-primary bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)]' : 'border-stone-200'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: preset.primaryColor }} />
                                            <span className="inline-block h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: preset.accentColor }} />
                                        </div>
                                        <div className="mt-3 font-semibold text-stone-900">
                                            {t(presetCopy[key as keyof typeof presetCopy].title)}
                                        </div>
                                        <div className="mt-1 text-sm text-stone-500">
                                            {t(presetCopy[key as keyof typeof presetCopy].desc)}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-3">{t('logoConcept')}</label>
                            <div className="grid gap-3 md:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => updateBranding({ logoConcept: 'monogram' })}
                                    className={`rounded-xl border p-4 text-left ${branding.logoConcept === 'monogram' ? 'border-primary bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)]' : 'border-stone-200'}`}
                                >
                                    <div className="font-semibold text-stone-900">{t('conceptMonogram')}</div>
                                    <div className="mt-1 text-sm text-stone-500">{t('monogramDesc')}</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateBranding({ logoConcept: 'nature' })}
                                    className={`rounded-xl border p-4 text-left ${branding.logoConcept === 'nature' ? 'border-primary bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)]' : 'border-stone-200'}`}
                                >
                                    <div className="font-semibold text-stone-900">{t('conceptNature')}</div>
                                    <div className="mt-1 text-sm text-stone-500">{t('natureDesc')}</div>
                                </button>
                            </div>
                        </div>

                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-700 mb-3">{t('customLogo')}</label>
                            <div className="rounded-xl border border-stone-200 p-4">
                                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                                            {resolvedLogoUrl ? (
                                                <Image src={resolvedLogoUrl} alt={branding.farmName} fill className="object-contain p-2" unoptimized />
                                            ) : (
                                                <Image src={branding.logoConcept === 'nature' ? '/shinba-nature.svg' : '/brand-mark.png'} alt={branding.farmName} fill className="object-contain p-2" unoptimized />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-stone-900">{branding.farmName}</div>
                                            <div className="mt-1 text-sm text-stone-500">{t('customLogoDesc')}</div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-3 sm:flex-row">
                                        <label className="btn-primary inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-60">
                                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                                            {uploadingLogo ? t('saving') : t('uploadLogo')}
                                        </label>
                                        {branding.logoUrl ? (
                                            <button
                                                type="button"
                                                onClick={() => updateBranding({ logoUrl: null })}
                                                className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400"
                                            >
                                                {t('removeLogo')}
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end lg:col-span-2">
                            <button
                                type="button"
                                onClick={handleSaveBranding}
                                disabled={savingBranding}
                                className="btn-primary rounded-lg px-5 py-3 text-sm font-semibold transition-colors disabled:opacity-60"
                            >
                                {savingBranding ? t('saving') : t('saveBranding')}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                        <h2 className="text-primary text-lg font-bold">{t('consentSettingsTitle')}</h2>
                        <p className="text-sm text-stone-500">{t('consentSettingsDesc')}</p>
                    </div>

                    <div className="space-y-4 p-6">
                        <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                            <p className="text-sm leading-7 text-stone-700">{t('consentBody')}</p>
                            <p className="mt-3 text-xs text-stone-500">
                                {consent === null
                                    ? t('consentStatusPending')
                                    : consent
                                        ? t('consentStatusAccepted')
                                        : t('consentStatusDeclined')}
                                {consentDecidedAt ? ` · ${new Date(consentDecidedAt).toLocaleString()}` : ''}
                            </p>
                            <p className="mt-2 text-xs text-stone-500">
                                <Link href="/legal/privacy" className="text-primary hover:text-primary-dark hover:underline">
                                    {t('legalPrivacy')}
                                </Link>
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => handleConsentDecision(false)}
                                disabled={savingConsent}
                                className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-medium text-stone-700 transition hover:border-stone-400 disabled:opacity-60"
                            >
                                {savingConsent ? t('saving') : t('consentDecline')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConsentDecision(true)}
                                disabled={savingConsent}
                                className="btn-primary rounded-lg px-5 py-3 text-sm font-semibold transition disabled:opacity-60"
                            >
                                {savingConsent ? t('saving') : t('consentAccept')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* User Management Section */}
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
                        <div>
                            <h2 className="text-primary text-lg font-bold">{t('userManagement')}</h2>
                            <p className="text-sm text-stone-500">{t('userManagementDesc')}</p>
                            <p className="mt-2 text-xs text-stone-500">{t('userInviteHint')}</p>
                        </div>
                    </div>

                    <div className="p-6">
                        {/* Message Alert */}
                        {message && (
                            <div className={`mb-6 p-4 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-green-50 text-green-800'}`}>
                                {message.text}
                            </div>
                        )}

                        {/* Add User Form */}
                        <form onSubmit={handleAddUser} className="grid gap-4 mb-8 md:grid-cols-[minmax(0,1fr)_180px_auto] items-end">
                            <div className="flex-grow w-full">
                                <label className="block text-xs font-bold text-gray-700 mb-1">{t('addNewEmail')}</label>
                                <input
                                    type="email"
                                    required
                                    value={newUserEmail}
                                    onChange={e => setNewUserEmail(e.target.value)}
                                className="w-full rounded-lg border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary)]"
                                    placeholder="new.user@example.com"
                                />
                            </div>
                            <div className="w-full">
                                <label className="block text-xs font-bold text-gray-700 mb-1">{t('userRole')}</label>
                                <select
                                    value={newUserRole}
                                    onChange={e => setNewUserRole(e.target.value as 'user' | 'admin')}
                                    className="w-full rounded-lg border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--brand-primary)]"
                                >
                                    <option value="user">{t('memberRole')}</option>
                                    <option value="admin">{t('adminRole')}</option>
                                </select>
                            </div>
                            <button
                                type="submit"
                                disabled={adding}
                                className="btn-primary h-[42px] w-full whitespace-nowrap rounded-lg px-6 py-2.5 font-bold shadow-sm transition-colors disabled:opacity-70 md:w-auto"
                            >
                                {adding ? t('adding') : t('addUser')}
                            </button>
                        </form>

                        {/* User List */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">{t('allowedUsers')} ({users.length})</h3>

                            {/* Horizontal Scroll Wrapper for Mobile */}
                            <div className="overflow-x-auto pb-2">
                                <div className="min-w-[500px] space-y-2">
                                    {loading ? (
                                        <div className="text-stone-500 text-sm py-4">{t('loadingUsers')}</div>
                                    ) : users.length === 0 ? (
                                        <div className="text-stone-500 text-sm py-4">{t('noUsersFound')}</div>
                                    ) : (
                                        users.map((user) => (
                                            <div key={user.email} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg border border-stone-100 group hover:border-stone-300 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--brand-primary)_10%,white)]">
                                                        <span className="material-symbols-outlined text-sm">person</span>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-stone-700 font-medium">{user.email}</span>
                                                        <span className="text-xs text-stone-500">{t('invitePending')}</span>
                                                    </div>
                                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-stone-200 text-stone-700'}`}>
                                                        {user.role === 'admin' ? t('adminRole') : t('memberRole')}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteUser(user.email)}
                                                    className="text-stone-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors shrink-0"
                                                    title={t('removeAccess')}
                                                >
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
