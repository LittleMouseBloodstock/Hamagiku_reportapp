import { supabase } from '@/lib/supabase';

const REPORT_ASSET_BUCKET = 'report-assets';

function tryDecode(value: string) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export function extractReportAssetPath(assetRef?: string | null) {
    if (!assetRef) return null;

    if (!assetRef.startsWith('http')) {
        return assetRef.replace(new RegExp(`^${REPORT_ASSET_BUCKET}/`), '');
    }

    const publicMarker = `/storage/v1/object/public/${REPORT_ASSET_BUCKET}/`;
    const signMarker = `/storage/v1/object/sign/${REPORT_ASSET_BUCKET}/`;

    const marker = assetRef.includes(publicMarker)
        ? publicMarker
        : assetRef.includes(signMarker)
            ? signMarker
            : null;

    if (!marker) return null;

    const pathWithQuery = assetRef.split(marker)[1];
    if (!pathWithQuery) return null;

    return tryDecode(pathWithQuery.split('?')[0]);
}

export async function resolveReportAssetUrl(assetRef?: string | null, expiresIn = 60 * 60) {
    if (!assetRef) return null;

    const path = extractReportAssetPath(assetRef);
    if (!path) return assetRef;

    const { data, error } = await supabase.storage
        .from(REPORT_ASSET_BUCKET)
        .createSignedUrl(path, expiresIn);

    if (error) {
        console.error('Failed to create signed URL for report asset:', error);
        return assetRef.startsWith('http') ? assetRef : null;
    }

    return data.signedUrl;
}

export async function uploadReportAsset(path: string, blob: Blob) {
    const { error } = await supabase.storage
        .from(REPORT_ASSET_BUCKET)
        .upload(path, blob, { upsert: true });

    if (error) {
        return { path: null, signedUrl: null, error };
    }

    const signedUrl = await resolveReportAssetUrl(path);
    return { path, signedUrl, error: null };
}
