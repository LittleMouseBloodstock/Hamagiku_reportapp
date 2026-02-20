'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { buildRestHeaders, restGet, restPost } from '@/lib/restClient';
import { formatShortDate, toAmPmLabel } from '@/lib/reproDate';
import { labelMaps, shortLabel, uterusShort } from '@/lib/reproLabels';

export const runtime = 'edge';

type SnapshotRow = {
    date: string;
    latest_repro_check_id: string;
    latest_performed_at: string;
    max_follicle_mm_r?: number | null;
    max_follicle_mm_l?: number | null;
    follicle_feel_r?: string | null;
    follicle_feel_l?: string | null;
    cervix_state?: string | null;
    uterus_flags?: { edema?: boolean; fluid?: boolean } | null;
    uterus_tone?: string | null;
    interventions?: string[] | null;
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
    const [rows, setRows] = useState<SnapshotRow[]>([]);
    const [detail, setDetail] = useState<ReproCheckDetail | null>(null);
    const [horseName, setHorseName] = useState<string>('');
    const [newCover, setNewCover] = useState({ cover_date: '', stallion_name: '', note: '' });
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

    useEffect(() => {
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchTimeline = async () => {
            if (!session?.access_token || !id) return;
            const data = await restGet(
                `repro_daily_snapshots?select=date,latest_repro_check_id,latest_performed_at,max_follicle_mm_r,max_follicle_mm_l,follicle_feel_r,follicle_feel_l,cervix_state,uterus_flags,uterus_tone,interventions&horse_id=eq.${id}&order=date.desc,latest_performed_at.desc`,
                getRestHeaders()
            );
            if (mounted) setRows(data || []);
        };
        fetchTimeline().catch(() => setRows([]));
        return () => { mounted = false; };
    }, [id, session?.access_token]);

    useEffect(() => {
        if (!session?.access_token || !id) return;
        let mounted = true;
        const getRestHeaders = () => {
            if (!session?.access_token) throw new Error('Missing access token for REST');
            return buildRestHeaders({ bearerToken: session.access_token });
        };
        const fetchCoverData = async () => {
            const [vetData] = await Promise.all([
                restGet(`repro_vet_checks?select=id,check_date,note&horse_id=eq.${id}&order=check_date.desc`, getRestHeaders())
            ]);
            if (!mounted) return;
            setVetChecks(vetData || []);
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
            setNewCover({ cover_date: '', stallion_name: '', note: '' });
        } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            alert(`Failed to create cover: ${error.message || 'Unknown error'}`);
        }
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
                                {rows.map((row) => (
                                    <tr
                                        key={`${row.date}-${row.latest_repro_check_id}`}
                                        onClick={() => openDetail(row.latest_repro_check_id)}
                                        className="hover:bg-stone-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-4 py-3">
                                            {formatShortDate(row.date)} {toAmPmLabel(row.latest_performed_at)}
                                        </td>
                                        <td className="px-4 py-3">{row.max_follicle_mm_r ?? '-'}</td>
                                        <td className="px-4 py-3">{shortLabel(labelMaps.palpation, language, row.follicle_feel_r)}</td>
                                        <td className="px-4 py-3">{row.max_follicle_mm_l ?? '-'}</td>
                                        <td className="px-4 py-3">{shortLabel(labelMaps.palpation, language, row.follicle_feel_l)}</td>
                                        <td className="px-4 py-3">{shortLabel(labelMaps.cervix, language, row.cervix_state)}</td>
                                        <td className="px-4 py-3">{uterusShort(language, row.uterus_flags || {}, row.uterus_tone)}</td>
                                        <td className="px-4 py-3">
                                            {row.interventions && row.interventions.length > 0
                                                ? row.interventions.map((code) => shortLabel(labelMaps.interventions, language, code)).join(' ')
                                                : '-'}
                                        </td>
                                    </tr>
                                ))}
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
                        <div className="text-sm text-stone-500 mb-4">
                            {formatShortDate(detail.performed_at)} {toAmPmLabel(detail.performed_at)}
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
                    </div>
                </div>
            ) : null}
        </div>
    );
}
