import { supabase } from '@/lib/supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const SESSION_TIMEOUT_MS = 10000;
const AI_REQUEST_TIMEOUT_MS = 90000;

export async function getApiAuthHeaders() {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
        const { data, error } = await Promise.race([
            supabase.auth.getSession(),
            new Promise<never>((_, reject) => {
                timeoutId = setTimeout(
                    () => reject(new Error('Authentication check timed out. Please reload the page and try again.')),
                    SESSION_TIMEOUT_MS
                );
            })
        ]);

        if (error || !data.session?.access_token) {
            throw error || new Error('Authentication required. Please sign in again.');
        }
        return {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json'
        };
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

async function readApiResponse(res: Response) {
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(payload?.error || `API request failed (${res.status})`);
    }
    return payload;
}

async function fetchApi(path: string, init: RequestInit, timeoutMs = AI_REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal });
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error('Generation timed out. Please try again.');
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
}

export async function translateText(text: string, targetLang: 'ja' | 'en', reportType?: 'care' | 'status' | 'monthly') {
    const res = await fetchApi('/translate', {
        method: 'POST',
        headers: await getApiAuthHeaders(),
        body: JSON.stringify({ text, targetLang, reportType }),
    });
    return readApiResponse(res);
}

export async function generateContent(prompt: string, lang: 'ja' | 'en') {
    const res = await fetchApi('/generate', {
        method: 'POST',
        headers: await getApiAuthHeaders(),
        body: JSON.stringify({ prompt, lang }),
    });
    return readApiResponse(res);
}

export async function generateStatusReport(notes: string) {
    const res = await fetchApi('/generate-departure', {
        method: 'POST',
        headers: await getApiAuthHeaders(),
        body: JSON.stringify({ notes, reportType: 'status' }),
    }, 150000);
    return readApiResponse(res);
}
