import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function getApiAuthHeaders() {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.access_token) {
        throw error || new Error('Authentication required');
    }
    return {
        Authorization: `Bearer ${data.session.access_token}`,
        'Content-Type': 'application/json'
    };
}

async function readApiResponse(res: Response) {
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(payload?.error || `API request failed (${res.status})`);
    }
    return payload;
}

export async function translateText(text: string, targetLang: 'ja' | 'en', reportType?: 'care' | 'status' | 'monthly') {
    const res = await fetch(`${API_URL}/translate`, {
        method: 'POST',
        headers: await getApiAuthHeaders(),
        body: JSON.stringify({ text, targetLang, reportType }),
    });
    return readApiResponse(res);
}

export async function generateContent(prompt: string, lang: 'ja' | 'en') {
    const res = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: await getApiAuthHeaders(),
        body: JSON.stringify({ prompt, lang }),
    });
    return readApiResponse(res);
}
