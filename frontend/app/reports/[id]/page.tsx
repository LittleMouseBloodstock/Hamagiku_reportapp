'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Save, Printer, Check, UploadCloud, Send, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';

export default function ReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [reviewStatus, setReviewStatus] = useState<string>('draft');

    // Initial Data for Template
    const [initialData, setInitialData] = useState<Partial<ReportData>>({});
    const [horseId, setHorseId] = useState<string | null>(null);

    // Horse Selection (for New Reports)
    const [showHorseSelector, setShowHorseSelector] = useState(false);
    const [horses, setHorses] = useState<{ id: string, name: string, name_en: string }[]>([]);

    // Current Data (Synced from Child)
    const reportDataRef = useRef<ReportData | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchReportData = async () => {
            if (isNew) {
                // Determine horseId from URL params (if linked from Horse Detail)
                const params = new URLSearchParams(window.location.search);
                const paramHorseId = params.get('horseId');
                const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.'); // yyyy.MM

                if (paramHorseId) {
                    setHorseId(paramHorseId);
                    // Fetch horse details to prepopulate
                    const { data: horse } = await supabase.from('horses').select('*').eq('id', paramHorseId).single();

                    // Fetch past weight history
                    const { data: reports } = await supabase
                        .from('reports')
                        .select('created_at, weight')
                        .eq('horse_id', paramHorseId)
                        .order('created_at', { ascending: true });

                    const weightHistory = reports?.map(r => {
                        const d = new Date(r.created_at);
                        return {
                            label: `${d.getMonth() + 1}月`,
                            value: r.weight || 0
                        };
                    }).filter(item => item.value > 0) || [];

                    setInitialData({
                        reportDate: defaultDate,
                        horseNameJp: horse?.name || '',
                        horseNameEn: horse?.name_en || '',
                        sire: horse?.sire || '',
                        dam: horse?.dam || '',
                        mainPhoto: horse?.photo_url || '',
                        statusEn: 'Training', statusJp: '調整中',
                        weight: '', targetEn: '', targetJp: '',
                        commentEn: '', commentJp: '',
                        weightHistory: weightHistory
                    });
                    setLoading(false);
                } else {
                    // No horse selected, fetch list and show selector
                    const { data: allHorses } = await supabase.from('horses').select('id, name, name_en').order('name');
                    if (allHorses) setHorses(allHorses);
                    setShowHorseSelector(true);
                    setLoading(false);
                }
                return;
            }

            // Existing Report Logic
            const { data: report, error } = await supabase.from('reports').select('*').eq('id', id).single();
            if (error || !report) {
                console.error("Report not found");
                return;
            }

            // Fetch Horse Data
            const { data: horse } = await supabase.from('horses').select('*').eq('id', report.horse_id).single();

            setHorseId(report.horse_id);

            // Parse metrics_json for extra fields
            const metrics = report.metrics_json || {};

            // Map DB to ReportData
            setInitialData({
                reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                horseNameJp: horse?.name || '',
                horseNameEn: horse?.name_en || '',
                sire: horse?.sire || '',
                sireEn: metrics.sireEn || '',
                sireJp: metrics.sireJp || '',
                dam: horse?.dam || '',
                damEn: metrics.damEn || '',
                damJp: metrics.damJp || '',

                commentJp: report.body || '',
                commentEn: metrics.commentEn || '',

                weight: report.weight ? `${report.weight} kg` : '',

                statusJp: report.status_training || '',
                statusEn: metrics.statusEn || '',

                targetJp: report.target || '',
                targetEn: metrics.targetEn || '',

                weightHistory: metrics.weightHistory || [],

                mainPhoto: report.main_photo_url || horse?.photo_url || '',
                logo: null
            });

            setReviewStatus(report.review_status || 'draft');

            setLoading(false);
        };

        fetchReportData();
    }, [id, isNew]);

    const handleSelectHorse = async (selectedHorseId: string) => {
        setHorseId(selectedHorseId);
        setShowHorseSelector(false);
        setLoading(true);
        const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.');

        // Fetch horse details
        const { data: horse } = await supabase.from('horses').select('*').eq('id', selectedHorseId).single();

        // Fetch past weight history
        const { data: reports } = await supabase
            .from('reports')
            .select('created_at, weight')
            .eq('horse_id', selectedHorseId)
            .order('created_at', { ascending: true });

        const weightHistory = reports?.map(r => {
            const d = new Date(r.created_at);
            return {
                label: `${d.getMonth() + 1}月`,
                value: r.weight || 0
            };
        }).filter(item => item.value > 0) || [];

        setInitialData({
            reportDate: defaultDate,
            horseNameJp: horse?.name || '',
            horseNameEn: horse?.name_en || '',
            sire: horse?.sire || '',
            dam: horse?.dam || '',
            mainPhoto: horse?.photo_url || '',
            statusEn: 'Training', statusJp: '調整中',
            weight: '', targetEn: '', targetJp: '',
            commentEn: '', commentJp: '',
            weightHistory: weightHistory
        });
        setLoading(false);
    };

    const handleDataChange = useCallback((data: ReportData) => {
        reportDataRef.current = data;
    }, []);

    async function uploadImage(base64Data: string, path: string): Promise<{ url: string | null, error: unknown }> {
        try {
            // Convert Base64 to Blob
            const res = await fetch(base64Data);
            const blob = await res.blob();

            // Upload to Supabase Storage
            const { error } = await supabase.storage
                .from('report-assets')
                .upload(path, blob, { upsert: true });

            if (error) {
                console.error("Upload Error:", error);
                return { url: null, error };
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('report-assets')
                .getPublicUrl(path);

            return { url: publicUrl, error: null };
        } catch (e) {
            console.error("Image Processing Error:", e);
            return { url: null, error: e };
        }
    }

    async function saveReport() {
        if (!reportDataRef.current || !id) return;
        if (!horseId) {
            alert("No horse selected!");
            return;
        }

        setSaving(true);
        const d = reportDataRef.current;

        let mainPhotoUrl = d.mainPhoto;
        // const logoUrl = d.logo; // Unused

        // Check if mainPhoto is new (Base64) - only upload if changed
        if (d.mainPhoto && d.mainPhoto.startsWith('data:')) {
            const fileName = `main_${Date.now()}.jpg`;
            const reportPathId = isNew ? `temp_${Date.now()}` : id;
            const path = `${horseId}/${reportPathId}/${fileName}`;

            const { url: uploadedUrl, error: uploadError } = await uploadImage(d.mainPhoto, path);
            if (uploadedUrl) {
                mainPhotoUrl = uploadedUrl;
            } else {
                const errorMsg = (uploadError as any)?.message || JSON.stringify(uploadError) || "Unknown Error";
                alert(`Failed to upload image.\nError: ${errorMsg}\n\nPlease check Supabase Storage policies.`);
                setSaving(false);
                return;
            }
        }

        // Pack extra fields into metrics_json
        const metricsJson = {
            commentEn: d.commentEn,
            statusEn: d.statusEn,
            targetEn: d.targetEn,
            weightHistory: d.weightHistory,
            sireEn: d.sireEn,
            sireJp: d.sireJp,
            damEn: d.damEn,
            damJp: d.damJp
        };

        const payload = {
            horse_id: horseId, // Ensure horse_id is set
            title: d.reportDate, // Store report date in title
            body: d.commentJp,
            weight: parseFloat(d.weight.replace(/[^0-9.]/g, '') || '0'),
            status_training: d.statusJp, // Map statusJp to status_training
            target: d.targetJp, // Map targetJp to target
            metrics_json: metricsJson,
            main_photo_url: mainPhotoUrl,
            updated_at: new Date().toISOString()
        };

        let resultError = null;
        let newReportId = null;

        if (isNew) {
            // INSERT
            const { data, error } = await supabase.from('reports').insert(payload).select().single();
            resultError = error;
            if (data) newReportId = data.id;
        } else {
            // UPDATE
            const { error } = await supabase.from('reports').update(payload).eq('id', id);
            resultError = error;
        }

        if (resultError) {
            console.error("Save Error:", resultError);
            alert("Error saving report: " + resultError.message);
            setSaving(false);
            return;
        }

        // Update Horse (Name/Sire/Dam/Photo if changed)
        if (horseId) {
            await supabase.from('horses').update({
                name: d.horseNameJp,
                name_en: d.horseNameEn,
                sire: d.sire,
                dam: d.dam,
                photo_url: mainPhotoUrl, // Sync latest photo to horse thumbnail
                updated_at: new Date().toISOString()
            }).eq('id', horseId);
        }

        setSaving(false);
        setLastSaved(new Date());

        if (isNew && newReportId) {
            router.replace(`/reports/${newReportId}`);
        } else {
            if (d.mainPhoto.startsWith('data:')) {
                if (reportDataRef.current) reportDataRef.current.mainPhoto = mainPhotoUrl;
            }
        }

    }

    const handleUpdateStatus = async (newStatus: string) => {
        if (!id || isNew) {
            alert("Please save the report first.");
            return;
        }
        if (!confirm(`Change status to "${newStatus}"?`)) return;

        setSaving(true);
        const { error } = await supabase
            .from('reports')
            .update({ review_status: newStatus })
            .eq('id', id);

        if (error) {
            alert("Error updating status: " + error.message);
        } else {
            setReviewStatus(newStatus);
        }
        setSaving(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading Report...</div>;

    if (showHorseSelector) {
        return (
            <div className="min-h-screen flex items-start justify-center pt-10 sm:pt-20 bg-gray-100 font-sans px-4">
                <div className="bg-white p-6 sm:p-8 rounded-xl shadow-xl w-full max-w-2xl border border-stone-200">
                    <h2 className="text-2xl font-bold mb-3 text-[#1a3c34]">Select a Horse</h2>
                    <p className="text-stone-500 mb-6 text-sm">Please select a horse to create a report for.</p>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                        {horses.map(h => (
                            <button
                                key={h.id}
                                onClick={() => handleSelectHorse(h.id)}
                                className="w-full text-left p-4 hover:bg-[#1a3c34]/5 border border-stone-200 rounded-lg transition-all duration-200 text-lg text-[#1a3c34] font-medium block group"
                            >
                                {h.name} <span className="text-sm text-stone-400 ml-2 font-normal">{h.name_en}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 font-sans print:py-0 print:block print:min-h-0 print:h-auto print:bg-white bg-gray-100">
            {/* Control Panel (Hidden in Print) */}
            <div className="control-panel w-full max-w-[210mm] bg-[#222] text-white p-3 sm:p-4 rounded-none sm:rounded-md mb-4 sm:mb-6 flex flex-col sm:flex-row gap-4 sm:justify-between items-center shadow-lg no-print sticky top-0 sm:top-4 z-50">
                <div className="flex items-center w-full sm:w-auto justify-between sm:justify-start gap-4">
                    <Link href={`/dashboard`} className="text-gray-400 hover:text-white transition-colors flex items-center gap-1">
                        <ArrowLeft size={20} /> <span className="sm:hidden text-xs">Back</span>
                    </Link>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm">{isNew ? 'New Report' : 'Report Editor'}</span>
                        {lastSaved && <span className="text-[10px] text-gray-500 flex items-center gap-1"><Check size={8} /> Saved {lastSaved.toLocaleTimeString()}</span>}
                    </div>
                    <div className="sm:hidden">
                        <LanguageToggle />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <div className="hidden sm:block">
                        <LanguageToggle />
                    </div>

                    {/* Review Workflow Buttons */}
                    {reviewStatus === 'draft' && (
                        <button
                            onClick={() => handleUpdateStatus('pending_jp_check')}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all"
                            title="Request Review"
                        >
                            <Send size={16} /> <span className="hidden sm:inline">Request Review</span>
                        </button>
                    )}

                    {(reviewStatus === 'pending_jp_check' || reviewStatus === 'pending_en_check') && (
                        <>
                            <button
                                onClick={() => handleUpdateStatus('draft')}
                                className="bg-red-500 hover:bg-red-400 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all"
                                title="Reject / Back to Draft"
                            >
                                <AlertCircle size={16} /> <span className="hidden sm:inline">Reject</span>
                            </button>
                            <button
                                onClick={() => handleUpdateStatus('approved')}
                                className="bg-green-600 hover:bg-green-500 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all"
                                title="Approve"
                            >
                                <ShieldCheck size={16} /> <span className="hidden sm:inline">Approve</span>
                            </button>
                        </>
                    )}

                    {reviewStatus === 'approved' && (
                        <div className="px-3 py-2 bg-green-100 text-green-800 rounded font-bold text-sm flex items-center gap-2 border border-green-200">
                            <ShieldCheck size={16} /> Approved
                        </div>
                    )}

                    <button
                        onClick={saveReport}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        {saving ? <UploadCloud size={16} className="animate-bounce" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--color-accent)] hover:brightness-110 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all"
                    >
                        <Printer size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Main Report Wrapper - Adjusted for Split View Compatibility */}
            {/* The ReportTemplate now has its own split view, so we need to enable full width here and remove centralized scaling for desktop, keep mobile scaling? */}
            {/* Actually ReportTemplate is responsive (stacked on mobile, split on desktop). 
               So we should just let it be full width. */}

            <div className="w-full flex justify-center overflow-x-auto pb-8 print:pb-0 print:overflow-visible">
                <ReportTemplate initialData={initialData} onDataChange={handleDataChange} />
            </div>
        </div>
    );
}
