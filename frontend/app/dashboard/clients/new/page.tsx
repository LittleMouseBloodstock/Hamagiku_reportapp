'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { buildRestHeaders, restPost } from '@/lib/restClient';

export default function NewClientPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const { session } = useAuth();
    const [saving, setSaving] = useState(false);

    const getRestHeaders = () => {
        if (!session?.access_token) {
            throw new Error('Missing access token for REST');
        }
        return buildRestHeaders({ bearerToken: session.access_token, prefer: 'return=representation' });
    };

    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        contact_phone: '',
        zip_code: '',
        address_prefecture: '',
        address_city: '',
        address_street: '',
        representative_name: '',
        notes: '',
        report_output_mode: 'pdf'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            await restPost('clients', {
                name: formData.name,
                contact_email: formData.contact_email,
                contact_phone: formData.contact_phone,
                zip_code: formData.zip_code,
                address_prefecture: formData.address_prefecture,
                address_city: formData.address_city,
                address_street: formData.address_street,
                representative_name: formData.representative_name,
                notes: formData.notes,
                report_output_mode: formData.report_output_mode
            }, getRestHeaders());
            router.push('/dashboard/clients');
            router.refresh();
        } catch (error: unknown) {
            alert('Error creating client: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto">
            <div className="max-w-3xl mx-auto p-6 lg:p-12">
                <div className="mb-8 flex items-center gap-4">
                    <Link href="/dashboard/clients" className="text-stone-500 hover:text-stone-800">
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-stone-800">{t('newClient')}</h1>
                </div>

                <div className="bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-stone-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info */}
                        <section>
                            <h2 className="text-lg font-bold text-[#1a3c34] mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">badge</span>
                                {t('clientBasicInfo')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('clientName')}</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('representativeName')}</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.representative_name}
                                        onChange={e => setFormData({ ...formData, representative_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('reportOutputMode')}</label>
                                    <select
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.report_output_mode}
                                        onChange={e => setFormData({ ...formData, report_output_mode: e.target.value })}
                                    >
                                        <option value="pdf">{t('reportOutputPdf')}</option>
                                        <option value="print">{t('reportOutputPrint')}</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Contact Info */}
                        <section>
                            <h2 className="text-lg font-bold text-[#1a3c34] mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">contact_mail</span>
                                {t('contactInfo')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('email')}</label>
                                    <input
                                        type="email"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.contact_email}
                                        onChange={e => setFormData({ ...formData, contact_email: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('phone')}</label>
                                    <input
                                        type="tel"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.contact_phone}
                                        onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Address */}
                        <section>
                            <h2 className="text-lg font-bold text-[#1a3c34] mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">location_on</span>
                                {t('address')}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('zipCode')}</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        placeholder="000-0000"
                                        value={formData.zip_code}
                                        onChange={e => setFormData({ ...formData, zip_code: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('prefecture')}</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.address_prefecture}
                                        onChange={e => setFormData({ ...formData, address_prefecture: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-1">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('city')}</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.address_city}
                                        onChange={e => setFormData({ ...formData, address_city: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-3">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">{t('street')}</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
                                        value={formData.address_street}
                                        onChange={e => setFormData({ ...formData, address_street: e.target.value })}
                                    />
                                </div>
                            </div>
                        </section>

                        {/* Notes */}
                        <section>
                            <h2 className="text-lg font-bold text-[#1a3c34] mb-4 pb-2 border-b border-stone-100 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">description</span>
                                {t('notes')}
                            </h2>
                            <div>
                                <textarea
                                    rows={4}
                                    className="w-full rounded-lg border-stone-300 shadow-sm focus:border-[#1a3c34] focus:ring focus:ring-[#1a3c34]/20"
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
                                className="px-5 py-2.5 bg-[#1a3c34] text-white rounded-lg font-medium hover:bg-[#122b25] shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
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
