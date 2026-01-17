'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
export const runtime = 'edge';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import ReportTemplate, { ReportData } from '@/components/ReportTemplate';
import { ArrowLeft, Save, Printer, Check, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import LanguageToggle from '@/components/LanguageToggle';

export default function ReportEditor() {
    const { id } = useParams();
    const router = useRouter();
    const isNew = id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Initial Data for Template
    const [initialData, setInitialData] = useState<Partial<ReportData>>({});
    const [horseId, setHorseId] = useState<string | null>(null);

    // Horse Selection (for New Reports)
    const [showHorseSelector, setShowHorseSelector] = useState(false);
    const [horses, setHorses] = useState<{ id: string, name: string }[]>([]);

    // Current Data (Synced from Child)
    const reportDataRef = useRef<ReportData | null>(null);

    useEffect(() => {
        if (!id) return;

        const fetchReportData = async () => {
            if (isNew) {
                // Determine horseId from URL params (if linked from Horse Detail)
                const params = new URLSearchParams(window.location.search);
                const paramHorseId = params.get('horseId');

                if (paramHorseId) {
                    setHorseId(paramHorseId);
                    // Fetch horse details to prepopulate
                    const { data: horse } = await supabase.from('horses').select('*').eq('id', paramHorseId).single();
                    setInitialData({
                        horseName: horse?.name || '',
                        horseNameEn: horse?.name_en || '',
                        sire: horse?.sire || '',
                        dam: horse?.dam || '',
                        mainPhoto: horse?.photo_url || '',
                        weight: '', training: '', condition: '', target: '', comment: ''
                    });
                    setLoading(false);
                } else {
                    // No horse selected, fetch list and show selector
                    const { data: allHorses } = await supabase.from('horses').select('id, name').order('name');
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
                // Handle 404 gracefully?
                return;
            }

            // Fetch Horse Data
            const { data: horse } = await supabase.from('horses').select('*').eq('id', report.horse_id).single();

            setHorseId(report.horse_id);

            // Map DB to ReportData
            setInitialData({
                horseName: horse?.name || '',
                horseNameEn: horse?.name_en || '',
                sire: horse?.sire || '',
                dam: horse?.dam || '',
                comment: report.body || '',
                weight: report.weight ? `${report.weight} kg` : '',
                training: report.status_training || '',
                condition: report.condition || '',
                target: report.target || '',
                mainPhoto: report.main_photo_url || horse?.photo_url || '',
                logo: null
            });

            setLoading(false);
        };

        fetchReportData();
    }, [id, isNew]);

    const handleSelectHorse = async (selectedHorseId: string) => {
        setHorseId(selectedHorseId);
        setShowHorseSelector(false);
        setLoading(true);
        // Fetch horse details
        const { data: horse } = await supabase.from('horses').select('*').eq('id', selectedHorseId).single();
        setInitialData({
            horseName: horse?.name || '',
            horseNameEn: horse?.name_en || '',
            sire: horse?.sire || '',
            dam: horse?.dam || '',
            mainPhoto: horse?.photo_url || '',
            weight: '', training: '', condition: '', target: '', comment: ''
        });
        setLoading(false);
    };

    const handleDataChange = useCallback((data: ReportData) => {
        reportDataRef.current = data;
    }, []);

    async function uploadImage(base64Data: string, path: string): Promise<string | null> {
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
                return null;
            }

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('report-assets')
                .getPublicUrl(path);

            return publicUrl;
        } catch (e) {
            console.error("Image Processing Error:", e);
            return null;
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
            // If new, temporary ID usage might be tricky for path, but we can use 'new' folder or just horseId
            // Better to use a UUID if creating new... but let's stick to simple path for now.
            // If ID is new, we don't have a report ID yet.
            // We can generate one or just use a timestamp in path.
            const reportPathId = isNew ? `temp_${Date.now()}` : id;
            const path = `${horseId}/${reportPathId}/${fileName}`;

            const uploadedUrl = await uploadImage(d.mainPhoto, path);
            if (uploadedUrl) mainPhotoUrl = uploadedUrl;
        }

        const payload = {
            horse_id: horseId, // Ensure horse_id is set
            body: d.comment,
            weight: parseFloat(d.weight.replace(/[^0-9.]/g, '') || '0'),
            status_training: d.training,
            condition: d.condition,
            target: d.target,
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
                name: d.horseName,
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
            // Redirect to the new ID so future saves are updates
            router.replace(`/reports/${newReportId}`);
        } else {
            if (d.mainPhoto.startsWith('data:')) {
                if (reportDataRef.current) reportDataRef.current.mainPhoto = mainPhotoUrl;
            }
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading Report...</div>;

    if (showHorseSelector) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 font-sans">
                <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Select a Horse</h2>
                    <p className="text-gray-500 mb-6 text-sm">Please select a horse to create a report for.</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {horses.map(h => (
                            <button
                                key={h.id}
                                onClick={() => handleSelectHorse(h.id)}
                                className="w-full text-left p-3 hover:bg-gray-50 border rounded transition-colors"
                            >
                                {h.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center py-4 sm:py-8 font-sans print:py-0 print:block bg-gray-100">
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
                    <button
                        onClick={saveReport}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all flex-1 sm:flex-initial justify-center"
                    >
                        {saving ? <UploadCloud size={16} className="animate-bounce" /> : <Save size={16} />}
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-[var(--color-accent)] hover:brightness-110 text-white px-3 py-2 sm:px-4 rounded text-sm font-bold flex items-center gap-2 transition-all flex-1 sm:flex-initial justify-center"
                    >
                        <Printer size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Main Report Wrapper for Mobile Scrolling */}
            <div className="w-full overflow-x-auto pb-10 px-0 sm:px-4 flex justify-center no-scrollbar">
                <div className="min-w-[210mm] origin-top scale-[0.45] sm:scale-75 md:scale-100 transition-transform duration-300">
                    <ReportTemplate initialData={initialData} onDataChange={handleDataChange} />
                </div>
            </div>

            {/* Mobile Scale Hint */}
            <p className="sm:hidden text-xs text-gray-400 mt-[-50%] text-center no-print">
                Preview scaled for mobile. PDF output will be A4.
            </p>
        </div>
    );
}
