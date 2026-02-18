'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet, restPost } from '@/lib/restClient';
import { labelMaps, shortLabel } from '@/lib/reproLabels';
import { toLocalInputValue } from '@/lib/reproDate';

type Mare = {
    id: string;
    name: string;
    name_en: string;
};

type FollowTask = {
    id: string;
    horse_id: string;
    trigger_type: string;
    due_at: string;
    status: string;
    horses?: { name: string; name_en: string };
};

export default function ReproCheckNewPage() {
    const { language, t } = useLanguage();
    const { session } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const horseIdParam = searchParams.get('horse_id') || '';
    const followTaskId = searchParams.get('follow_task_id');

    const [mares, setMares] = useState<Mare[]>([]);
    const [horseId, setHorseId] = useState(horseIdParam);
    const [followTask, setFollowTask] = useState<FollowTask | null>(null);

    const [performedAt, setPerformedAt] = useState(toLocalInputValue(new Date().toISOString()));
    const [timePreset, setTimePresetState] = useState<'AM' | 'PM' | 'NOW' | null>(null);
    const [noteText, setNoteText] = useState('');

    const [follicleR, setFollicleR] = useState<number | ''>('');
    const [follicleL, setFollicleL] = useState<number | ''>('');
    const [follicleFeelR, setFollicleFeelR] = useState<string | null>(null);
    const [follicleFeelL, setFollicleFeelL] = useState<string | null>(null);
    const [clR, setClR] = useState(false);
    const [clL, setClL] = useState(false);

    const [uterusEdema, setUterusEdema] = useState(false);
    const [uterusFluid, setUterusFluid] = useState(false);
    const [uterusTone, setUterusTone] = useState<string | null>(null);

    const [cervixState, setCervixState] = useState<string | null>(null);

    const [interventions, setInterventions] = useState<Record<string, boolean>>({
        deslorelin: false,
        mating: false,
        altrenogest: false,
        induction: false,
        ovulation: false
    });

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchMares = async () => {
            if (!session?.access_token) return;
            const data = await restGet('horses?select=id,name,name_en&sex=eq.Mare&order=name', getRestHeaders());
            if (mounted) setMares(data || []);
        };
        fetchMares().catch(() => setMares([]));
        return () => { mounted = false; };
    }, [session?.access_token]);

    useEffect(() => {
        if (!followTaskId || !session?.access_token) return;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        restGet(`repro_follow_up_tasks?select=*,horses(name,name_en)&id=eq.${followTaskId}`, getRestHeaders())
            .then((res) => setFollowTask(res?.[0] || null))
            .catch(() => setFollowTask(null));
    }, [followTaskId, session?.access_token]);

    const followLabel = useMemo(() => {
        if (!followTask) return '';
        const name = language === 'ja' ? followTask.horses?.name : followTask.horses?.name_en || followTask.horses?.name;
        const trigger = shortLabel(labelMaps.interventions, language, followTask.trigger_type);
        return `${t('reproFollowBanner')}: ${name || ''} ${trigger} (${followTask.due_at.slice(5, 10).replace('-', '/')} ${followTask.due_at.slice(11, 16)})`;
    }, [followTask, language, t]);

    const setTimePreset = (hour: number, preset: 'AM' | 'PM' | 'NOW') => {
        const now = new Date();
        now.setHours(hour, 0, 0, 0);
        setPerformedAt(toLocalInputValue(now.toISOString()));
        setTimePresetState(preset);
    };

    const submit = async () => {
        if (!horseId) return;
        const findings: Array<Record<string, unknown>> = [];
        if (follicleR !== '') {
            findings.push({
                organ: 'ovary',
                side: 'R',
                finding_type: 'follicle',
                size_mm: follicleR,
                palpation_tags: follicleFeelR ? [follicleFeelR] : []
            });
        }
        if (follicleL !== '') {
            findings.push({
                organ: 'ovary',
                side: 'L',
                finding_type: 'follicle',
                size_mm: follicleL,
                palpation_tags: follicleFeelL ? [follicleFeelL] : []
            });
        }
        if (clR) {
            findings.push({
                organ: 'ovary',
                side: 'R',
                finding_type: 'CL'
            });
        }
        if (clL) {
            findings.push({
                organ: 'ovary',
                side: 'L',
                finding_type: 'CL'
            });
        }
        if (uterusEdema) {
            findings.push({
                organ: 'uterus',
                side: 'mid',
                finding_type: 'uterine_edema'
            });
        }
        if (uterusFluid) {
            findings.push({
                organ: 'uterus',
                side: 'mid',
                finding_type: 'fluid_retention'
            });
        }
        if (uterusTone) {
            findings.push({
                organ: 'uterus',
                side: 'mid',
                finding_type: 'uterine_tone',
                value: uterusTone
            });
        }
        if (cervixState) {
            findings.push({
                organ: 'cervix',
                side: 'mid',
                finding_type: 'cervix_laxity',
                value: cervixState
            });
        }
        const interventionList = Object.entries(interventions)
            .filter(([, on]) => on)
            .map(([key]) => key);

        const payload = {
            horse_id: horseId,
            performed_at: new Date(performedAt).toISOString(),
            method: 'palpation',
            note_text: noteText || null,
            language_hint: language,
            interventions: interventionList,
            findings,
            follow_task_id: followTaskId || null
        };

        if (!session?.access_token) {
            alert('Missing access token for REST');
            return;
        }
        const headers = buildRestHeaders({ bearerToken: session.access_token });
        await restPost('rpc/repro_create_check', payload, headers);
        router.push(`/dashboard/repro/mares/${horseId}`);
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">add_circle</span>
                    {t('reproNewCheck')}
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
                {followTask ? (
                    <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                        {followLabel}
                    </div>
                ) : null}

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
                    <div className="mb-4">
                        <label className="text-xs uppercase text-stone-400">{t('reproMares')}</label>
                        <select
                            className="mt-2 w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                            value={horseId}
                            onChange={(event) => setHorseId(event.target.value)}
                        >
                            <option value="">--</option>
                            {mares.map((mare) => (
                                <option key={mare.id} value={mare.id}>
                                    {language === 'ja' ? mare.name : mare.name_en || mare.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="border-t border-stone-100 pt-4">
                        <div className="text-xs uppercase text-stone-400 mb-2">{t('reproPerformedAt')}</div>
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex gap-2">
                                <button className={`px-3 py-2 rounded-lg text-sm border ${timePreset === 'AM' ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200'}`} type="button" onClick={() => setTimePreset(9, 'AM')}>
                                    {t('reproAm')}
                                </button>
                                <button className={`px-3 py-2 rounded-lg text-sm border ${timePreset === 'PM' ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200'}`} type="button" onClick={() => setTimePreset(17, 'PM')}>
                                    {t('reproPm')}
                                </button>
                                <button className={`px-3 py-2 rounded-lg text-sm border ${timePreset === 'NOW' ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200'}`} type="button" onClick={() => setTimePreset(new Date().getHours(), 'NOW')}>
                                    {t('reproNow')}
                                </button>
                            </div>
                            <input
                                className="border border-stone-200 rounded-lg px-3 py-2 text-sm"
                                type="datetime-local"
                                value={performedAt}
                                onChange={(event) => {
                                    setPerformedAt(event.target.value);
                                    setTimePresetState(null);
                                }}
                            />
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 mt-4">
                        <div className="text-xs uppercase text-stone-400 mb-2">{t('reproOvary')}</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-stone-200 rounded-lg p-3">
                                <div className="text-sm font-semibold mb-2">R</div>
                                <input
                                    type="number"
                                    placeholder="mm"
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                                    value={follicleR}
                                    onChange={(event) => setFollicleR(event.target.value === '' ? '' : Number(event.target.value))}
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {['soft', 'firm'].map((feel) => (
                                        <button
                                            key={feel}
                                            type="button"
                                            className={`px-3 py-1 rounded-full text-xs border ${follicleFeelR === feel ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                            onClick={() => setFollicleFeelR(feel)}
                                        >
                                            {shortLabel(labelMaps.palpation, language, feel)}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className={`mt-2 px-3 py-1 rounded-full text-xs border ${clR ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                    onClick={() => setClR((prev) => !prev)}
                                >
                                    {shortLabel(labelMaps.ovaryTypes, language, 'CL')}
                                </button>
                            </div>
                            <div className="border border-stone-200 rounded-lg p-3">
                                <div className="text-sm font-semibold mb-2">L</div>
                                <input
                                    type="number"
                                    placeholder="mm"
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                                    value={follicleL}
                                    onChange={(event) => setFollicleL(event.target.value === '' ? '' : Number(event.target.value))}
                                />
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {['soft', 'firm'].map((feel) => (
                                        <button
                                            key={feel}
                                            type="button"
                                            className={`px-3 py-1 rounded-full text-xs border ${follicleFeelL === feel ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                            onClick={() => setFollicleFeelL(feel)}
                                        >
                                            {shortLabel(labelMaps.palpation, language, feel)}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    className={`mt-2 px-3 py-1 rounded-full text-xs border ${clL ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                    onClick={() => setClL((prev) => !prev)}
                                >
                                    {shortLabel(labelMaps.ovaryTypes, language, 'CL')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 mt-4">
                        <div className="text-xs uppercase text-stone-400 mb-2">{t('reproUterus')}</div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-full text-xs border ${uterusEdema ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                onClick={() => setUterusEdema((prev) => !prev)}
                            >
                                {shortLabel(labelMaps.uterusFlags, language, 'edema')}
                            </button>
                            <button
                                type="button"
                                className={`px-3 py-1 rounded-full text-xs border ${uterusFluid ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                onClick={() => setUterusFluid((prev) => !prev)}
                            >
                                {shortLabel(labelMaps.uterusFlags, language, 'fluid')}
                            </button>
                            {['low', 'high'].map((tone) => (
                                <button
                                    key={tone}
                                    type="button"
                                    className={`px-3 py-1 rounded-full text-xs border ${uterusTone === tone ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                    onClick={() => setUterusTone(tone)}
                                >
                                    {shortLabel(labelMaps.uterusTone, language, tone)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 mt-4">
                        <div className="text-xs uppercase text-stone-400 mb-2">{t('reproCervix')}</div>
                        <div className="flex flex-wrap gap-2">
                            {['tight', 'moderate', 'lax'].map((cvx) => (
                                <button
                                    key={cvx}
                                    type="button"
                                    className={`px-3 py-1 rounded-full text-xs border ${cervixState === cvx ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                    onClick={() => setCervixState(cvx)}
                                >
                                    {shortLabel(labelMaps.cervix, language, cvx)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 mt-4">
                        <div className="text-xs uppercase text-stone-400 mb-2">{t('reproInterventions')}</div>
                        <div className="flex flex-wrap gap-2">
                            {Object.keys(interventions).map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    className={`px-3 py-1 rounded-full text-xs border ${interventions[key] ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-200 text-stone-600'}`}
                                    onClick={() => setInterventions((prev) => ({ ...prev, [key]: !prev[key] }))}
                                >
                                    {shortLabel(labelMaps.interventions, language, key)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-stone-100 pt-4 mt-4">
                        <div className="text-xs uppercase text-stone-400 mb-2">{t('reproNote')}</div>
                        <textarea
                            rows={3}
                            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                            value={noteText}
                            onChange={(event) => setNoteText(event.target.value)}
                        />
                    </div>

                    <div className="mt-6 flex justify-end gap-3">
                        <Link
                            href="/dashboard/repro"
                            className="px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm hover:text-stone-800"
                        >
                            {t('reproBack')}
                        </Link>
                        <button
                            className="px-4 py-2 rounded-lg bg-[#1a3c34] text-white text-sm hover:bg-[#122b25]"
                            type="button"
                            onClick={submit}
                            disabled={!horseId}
                        >
                            {t('save')}
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
