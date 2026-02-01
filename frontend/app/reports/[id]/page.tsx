'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import useResumeRefresh from '@/hooks/useResumeRefresh';
import { useParams, useRouter } from 'next/navigation';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Save, Printer, Check, UploadCloud, Send, ShieldCheck, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const isNew = id === 'new';
    const refreshKey = useResumeRefresh();

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

    const { user, session } = useAuth(); // Add useAuth
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const getRestHeaders = () => {
        if (!supabaseUrl || !supabaseAnonKey || !session?.access_token) {
            throw new Error('Missing env vars or access token for REST');
        }
        return {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    };

    const restGet = async (path: string) => {
        const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
            headers: getRestHeaders()
        });
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`REST GET failed: ${res.status} ${text}`);
        }
        return res.json();
    };

    const calculateHorseAge = (birthDate?: string | null) => {
        if (!birthDate) return null;
        const year = new Date(birthDate).getFullYear();
        if (Number.isNaN(year)) return null;
        return new Date().getFullYear() - year;
    };

    const resolveOutputMode = (clientMode?: string | null, trainerMode?: string | null): 'pdf' | 'print' => {
        const normalize = (mode?: string | null) => (mode === 'print' ? 'print' : 'pdf');
        if (clientMode) return normalize(clientMode);
        if (trainerMode) return normalize(trainerMode);
        return 'pdf';
    };

    const fetchLatestWeight = async (horseId: string) => {
        try {
            const data = await restGet(`horse_weights?horse_id=eq.${horseId}&select=weight,measured_at&order=measured_at.desc&limit=1`);
            return data?.[0]?.weight ?? null;
        } catch {
            return null;
        }
    };

    useEffect(() => {
        if (!id || !user) return; // Wait for user

        let isMounted = true;
        const fetchReportData = async (retryCount = 0) => {
            try {
                if (isNew) {
                    // Determine horseId from URL params (if linked from Horse Detail)
                    const params = new URLSearchParams(window.location.search);
                    const paramHorseId = params.get('horseId');
                    const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.'); // yyyy.MM
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    const sixMonthsAgoIso = sixMonthsAgo.toISOString();

                    if (paramHorseId) {
                        if (isMounted) setHorseId(paramHorseId);
                        // Fetch horse details to prepopulate
                        const horseArr = await restGet(`horses?id=eq.${paramHorseId}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`);
                        const horse = horseArr?.[0];

                        // Fetch past weight history (last 6 months)
                        const weights = await restGet(`horse_weights?horse_id=eq.${paramHorseId}&measured_at=gte.${encodeURIComponent(sixMonthsAgoIso)}&select=measured_at,weight&order=measured_at.asc`);

                        const latestWeight = await fetchLatestWeight(paramHorseId);

                        const weightHistory = weights?.map((r: { measured_at: string; weight: number | null }) => {
                            const d = new Date(r.measured_at);
                            return {
                                label: `${d.getMonth() + 1}月`,
                                value: r.weight || 0
                            };
                        }).filter((item: { value: number }) => item.value > 0) || [];

                        if (isMounted) {
                            setInitialData({
                                reportDate: defaultDate,
                                horseNameJp: horse?.name || '',
                                horseNameEn: horse?.name_en || '',
                                sire: horse?.sire || '',
                                sireEn: horse?.sire_en || '',
                                sireJp: horse?.sire || '',
                                dam: horse?.dam || '',
                                damEn: horse?.dam_en || '',
                                damJp: horse?.dam || '',
                                ownerName: horse?.clients?.name || '',
                                trainerNameJp: horse?.trainers?.trainer_name || '',
                                trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                trainerLocation: horse?.trainers?.trainer_location || '',
                                birthDate: horse?.birth_date || '',
                                age: calculateHorseAge(horse?.birth_date),
                                outputMode: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode),
                                showLogo: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode) !== 'print',
                                mainPhoto: horse?.photo_url || '',
                                originalPhoto: horse?.photo_url || '',
                                statusEn: 'Training', statusJp: '調整中',
                                weight: latestWeight !== null ? `${latestWeight} kg` : '', targetEn: '', targetJp: '',
                                commentEn: '', commentJp: '',
                                weightHistory: weightHistory
                            });
                            setLoading(false);
                        }
                    } else {
                        // No horse selected, fetch list and show selector
                        const allHorses = await restGet('horses?select=id,name,name_en&order=name');
                        if (isMounted) {
                            if (allHorses) setHorses(allHorses);
                            setShowHorseSelector(true);
                            setLoading(false);
                        }
                    }
                    return;
                }

                // Existing Report Logic
                const reportArr = await restGet(`reports?id=eq.${id}&select=*`);
                const report = reportArr?.[0];
                if (!report) throw new Error("Report not found");

                // Fetch Horse Data
                const horseArr = await restGet(`horses?id=eq.${report.horse_id}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`);
                const horse = horseArr?.[0];

                if (isMounted) {
                    setHorseId(report.horse_id);

                    // Parse metrics_json for extra fields
                    const metrics = report.metrics_json || {};

                    // Map DB to ReportData
                    const resolvedMode = resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode);
                    const showLogo = metrics.showLogo ?? (resolvedMode !== 'print');
                    setInitialData({
                        reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                        horseNameJp: horse?.name || '',
                        horseNameEn: horse?.name_en || '',
                        sire: horse?.sire || '',
                        sireEn: horse?.sire_en || metrics.sireEn || '',
                        sireJp: horse?.sire || metrics.sireJp || '',
                        dam: horse?.dam || '',
                        damEn: horse?.dam_en || metrics.damEn || '',
                        damJp: horse?.dam || metrics.damJp || '',
                        ownerName: horse?.clients?.name || '',
                        trainerNameJp: horse?.trainers?.trainer_name || '',
                        trainerNameEn: horse?.trainers?.trainer_name_en || '',
                        trainerLocation: horse?.trainers?.trainer_location || '',
                        trainerLocationEn: horse?.trainers?.trainer_location_en || '',
                        birthDate: horse?.birth_date || '',
                        age: calculateHorseAge(horse?.birth_date),
                        outputMode: resolvedMode,
                        showLogo: showLogo,

                        commentJp: report.body || '',
                        commentEn: metrics.commentEn || '',

                        weight: report.weight ? `${report.weight} kg` : '',

                        statusJp: report.status_training || '',
                        statusEn: metrics.statusEn || '',

                        targetJp: report.target || '',
                        targetEn: metrics.targetEn || '',

                        weightHistory: metrics.weightHistory || [],

                        mainPhoto: report.main_photo_url || horse?.photo_url || '',
                        originalPhoto: report.main_photo_url || horse?.photo_url || '',
                        logo: null
                    });

                    setReviewStatus(report.review_status || 'draft');
                    setLoading(false);
                }
            } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const msg = String(error?.message || '');
                const isAbort = msg.includes('AbortError');
                if (isAbort && isMounted) {
                    console.warn('Report load aborted; switching to raw fetch fallback');
                } else {
                    console.error("Error loading report data:", error);
                }

                // Retry logic (skip supabase retry if AbortError)
                if (!isAbort && isMounted && retryCount < 2) {
                    console.log(`Retrying report load... (${retryCount + 1})`);
                    setTimeout(() => fetchReportData(retryCount + 1), 500);
                } else if (isMounted && session?.access_token) {
                    // FALLBACK: Raw Fetch
                    try {
                        console.warn('Attempting raw fetch fallback for report editor...');
                        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
                        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
                        if (!supabaseUrl || !anonKey) throw new Error('Missing env vars');

                        const headers = {
                            'apikey': anonKey,
                            'Authorization': `Bearer ${session.access_token}`
                        };

                        if (isNew) {
                            // New Report Fallback
                            const params = new URLSearchParams(window.location.search);
                            const paramHorseId = params.get('horseId');
                            const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.');
                            const sixMonthsAgo = new Date();
                            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                            const sixMonthsAgoIso = encodeURIComponent(sixMonthsAgo.toISOString());

                            if (paramHorseId) {
                                if (isMounted) setHorseId(paramHorseId);
                                const [horseRes, reportsRes] = await Promise.all([
                                    fetch(`${supabaseUrl}/rest/v1/horses?id=eq.${paramHorseId}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`, { headers }),
                                    fetch(`${supabaseUrl}/rest/v1/horse_weights?horse_id=eq.${paramHorseId}&measured_at=gte.${sixMonthsAgoIso}&select=measured_at,weight&order=measured_at.asc`, { headers })
                                ]);

                                if (horseRes.ok && reportsRes.ok) {
                                    const hData = await horseRes.json();
                                    const rData = await reportsRes.json();
                                    const horse = hData[0];

                                    const weightUrl = `${supabaseUrl}/rest/v1/horse_weights?horse_id=eq.${paramHorseId}&select=weight,measured_at&order=measured_at.desc&limit=1`;
                                    const weightRes = await fetch(weightUrl, { headers });
                                    const weightData = weightRes.ok ? await weightRes.json() : [];
                                    const latestWeight = weightData?.[0]?.weight ?? null;

                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    const weightHistory = rData.map((r: any) => ({
                                        label: `${new Date(r.measured_at).getMonth() + 1}月`,
                                        value: r.weight || 0
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    })).filter((item: any) => item.value > 0) || [];

                                    if (isMounted) {
                                        setInitialData({
                                            reportDate: defaultDate,
                                            horseNameJp: horse?.name || '',
                                            horseNameEn: horse?.name_en || '',
                                            sire: horse?.sire || '',
                                            sireEn: horse?.sire_en || '',
                                            sireJp: horse?.sire || '',
                                            dam: horse?.dam || '',
                                            damEn: horse?.dam_en || '',
                                            damJp: horse?.dam || '',
                                            ownerName: horse?.clients?.name || '',
                                            trainerNameJp: horse?.trainers?.trainer_name || '',
                                            trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                            trainerLocation: horse?.trainers?.trainer_location || '',
                                            birthDate: horse?.birth_date || '',
                                            age: calculateHorseAge(horse?.birth_date),
                                            outputMode: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode),
                                            showLogo: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode) !== 'print',
                                            mainPhoto: horse?.photo_url || '',
                                            originalPhoto: horse?.photo_url || '',
                                            statusEn: 'Training', statusJp: '調整中',
                                            weight: latestWeight !== null ? `${latestWeight} kg` : '', targetEn: '', targetJp: '',
                                            commentEn: '', commentJp: '',
                                            weightHistory: weightHistory
                                        });
                                        setLoading(false);
                                    }
                                }
                            } else {
                                // List horses fallback
                                const res = await fetch(`${supabaseUrl}/rest/v1/horses?select=id,name,name_en&order=name`, { headers });
                                if (res.ok) {
                                    const allHorses = await res.json();
                                    if (isMounted) {
                                        setHorses(allHorses);
                                        setShowHorseSelector(true);
                                        setLoading(false);
                                    }
                                }
                            }
                        } else {
                            // Edit Report Fallback
                            const reportRes = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}&select=*`, { headers });
                            if (!reportRes.ok) throw new Error("Report fetch failed");
                            const rData = await reportRes.json();
                            const report = rData[0];
                            if (!report) throw new Error("Report not found");

                            const horseRes = await fetch(`${supabaseUrl}/rest/v1/horses?id=eq.${report.horse_id}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,trainer_location_en,report_output_mode)`, { headers });
                            const hData = await horseRes.json();
                            const horse = hData[0];

                            if (isMounted) {
                                setHorseId(report.horse_id);
                                const metrics = report.metrics_json || {};
                                const resolvedMode = resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode);
                                const showLogo = metrics.showLogo ?? (resolvedMode !== 'print');
                                setInitialData({
                                    reportDate: report.title || new Date(report.created_at).toISOString().slice(0, 7).replace('-', '.'),
                                    horseNameJp: horse?.name || '',
                                    horseNameEn: horse?.name_en || '',
                                    sire: horse?.sire || '',
                                    sireEn: horse?.sire_en || metrics.sireEn || '',
                                    sireJp: horse?.sire || metrics.sireJp || '',
                                    dam: horse?.dam || '',
                                    damEn: horse?.dam_en || metrics.damEn || '',
                                    damJp: horse?.dam || metrics.damJp || '',
                                    ownerName: horse?.clients?.name || '',
                                    trainerNameJp: horse?.trainers?.trainer_name || '',
                                    trainerNameEn: horse?.trainers?.trainer_name_en || '',
                                    trainerLocation: horse?.trainers?.trainer_location || '',
                                    trainerLocationEn: horse?.trainers?.trainer_location_en || '',
                                    birthDate: horse?.birth_date || '',
                                    age: calculateHorseAge(horse?.birth_date),
                                    outputMode: resolvedMode,
                                    showLogo: showLogo,
                                    commentJp: report.body || '',
                                    commentEn: metrics.commentEn || '',
                                    weight: report.weight ? `${report.weight} kg` : '',
                                    statusJp: report.status_training || '',
                                    statusEn: metrics.statusEn || '',
                                    targetJp: report.target || '',
                                    targetEn: metrics.targetEn || '',
                                    weightHistory: metrics.weightHistory || [],
                                    mainPhoto: report.main_photo_url || horse?.photo_url || '',
                                    originalPhoto: report.main_photo_url || horse?.photo_url || '',
                                    logo: null
                                });
                                setReviewStatus(report.review_status || 'draft');
                                setLoading(false);
                            }
                        }
                    } catch (fallbackError) {
                        console.error('Fallback failed:', fallbackError);
                        if (isMounted) setLoading(false);
                    }
                } else if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchReportData();
        return () => { isMounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, isNew, user?.id, session?.access_token, refreshKey]);

    const handleSelectHorse = async (selectedHorseId: string) => {
        setHorseId(selectedHorseId);
        setShowHorseSelector(false);
        setLoading(true);
        const defaultDate = new Date().toISOString().slice(0, 7).replace('-', '.');
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const sixMonthsAgoIso = sixMonthsAgo.toISOString();

        // Fetch horse details
        const horseArr = await restGet(`horses?id=eq.${selectedHorseId}&select=*,clients(name,report_output_mode),trainers(trainer_name,trainer_name_en,trainer_location,report_output_mode)`);
        const horse = horseArr?.[0];

        // Fetch past weight history (last 6 months)
        const weights = await restGet(`horse_weights?horse_id=eq.${selectedHorseId}&measured_at=gte.${encodeURIComponent(sixMonthsAgoIso)}&select=measured_at,weight&order=measured_at.asc`);

        const latestWeight = await fetchLatestWeight(selectedHorseId);

        const weightHistory = weights?.map((r: { measured_at: string; weight: number | null }) => {
            const d = new Date(r.measured_at);
            return {
                label: `${d.getMonth() + 1}月`,
                value: r.weight || 0
            };
        }).filter((item: { value: number }) => item.value > 0) || [];

        setInitialData({
            reportDate: defaultDate,
            horseNameJp: horse?.name || '',
            horseNameEn: horse?.name_en || '',
            sire: horse?.sire || '',
            sireEn: horse?.sire_en || '',
            sireJp: horse?.sire || '',
            dam: horse?.dam || '',
            damEn: horse?.dam_en || '',
            damJp: horse?.dam || '',
            ownerName: horse?.clients?.name || '',
            trainerNameJp: horse?.trainers?.trainer_name || '',
            trainerNameEn: horse?.trainers?.trainer_name_en || '',
            trainerLocation: horse?.trainers?.trainer_location || '',
            trainerLocationEn: horse?.trainers?.trainer_location_en || '',
            birthDate: horse?.birth_date || '',
            age: calculateHorseAge(horse?.birth_date),
            outputMode: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode),
            showLogo: resolveOutputMode(horse?.clients?.report_output_mode, horse?.trainers?.report_output_mode) !== 'print',
            mainPhoto: horse?.photo_url || '',
            originalPhoto: horse?.photo_url || '',
            statusEn: 'Training', statusJp: '調整中',
            weight: latestWeight !== null ? `${latestWeight} kg` : '', targetEn: '', targetJp: '',
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

        console.log('[save] start', { id, horseId, isNew });
        setSaving(true);
        const d = reportDataRef.current;
        const saveTimeout = window.setTimeout(() => {
            console.warn('Save timed out, resetting UI');
            setSaving(false);
            alert('Save is taking too long. Please try again.');
        }, 25000);

        let mainPhotoUrl = d.mainPhoto;
        const isNewPhoto = !!d.mainPhoto && (d.mainPhoto.startsWith('data:') || d.mainPhoto.startsWith('blob:'));
        const isSameAsOriginal = !!d.originalPhoto && d.mainPhoto === d.originalPhoto;
        // const logoUrl = d.logo; // Unused

        try {
            console.log('[save] using REST for save');

            // Check if mainPhoto is new (Base64 or Blob) - only upload if changed
            if (isNewPhoto && !isSameAsOriginal) {
                console.log('[save] uploading photo');
                const fileName = `main_${Date.now()}.jpg`;
                const reportPathId = isNew ? `temp_${Date.now()}` : id;
                const path = `${horseId}/${reportPathId}/${fileName}`;
                const uploadResult = await Promise.race([
                    uploadImage(d.mainPhoto, path),
                    new Promise<{ url: string | null, error: unknown }>((_, reject) =>
                        setTimeout(() => reject(new Error('Upload timeout')), 12000)
                    )
                ]);
                const { url: uploadedUrl, error: uploadError } = uploadResult as { url: string | null, error: unknown };
                if (uploadedUrl) {
                    mainPhotoUrl = uploadedUrl;
                } else {
                    const errorMsg = (uploadError as { message?: string })?.message || JSON.stringify(uploadError) || "Unknown Error";
                    alert(`Failed to upload image.\nError: ${errorMsg}\n\nPlease check Supabase Storage policies.`);
                    setSaving(false);
                    window.clearTimeout(saveTimeout);
                    return;
                }
                console.log('[save] upload done');
            } else if (isSameAsOriginal) {
                mainPhotoUrl = d.originalPhoto || d.mainPhoto;
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
            damJp: d.damJp,
            showLogo: d.showLogo ?? true
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

            let newReportId: string | null = null;
            console.log('[save] before reports write (REST)');
            const controller = new AbortController();
            const abortId = window.setTimeout(() => controller.abort(), 8000);
            const headers = getRestHeaders();
            if (isNew) {
                const res = await fetch(`${supabaseUrl}/rest/v1/reports`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                window.clearTimeout(abortId);
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`REST insert failed: ${res.status} ${text}`);
                }
                const data = await res.json();
                newReportId = data?.[0]?.id ?? null;
            } else {
                const res = await fetch(`${supabaseUrl}/rest/v1/reports?id=eq.${id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });
                window.clearTimeout(abortId);
                if (!res.ok) {
                    const text = await res.text();
                    throw new Error(`REST update failed: ${res.status} ${text}`);
                }
            }

            // Update Horse (Name/Sire/Dam/Photo if changed)
            // Do not block report save if horse update fails.
        if (horseId) {
            try {
                const headers = getRestHeaders();
                await fetch(`${supabaseUrl}/rest/v1/horses?id=eq.${horseId}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({
                        name: d.horseNameJp,
                        name_en: d.horseNameEn,
                        sire: d.sire,
                        dam: d.dam,
                        photo_url: mainPhotoUrl, // Sync latest photo to horse thumbnail
                        updated_at: new Date().toISOString()
                    })
                });
            } catch (horseUpdateError) {
                console.warn('Horse update failed:', horseUpdateError);
            }
        }

            setSaving(false);
            setLastSaved(new Date());

            if (isNew && newReportId) {
                router.replace(`/reports/${newReportId}`);
            } else {
                if (d.mainPhoto.startsWith('data:') || d.mainPhoto.startsWith('blob:')) {
                    if (reportDataRef.current) reportDataRef.current.mainPhoto = mainPhotoUrl;
                }
            }
        } catch (err) {
            console.error('Save failed:', err);
            alert('Save failed. Please try again.');
            setSaving(false);
        } finally {
            window.clearTimeout(saveTimeout);
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
                    <div className="flex justify-between items-center mb-3">
                        <h2 className="text-2xl font-bold text-[#1a3c34]">Select a Horse</h2>
                        <LanguageToggle />
                    </div>
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
