'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet, restPost, restPatch } from '@/lib/restClient';

export default function ReproSettingsPage() {
    const { t } = useLanguage();
    const { session } = useAuth();
    const [ruleName, setRuleName] = useState('default');
    const [daysAfter, setDaysAfter] = useState('15,17,28,40');
    const [ruleId, setRuleId] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchRule = async () => {
            if (!session?.access_token) return;
            const data = await restGet(`repro_followup_rules?select=id,rule_name,days_after&rule_name=eq.${ruleName}`, getRestHeaders());
            const row = data?.[0];
            if (!mounted) return;
            if (row) {
                setRuleId(row.id);
                setDaysAfter((row.days_after || []).join(','));
            } else {
                setRuleId(null);
            }
        };
        fetchRule().catch(() => null);
        return () => { mounted = false; };
    }, [ruleName, session?.access_token]);

    const saveRule = async () => {
        if (!session?.access_token) return;
        const days = daysAfter
            .split(',')
            .map((v) => parseInt(v.trim(), 10))
            .filter((v) => !Number.isNaN(v) && v > 0);
        if (days.length === 0) {
            alert('Days after is required');
            return;
        }
        const headers = buildRestHeaders({ bearerToken: session.access_token, prefer: 'return=representation' });
        if (ruleId) {
            await restPatch(`repro_followup_rules?id=eq.${ruleId}`, {
                days_after: days,
                updated_at: new Date().toISOString()
            }, headers);
        } else {
            const created = await restPost('repro_followup_rules', {
                rule_name: ruleName,
                days_after: days,
                enabled: true
            }, headers);
            setRuleId(created?.[0]?.id || null);
        }
        alert('Saved');
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">settings</span>
                    {t('reproSettings')}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link
                        href="/dashboard/repro"
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-white text-stone-600 rounded-lg shadow-sm hover:text-stone-800 transition-all ring-1 ring-stone-200"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        <span className="text-sm font-medium">{t('reproBack')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6 max-w-xl">
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-400 uppercase">Rule</label>
                        <input
                            className="mt-2 w-full border border-gray-300 rounded p-2"
                            value={ruleName}
                            onChange={(e) => setRuleName(e.target.value)}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="text-xs font-bold text-gray-400 uppercase">{t('ruleDaysAfter')}</label>
                        <input
                            className="mt-2 w-full border border-gray-300 rounded p-2"
                            value={daysAfter}
                            onChange={(e) => setDaysAfter(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={saveRule}
                        className="bg-[var(--color-primary)] hover:brightness-110 text-white px-4 py-2 rounded-full text-sm font-bold"
                    >
                        {t('saveRule')}
                    </button>
                </div>
            </main>
        </div>
    );
}
