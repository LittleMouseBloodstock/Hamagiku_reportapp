'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

type CustomerRecord = {
    plan_status: string;
    subscription_plan: string;
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
    cancel_at_period_end: boolean;
    canceled_at: string | null;
    stripe_customer_id: string | null;
};

const PLAN_ORDER = ['basic', 'pro', 'premium'] as const;
type PlanId = (typeof PLAN_ORDER)[number];

function formatBillingDate(value: string, language: 'ja' | 'en') {
    return new Date(value).toLocaleDateString(language === 'ja' ? 'ja-JP' : 'en-US');
}

export default function BillingPage() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const searchParams = useSearchParams();
    const [customer, setCustomer] = useState<CustomerRecord | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanId>('basic');

    useEffect(() => {
        if (
            (customer?.plan_status === 'active' || customer?.plan_status === 'trialing') &&
            (customer?.subscription_plan === 'basic' || customer?.subscription_plan === 'pro' || customer?.subscription_plan === 'premium')
        ) {
            const currentPlan = customer.subscription_plan as PlanId;
            const nextSelectable = PLAN_ORDER.find((plan) => plan !== currentPlan) || currentPlan;
            setSelectedPlan(nextSelectable);
        }
    }, [customer?.plan_status, customer?.subscription_plan]);

    useEffect(() => {
        let mounted = true;

        const loadCustomer = async () => {
            if (!user) return;

            let { data, error } = await supabase
                .from('customers')
                .select('plan_status, subscription_plan, trial_ends_at, current_period_ends_at, cancel_at_period_end, canceled_at, stripe_customer_id')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error && (error.code === 'PGRST204' || error.code === '42703' || /cancel_at_period_end|canceled_at/i.test(error.message || ''))) {
                const legacyResult = await supabase
                    .from('customers')
                    .select('plan_status, subscription_plan, trial_ends_at, current_period_ends_at, stripe_customer_id')
                    .eq('user_id', user.id)
                    .maybeSingle();

                data = legacyResult.data
                    ? {
                        ...legacyResult.data,
                        cancel_at_period_end: false,
                        canceled_at: null,
                    }
                    : null;
                error = legacyResult.error;
            }

            if (!mounted) return;

            if (error) {
                console.error('Failed to load billing status:', error);
                setMessage(t('billingLoadError'));
            } else {
                setCustomer(data ?? null);
            }

            if (searchParams.get('checkout') === 'success') {
                setMessage(t('billingCheckoutSuccess'));
            } else if (searchParams.get('checkout') === 'cancelled') {
                setMessage(t('billingCheckoutCancelled'));
            }

            setIsLoading(false);
        };

        loadCustomer();

        return () => {
            mounted = false;
        };
    }, [searchParams, t, user]);

    const handleUpgrade = async () => {
        if (!user?.email) {
            setMessage(t('billingNeedEmail'));
            return;
        }

        setIsSubmitting(true);
        setMessage(null);

        try {
            if (isSubscribed) {
                const res = await fetch(`${API_URL}/api/stripe/change-subscription-plan`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        subscriptionPlan: selectedPlan,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to change subscription plan');

                setCustomer((prev) => prev ? {
                    ...prev,
                    subscription_plan: selectedPlan,
                    plan_status: data.stripeStatus || prev.plan_status,
                } : prev);
                setMessage(t('billingPlanChanged'));
                setIsSubmitting(false);
                return;
            }

            const res = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email,
                    subscriptionPlan: selectedPlan,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create checkout session');

            window.location.href = data.url;
        } catch (error) {
            console.error('Checkout start failed:', error);
            setMessage((error as Error).message);
            setIsSubmitting(false);
        }
    };

    const handlePortal = () => {
        if (!user) return;
        window.location.href = `${API_URL}/api/stripe/portal?userId=${encodeURIComponent(user.id)}`;
    };

    const planStatus = customer?.plan_status || 'inactive';
    const isSubscribed = planStatus === 'active' || planStatus === 'trialing';
    const isProductLocked = !isSubscribed;
    const activeSubscriptionPlan = isSubscribed && (customer?.subscription_plan === 'basic' || customer?.subscription_plan === 'pro' || customer?.subscription_plan === 'premium')
        ? customer.subscription_plan as PlanId
        : null;
    const displayedPlan = activeSubscriptionPlan || selectedPlan;
    const cancelScheduled = Boolean(customer?.cancel_at_period_end);
    const canCheckoutSelectedPlan = !isSubscribed || selectedPlan !== activeSubscriptionPlan;
    const billingPlans = PLAN_ORDER.map((plan) => ({
        id: plan,
        name: t(`billingPlan_${plan}`),
        price: t(`billingPrice_${plan}`),
        note: t(`billingNote_${plan}`),
        features: [
            t(`billingFeature_${plan}_1`),
            t(`billingFeature_${plan}_2`),
            t(`billingFeature_${plan}_3`),
            ...(plan === 'basic' ? [] : [t(`billingFeature_${plan}_4`)]),
        ],
    }));

    return (
        <div className="app-shell flex-1 overflow-y-auto p-4 pb-24 sm:p-6 lg:pb-6">
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <h1 className="dashboard-page-title text-2xl">{t('billingTitle')}</h1>
                    <p className="mt-2 text-sm text-stone-500">
                        {t('billingSubtitle')}
                    </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {billingPlans.map((plan) => {
                        const isCurrent = activeSubscriptionPlan === plan.id;
                        const isSelected = selectedPlan === plan.id;

                        return (
                            <button
                                key={plan.id}
                                type="button"
                                onClick={() => {
                                    if (!isCurrent) setSelectedPlan(plan.id);
                                }}
                                disabled={isCurrent}
                                className={`rounded-2xl border p-5 text-left shadow-sm transition ${
                                    isCurrent
                                        ? 'cursor-default border-stone-300 bg-stone-50'
                                        : isSelected
                                        ? 'border-[var(--brand-accent)] bg-[#fff9ef]'
                                        : 'border-stone-200 bg-white hover:border-stone-300'
                                }`}
                            >
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{plan.name}</div>
                                        <div className="text-primary mt-2 text-[2.05rem] font-bold leading-none sm:text-[2.15rem]">
                                            {plan.price}
                                        </div>
                                        <div className="mt-2 text-sm text-stone-600">{plan.note}</div>
                                    </div>
                                    {isCurrent && (
                                        <span className="inline-flex shrink-0 self-start rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-700">
                                            {t('billingCurrentPlanBadge')}
                                        </span>
                                    )}
                                </div>
                                <ul className="mt-4 space-y-2 text-sm leading-6 text-stone-600">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex gap-2">
                                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[var(--brand-accent)]" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        );
                    })}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    {isLoading ? (
                        <div className="text-sm text-stone-500">{t('billingLoading')}</div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-sm font-medium text-stone-500">{t('billingCurrentPlan')}</div>
                                    <div className="text-primary mt-2 text-3xl font-bold">{t(`billingPlan_${displayedPlan}`)}</div>
                                    <div className="mt-1 text-sm text-stone-500">{t(`billingPrice_${displayedPlan}`)}</div>
                                    <div className="mt-2 text-sm text-stone-600">
                                        {t('billingStatus')}: <span className="font-semibold uppercase">{planStatus}</span>
                                    </div>
                                    {cancelScheduled && (
                                        <div className="mt-1 text-sm font-semibold text-amber-700">
                                            {t('billingCancelScheduled')}
                                        </div>
                                    )}
                                    {customer?.trial_ends_at && (
                                        <div className="mt-1 text-sm text-stone-500">
                                            {t('billingTrialEnds')}: {formatBillingDate(customer.trial_ends_at, language)}
                                        </div>
                                    )}
                                    {customer?.current_period_ends_at && (
                                        <div className="mt-1 text-sm text-stone-500">
                                            {t(cancelScheduled ? 'billingCancelOn' : 'billingPeriodEnds')}: {formatBillingDate(customer.current_period_ends_at, language)}
                                        </div>
                                    )}
                                    {customer?.canceled_at && (
                                        <div className="mt-1 text-sm text-stone-500">
                                            {t('billingCanceledAt')}: {formatBillingDate(customer.canceled_at, language)}
                                        </div>
                                    )}
                                </div>
                                <div className="bg-primary-soft text-primary rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide">
                                    {t('billingTrialBadge')}
                                </div>
                            </div>

                            <div className="mt-6 space-y-3 text-sm text-stone-600">
                                <div>{t('billingHint1')}</div>
                                <div>{t('billingHint2')}</div>
                                <div>{t('billingHint3')}</div>
                            </div>

                            {isProductLocked && (
                                <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    <div className="font-semibold">
                                        {language === 'ja' ? '現在、主要機能は停止中です。' : 'Core product access is currently locked.'}
                                    </div>
                                    <div className="mt-1">
                                        {language === 'ja'
                                            ? 'トライアル終了または課金状態が無効のため、新規レポート作成、AI生成、保存、PDF 出力は利用できません。再契約すると再開できます。'
                                            : 'Because your trial ended or billing is inactive, new reports, AI generation, saving, and PDF export are unavailable. Re-subscribe to restore access.'}
                                    </div>
                                </div>
                            )}

                            {message && (
                                <div className="mt-6 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">
                                    {message}
                                </div>
                            )}

                            <div className="mt-6 flex flex-wrap gap-3">
                                {canCheckoutSelectedPlan && (
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={isSubmitting}
                                        className="bg-primary hover:bg-primary-dark rounded-lg px-5 py-3 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSubmitting
                                            ? t('billingOpeningCheckout')
                                            : isSubscribed
                                                ? t('billingChangeSelected')
                                                : t('billingUpgradeSelected')}
                                    </button>
                                )}
                                {isSubscribed && !canCheckoutSelectedPlan && (
                                    <div className="rounded-lg bg-stone-100 px-5 py-3 text-sm font-semibold text-stone-600">
                                        {t('billingAlreadyOnPlan')}
                                    </div>
                                )}
                                {customer?.stripe_customer_id && (
                                    <button
                                        onClick={handlePortal}
                                        className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition-colors hover:bg-stone-50"
                                    >
                                        {t('billingOpenPortal')}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
