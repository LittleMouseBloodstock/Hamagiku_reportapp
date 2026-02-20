'use client';

export type RestHeaders = {
    apikey: string;
    Authorization: string;
    'Content-Type': string;
    Prefer?: string;
};

export const getSupabaseRestEnv = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing env vars for REST');
    }
    return { supabaseUrl, supabaseAnonKey };
};

export const buildRestHeaders = (options?: { prefer?: string; bearerToken?: string }): RestHeaders => {
    const { supabaseAnonKey } = getSupabaseRestEnv();
    const token = options?.bearerToken || supabaseAnonKey;
    return {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options?.prefer ? { Prefer: options.prefer } : {})
    };
};

export const restGet = async (path: string, headers?: RestHeaders) => {
    const { supabaseUrl } = getSupabaseRestEnv();
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, { headers: headers || buildRestHeaders() });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`REST GET failed: ${res.status} ${text}`);
    }
    return res.json();
};

export const restPost = async (path: string, body: unknown, headers?: RestHeaders) => {
    const { supabaseUrl } = getSupabaseRestEnv();
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: 'POST',
        headers: headers || buildRestHeaders({ prefer: 'return=representation' }),
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`REST POST failed: ${res.status} ${text}`);
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
};

export const restPatch = async (path: string, body: unknown, headers?: RestHeaders) => {
    const { supabaseUrl } = getSupabaseRestEnv();
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: 'PATCH',
        headers: headers || buildRestHeaders({ prefer: 'return=representation' }),
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`REST PATCH failed: ${res.status} ${text}`);
    }
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
};

export const restDelete = async (path: string, headers?: RestHeaders) => {
    const { supabaseUrl } = getSupabaseRestEnv();
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: 'DELETE',
        headers: headers || buildRestHeaders()
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`REST DELETE failed: ${res.status} ${text}`);
    }
    return true;
};

export const restCount = async (path: string, headers?: RestHeaders) => {
    const { supabaseUrl } = getSupabaseRestEnv();
    const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
        method: 'HEAD',
        headers: {
            ...(headers || buildRestHeaders()),
            Prefer: 'count=exact'
        }
    });
    if (!res.ok) return 0;
    const range = res.headers.get('content-range') || '';
    const total = range.split('/')[1];
    return Number(total || 0);
};
