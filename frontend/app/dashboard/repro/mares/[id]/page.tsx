'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet, restPost, restPatch, restDelete } from '@/lib/restClient';
import { formatShortDate, toAmPmLabel } from '@/lib/reproDate';
import { labelMaps, shortLabel, uterusShort } from '@/lib/reproLabels';

export const runtime = 'edge';

type CheckRow = {
    id: string;
    performed_at: string;
    interventions?: string[] | null;
    repro_findings?: Array<{
        organ: string;
        side: string;
        finding_type: string;
        size_mm?: number | null;
        value?: string | null;
        palpation_tags?: string[] | null;
    }>;
};

type ReproCheckDetail = {
    id: string;
    performed_at: string;
    method: string;
    note_text?: string | null;
    interventions?: string[] | null;
    repro_findings?: Array<{
        id: string;
        organ: string;
        side: string;
        finding_type: string;
        size_mm?: number | null;
        value?: string | null;
        palpation_tags?: string[] | null;
        comment?: string | null;
    }>;
};

export default function ReproTimelinePage() {
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const { language, t } = useLanguage();
    const { session } = useAuth();
    const [rows, setRows] = useState<CheckRow[]>([]);
    const [detail, setDetail] = useState<ReproCheckDetail | null>(null);
    const [detailPerformedAt, setDetailPerformedAt] = useState('');
    const [detailNote, setDetailNote] = useState('');
    const [horseName, setHorseName] = useState<string>('');
    const [newCover, setNewCover] = useState({ cover_date: '', stallion_name: '', note: '' });
    const [covers, setCovers] = useState<Array<{ id: string; cover_date: string; stallion_name?: string | null; note?: string | null }>>([]);
    const [vetCheck, setVetCheck] = useState({ check_date: '', note: '' });
    const [vetChecks, setVetChecks] = useState<Array<{ id: string; check_date: string; note?: string | null }>>([]);

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchHorse = async () => {
            if (!session?.access_token || !id) return;
            const data = await restGet(`horses?select=id,name,name_en&id=eq.${id}`, getRestHeaders());
            if (!mounted) return;
            const item = data && data[0];
            const name = language === 'ja' ? item?.name : item?.name_en || item?.name;
            setHorseName(name || String(id));
        };
        fetchHorse().catch(() => setHorseName(String(id)));
        return () => { mounted = false; };
    }, [id, language, session?.access_token]);

    const fetchTimeline = async (mounted?: { current: boolean }) => {
        if (!session?.access_token || !id) return;
        const headers = buildRestHeaders({ bearerToken: session.access_token });
        const data = await restGet(
            `repro_checks?select=id,performed_at,interventions,repro_findings(organ,side,finding_type,size_mm,value,palpation_tags)&horse_id=eq.${id}&order=performed_at.desc`,
            headers
        );
        if (!mounted || mounted.current) {
            setTimeout(() => setRows(data || []), 0);
        }
    };

    useEffect(() => {
        const mounted = { current: true };
        fetchTimeline(mounted).catch(() => setRows([]));
        return () => { mounted.current = false; };
    }, [id, session?.access_token]);

    useEffect(() => {
        if (!session?.access_token || !id) return;
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchCoverData = async () => {
            const [vetData, coverData] = await Promise.all([
                restGet(`repro_vet_checks?select=id,check_date,note&horse_id=eq.${id}&order=check_date.desc`, getRestHeaders()),
                restGet(`repro_covers?select=id,cover_date,stallion_name,note&horse_id=eq.${id}&order=cover_date.desc`, getRestHeaders())
            ]);
            if (!mounted) return;
            setVetChecks(vetData || []);
            setCovers(coverData || []);
        };
        fetchCoverData().catch((error) => console.warn('Failed to load cover data', error));
        return () => { mounted = false; };
    }, [id, session?.access_token]);

    const openDetail = async (checkId: string) => {
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const data = await restGet(
            `repro_checks?select=*,repro_findings(*)&id=eq.${checkId}`,
            getRestHeaders()
        );
        const row = data && data[0];
        setDetail(row || null);
        if (row) {
            const local = new Date(row.performed_at).toISOString().slice(0, 16);
            setDetailPerformedAt(local);
            setDetailNote(row.note_text || '');
        }
    };

    const saveDetail = async () => {
        if (!detail || !session?.access_token) return;
        try {
            const headers = buildRestHeaders({ bearerToken: session.access_token });
            await restPatch(`repro_checks?id=eq.${detail.id}`, {
                performed_at: new Date(detailPerformedAt).toISOString(),
                note_text: detailNote || null,
                updated_at: new Date().toISOString()
            }, headers);
            setDetail((prev) => (prev ? { ...prev, performed_at: new Date(detailPerformedAt).toISOString(), note_text: detailNote || null } : prev));
            await fetchTimeline();
        } catch (error) {
            alert('Failed to update record');
        }
    };

    const deleteDetail = async () => {
        if (!detail || !session?.access_token) return;
        if (!window.confirm(t('memoDeleteConfirm'))) return;
        try {
            await restDelete(`repro_checks?id=eq.${detail.id}`, buildRestHeaders({ bearerToken: session.access_token }));
            setDetail(null);
            await fetchTimeline();
        } catch (error) {
            alert('Failed to delete record');
        }
    };

    const handleAddVetCheck = async () => {
        if (!vetCheck.check_date) {
            alert(t('vetCheck'));
            return;
        }
        try {
            const headers = buildRestHeaders({ bearerToken: session?.access_token });
            await restPost('repro_vet_checks', {
                horse_id: id,
                check_date: vetCheck.check_date,
                note: vetCheck.note || null
            }, headers);
            const vetData = await restGet(`repro_vet_checks?select=id,check_date,note&horse_id=eq.${id}&order=check_date.desc`, headers);
            setVetChecks(vetData || []);
            setVetCheck({ check_date: '', note: '' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Failed to add check: ${error.message || 'Unknown error'}`);
        }
    };

    const handleCreateCover = async () => {
        if (!newCover.cover_date) {
            alert('Cover date is required');
            return;
        }
        try {
            const headers = buildRestHeaders({ bearerToken: session?.access_token });
            await restPost('rpc/repro_create_cover', {
                horse_id: id,
                cover_date: newCover.cover_date,
                stallion_name: newCover.stallion_name || null,
                note: newCover.note || null,
                p_rule_name: 'default'
            }, headers);
            const coverData = await restGet(`repro_covers?select=id,cover_date,stallion_name,note&horse_id=eq.${id}&order=cover_date.desc`, headers);
            setCovers(coverData || []);
            setNewCover({ cover_date: '', stallion_name: '', note: '' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Failed to create cover: ${error.message || 'Unknown error'}`);
        }
    };

    const summarizeCheck = (row: CheckRow) => {
        const findings = row.repro_findings || [];
        const maxR = findings
            .filter((f) => f.finding_type === 'follicle' && f.side === 'R' && f.size_mm != null)
            .map((f) => f.size_mm as number)
            .sort((a, b) => b - a)[0];
        const maxL = findings
            .filter((f) => f.finding_type === 'follicle' && f.side === 'L' && f.size_mm != null)
            .map((f) => f.size_mm as number)
            .sort((a, b) => b - a)[0];
        const feelR = findings.find((f) => f.finding_type === 'follicle' && f.side === 'R' && f.palpation_tags?.length)?.palpation_tags?.[0];
        const feelL = findings.find((f) => f.finding_type === 'follicle' && f.side === 'L' && f.palpation_tags?.length)?.palpation_tags?.[0];
        const cervix = findings.find((f) => f.finding_type === 'cervix_laxity')?.value || null;
        const uterusTone = findings.find((f) => f.finding_type === 'uterine_tone')?.value || null;
        const uterusFlags = {
            edema: findings.some((f) => f.finding_type === 'uterine_edema'),
            fluid: findings.some((f) => f.finding_type === 'fluid_retention')
        };
        return {
            maxR,
            maxL,
            feelR,
            feelL,
            cervix,
            uterusTone,
            uterusFlags,
            interventions: row.interventions || []
        };
    };

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden relative font-serif">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-4 sm:py-0 sm:h-16 bg-[#FDFCF8] border-b border-stone-200 gap-3 sm:gap-0">
                <div className="text-xl font-bold text-[#1a3c34] flex items-center gap-2 font-display">
                    <span className="material-symbols-outlined">timeline</span>
                    {t('reproTimeline')}
                </div>
                <div className="flex items-center gap-4 self-end sm:self-auto">
                    <Link
                        href="/dashboard/repro"
                        className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-stone-600 rounded-lg hover:text-stone-800 transition-all"
                    >
                        {t('reproManagement')}
                    </Link>
                    <Link
                        href={`/dashboard/repro/checks/new?horse_id=${id}`}
                        className="flex items-center gap-2 px-3 py-2 sm:px-4 bg-[#1a3c34] text-white rounded-lg shadow-sm hover:bg-[#122b25] transition-all ring-1 ring-[#1a3c34]/20"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span className="text-sm font-medium">{t('reproNewCheck')}</span>
                    </Link>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-6 bg-[#FDFCF8]">
                <div className="mb-4 text-stone-600 text-sm">{horseName}</div>
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 mb-6">
                    <div className="text-xs text-stone-400 uppercase mb-3">{t('coverDate')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">{t('coverDate')}</label>
                            <input
                                type="date"
                                className="mt-2 w-full border border-gray-300 rounded p-2"
                                value={newCover.cover_date}
                                onChange={(e) => setNewCover({ ...newCover, cover_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">{t('stallionName')}</label>
                            <input
                                type="text"
                                className="mt-2 w-full border border-gray-300 rounded p-2"
                                value={newCover.stallion_name}
                                onChange={(e) => setNewCover({ ...newCover, stallion_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Note</label>
                            <input
                                type="text"
                                className="mt-2 w-full border border-gray-300 rounded p-2"
                                value={newCover.note}
                                onChange={(e) => setNewCover({ ...newCover, note: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={handleCreateCover}
                            className="bg-[#1a3c34] hover:bg-[#122b25] text-white px-4 py-2 rounded-full text-sm font-bold"
                        >
                            {t('addCover')}
                        </button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {covers.length === 0 ? (
                            <div className="text-sm text-gray-400">-</div>
                        ) : (
                            covers.map((cover) => (
                                <div key={cover.id} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                    <div className="font-semibold">{cover.cover_date}</div>
                                    <div>{cover.stallion_name || '-'}</div>
                                    {cover.note ? <div className="text-xs text-gray-400">{cover.note}</div> : null}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 mb-6">
                    <div className="text-xs text-stone-400 uppercase mb-3">{t('vetCheck')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">{t('vetCheckDate')}</label>
                            <input
                                type="date"
                                className="mt-2 w-full border border-gray-300 rounded p-2"
                                value={vetCheck.check_date}
                                onChange={(e) => setVetCheck({ ...vetCheck, check_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase">Note</label>
                            <input
                                type="text"
                                className="mt-2 w-full border border-gray-300 rounded p-2"
                                value={vetCheck.note}
                                onChange={(e) => setVetCheck({ ...vetCheck, note: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={handleAddVetCheck}
                            className="bg-[#1a3c34] hover:bg-[#122b25] text-white px-4 py-2 rounded-full text-sm font-bold"
                        >
                            {t('addVetCheck')}
                        </button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {vetChecks.length === 0 ? (
                            <div className="text-sm text-gray-400">-</div>
                        ) : (
                            vetChecks.map((check) => (
                                <div key={check.id} className="border border-gray-200 rounded-lg p-3 text-sm text-gray-600">
                                    <div className="font-semibold">{check.check_date}</div>
                                    {check.note ? <div className="text-xs text-gray-400">{check.note}</div> : null}
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                                <tr>
                                    <th className="px-4 py-3 text-left">{t('date')}</th>
                                    <th className="px-4 py-3 text-left">R</th>
                                    <th className="px-4 py-3 text-left">R{t('reproPalpation')}</th>
                                    <th className="px-4 py-3 text-left">L</th>
                                    <th className="px-4 py-3 text-left">L{t('reproPalpation')}</th>
                                    <th className="px-4 py-3 text-left">Cvx</th>
                                    <th className="px-4 py-3 text-left">Utr</th>
                                    <th className="px-4 py-3 text-left">Act</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-200">
                                {rows.map((row) => {
                                    const summary = summarizeCheck(row);
                                    return (
                                    <tr
                                        key={row.id}
                                        onClick={() => openDetail(row.id)}
                                        className="hover:bg-stone-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3">
                                            {formatShortDate(row.performed_at)} {toAmPmLabel(row.performed_at)}
                                        </td>
                                        <td className="px-4 py-3">{summary.maxR ?? '-'}</td>
                                        <td className="px-4 py-3">{shortLabel(labelMaps.palpation, language, summary.feelR)}</td>
                                        <td className="px-4 py-3">{summary.maxL ?? '-'}</td>
                                        <td className="px-4 py-3">{shortLabel(labelMaps.palpation, language, summary.feelL)}</td>
                                        <td className="px-4 py-3">{shortLabel(labelMaps.cervix, language, summary.cervix)}</td>
                                        <td className="px-4 py-3">{uterusShort(language, summary.uterusFlags || {}, summary.uterusTone)}</td>
                                        <td className="px-4 py-3">
                                            {summary.interventions && summary.interventions.length > 0
                                                ? summary.interventions.map((code) => shortLabel(labelMaps.interventions, language, code)).join(' ')
                                                : '-'}
                                        </td>
                                    </tr>
                                );
                                })}
                                {rows.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                                            {t('reproNoData')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {detail ? (
                <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setDetail(null)}>
                    <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6" onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-lg font-bold text-stone-800">{t('reproDetails')}</h3>
                            <button className="text-stone-400 hover:text-stone-600" onClick={() => setDetail(null)}>
                                {t('reproClose')}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            <div>
                                <label className="block text-xs text-stone-500 mb-1">{t('reproPerformedAt')}</label>
                                <input
                                    type="datetime-local"
                                    value={detailPerformedAt}
                                    onChange={(e) => setDetailPerformedAt(e.target.value)}
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-stone-500 mb-1">{t('reproNote')}</label>
                                <input
                                    type="text"
                                    value={detailNote}
                                    onChange={(e) => setDetailNote(e.target.value)}
                                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(detail.repro_findings || []).map((finding) => (
                                <div key={finding.id} className="border border-stone-200 rounded-lg p-3">
                                    <div className="text-xs text-stone-400 uppercase">{finding.organ}</div>
                                    <div className="text-sm text-stone-700">
                                        {finding.side} / {finding.finding_type}
                                    </div>
                                    {finding.size_mm ? <div className="text-sm text-stone-600">{finding.size_mm} mm</div> : null}
                                    {finding.value ? <div className="text-sm text-stone-600">{finding.value}</div> : null}
                                    {finding.palpation_tags && finding.palpation_tags.length > 0 ? (
                                        <div className="text-xs text-stone-400">{finding.palpation_tags.join(', ')}</div>
                                    ) : null}
                                    {finding.comment ? <div className="text-xs text-stone-500">{finding.comment}</div> : null}
                                </div>
                            ))}
                        </div>
                        {detail.note_text ? (
                            <div className="mt-4 text-sm text-stone-600">
                                <span className="font-semibold text-stone-700">{t('reproNote')}:</span> {detail.note_text}
                            </div>
                        ) : null}
                        <div className="mt-4 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={deleteDetail}
                                className="text-red-600 hover:underline text-sm"
                            >
                                {t('memoDelete')}
                            </button>
                            <button
                                type="button"
                                onClick={saveDetail}
                                className="bg-[#1a3c34] hover:bg-[#122b25] text-white px-4 py-2 rounded-full text-sm font-bold"
                            >
                                {t('memoUpdate')}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
