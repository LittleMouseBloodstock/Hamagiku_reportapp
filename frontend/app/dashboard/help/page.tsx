'use client';

import { useLanguage } from '@/contexts/LanguageContext';

export default function HelpPage() {
    const { t } = useLanguage();

    return (
        <div className="app-shell flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
            <div className="mx-auto max-w-4xl space-y-6">
                <div>
                    <h1 className="dashboard-page-title text-3xl">{t('helpTitle')}</h1>
                    <p className="mt-2 text-sm text-stone-500">{t('helpSubtitle')}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {[1, 2, 3, 4].map((step) => (
                        <article key={step} className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-stone-900">{t(`helpStep${step}Title`)}</h2>
                            <p className="mt-3 text-sm leading-7 text-stone-600">{t(`helpStep${step}Body`)}</p>
                        </article>
                    ))}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-stone-900">{t('helpFeatureTitle')}</h2>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
                        <li>{t('helpFeature1')}</li>
                        <li>{t('helpFeature2')}</li>
                        <li>{t('helpFeature3')}</li>
                        <li>{t('helpFeature4')}</li>
                    </ul>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-stone-900">{t('helpRecommendedTitle')}</h2>
                    <ul className="mt-4 space-y-3 text-sm leading-7 text-stone-600">
                        <li>{t('helpRecommended1')}</li>
                        <li>{t('helpRecommended2')}</li>
                        <li>{t('helpRecommended3')}</li>
                        <li>{t('helpRecommended4')}</li>
                    </ul>
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-stone-900">{t('helpRagTitle')}</h2>
                    <p className="mt-4 text-sm leading-7 text-stone-600">{t('helpRagBody')}</p>
                </div>
            </div>
        </div>
    );
}
