'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function NewClientPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { workspaceId, isWorkspaceLoading, refreshWorkspace } = useWorkspace();
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        contact_phone: '',
        zip_code: '',
        address_prefecture: '',
        address_city: '',
        address_street: '',
        representative_name: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            if (!workspaceId) throw new Error('No active workspace found.');
            const { error } = await supabase
                .from('clients')
                .insert({
                    workspace_id: workspaceId,
                    name: formData.name,
                    contact_email: formData.contact_email,
                    contact_phone: formData.contact_phone,
                    zip_code: formData.zip_code,
                    address_prefecture: formData.address_prefecture,
                    address_city: formData.address_city,
                    address_street: formData.address_street,
                    representative_name: formData.representative_name,
                    notes: formData.notes
                });

            if (error) throw error;
            router.push('/dashboard/clients');
            router.refresh();
        } catch (error: unknown) {
            alert('Error creating client: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    if (isWorkspaceLoading) {
        return <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center p-6 text-stone-500">{t('loadingWorkspace')}</div>;
    }

    if (!workspaceId) {
        return (
            <div className="h-full overflow-y-auto">
                <div className="max-w-3xl mx-auto p-6 lg:p-12">
                    <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 p-8 space-y-4">
                        <h1 className="dashboard-page-title text-2xl">{t('workspaceSetupRequiredTitle')}</h1>
                        <p className="text-sm leading-7 text-stone-600">{t('workspaceSetupRequiredBody')}</p>
                        <div className="flex flex-wrap gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => void refreshWorkspace()}
                                className="bg-primary hover:bg-primary-dark rounded-lg px-5 py-2.5 font-medium text-white shadow-sm transition-all"
                            >
                                {t('retryWorkspaceLoad')}
                            </button>
                            <Link href="/dashboard" className="px-5 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors">
                                {t('backToHome')}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 lg:p-12">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/dashboard/clients" className="text-stone-500 hover:text-stone-800">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="dashboard-page-title text-2xl">{t('newClient')}</h1>
                </div>

                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <section>
                            <h2 className="text-primary mb-4 flex items-center gap-2 border-b border-stone-100 pb-2 text-lg font-bold">
                                <span className="material-symbols-outlined text-lg">badge</span>
                                {t('clientBasicInfo')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('clientName')}</label>
                                    <input
                                        required
                                        type="text"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('representativeName')}</label>
                                    <input
                                        type="text"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.representative_name}
                                        onChange={e => setFormData({ ...formData, representative_name: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Contact Info */}
                        <section>
                            <h2 className="text-primary mb-4 flex items-center gap-2 border-b border-stone-100 pb-2 text-lg font-bold">
                                <span className="material-symbols-outlined text-lg">contact_mail</span>
                                {t('contactInfo')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('email')}</label>
                                    <input
                                        type="email"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.contact_email}
                                        onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
                                    <input
                                        type="tel"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.contact_phone}
                                        onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Address */}
                        <section>
                            <h2 className="text-primary mb-4 flex items-center gap-2 border-b border-stone-100 pb-2 text-lg font-bold">
                                <span className="material-symbols-outlined text-lg">location_on</span>
                                {t('address')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('zipCode')}</label>
                                    <input
                                        type="text"
                                        className="input-brand w-full px-3 py-2"
                                        placeholder="000-0000"
                                        value={formData.zip_code}
                                        onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('prefecture')}</label>
                                    <input
                                        type="text"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.address_prefecture}
                                        onChange={e => setFormData({ ...formData, address_prefecture: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('city')}</label>
                                    <input
                                        type="text"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.address_city}
                                        onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('street')}</label>
                                    <input
                                        type="text"
                                        className="input-brand w-full px-3 py-2"
                                        value={formData.address_street}
                                        onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Notes */}
                        <section>
                            <h2 className="text-primary mb-4 flex items-center gap-2 border-b border-stone-100 pb-2 text-lg font-bold">
                                <span className="material-symbols-outlined text-lg">description</span>
                                {t('notes')}
                            </h2>
                            <div>
                                <textarea
                                    rows={4}
                                    className="input-brand w-full px-3 py-2"
                                    value={formData.notes}
                                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </section>

                        <div className="pt-6 border-t border-stone-100 flex justify-end gap-3">
                            <Link href="/dashboard/clients" className="px-5 py-2.5 text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors">
                                {t('cancel')}
                            </Link>
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-primary hover:bg-primary-dark flex items-center gap-2 rounded-lg px-5 py-2.5 font-medium text-white shadow-sm transition-all disabled:opacity-50"
                            >
                                {saving ? t('saving') : t('createClient')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
