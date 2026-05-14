'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const CONSENT_VERSION = '2026-03-24';

export default function AnonymizedDataConsentBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadConsent = async () => {
      if (!user) {
        setShowBanner(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('anonymized_data_consent, anonymized_data_version')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load anonymized data consent:', error);
        setLoading(false);
        return;
      }

      const needsDecision =
        !data ||
        data.anonymized_data_consent === null ||
        data.anonymized_data_version !== CONSENT_VERSION;

      setShowBanner(needsDecision);
      setLoading(false);
    };

    loadConsent();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const saveDecision = async (consent: boolean) => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      user_id: user.id,
      anonymized_data_consent: consent,
      anonymized_data_decided_at: new Date().toISOString(),
      anonymized_data_version: CONSENT_VERSION,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('user_profiles').upsert(payload);

    if (error) {
      console.error('Failed to save anonymized data consent:', error);
      setMessage(t('consentSaveError'));
      setSaving(false);
      return;
    }

    setShowBanner(false);
    setSaving(false);
  };

  if (!user || loading || !showBanner) {
    return null;
  }

  return (
    <div className="border-b border-[color-mix(in_srgb,var(--brand-primary)_18%,white)] bg-[color-mix(in_srgb,var(--brand-primary)_8%,white)] px-4 py-4 md:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="max-w-3xl">
          <p className="text-primary text-sm font-semibold">{t('consentTitle')}</p>
          <p className="mt-1 text-sm leading-6 text-stone-700">{t('consentBody')}</p>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            <Link href="/legal/privacy" className="font-medium text-primary hover:text-primary-dark hover:underline">
              {t('legalPrivacy')}
            </Link>
            {' · '}
            {t('consentDeclineNote')}
          </p>
          {message ? <p className="mt-2 text-xs text-red-700">{message}</p> : null}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={saving}
            onClick={() => saveDecision(false)}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-400 disabled:opacity-60"
          >
            {t('consentDecline')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => saveDecision(true)}
            className="bg-primary hover:bg-primary-dark rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
          >
            {saving ? t('saving') : t('consentAccept')}
          </button>
        </div>
      </div>
    </div>
  );
}
