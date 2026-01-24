/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import { MOCK_HORSES, MOCK_REPORTS, MOCK_CLIENTS } from './mockData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// DEMO MODE CHECK
// Check localStorage if available (client-side)
const isBrowser = typeof window !== 'undefined';
const DEMO_MODE = (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') || (isBrowser && (sessionStorage.getItem('DEMO_MODE') === 'true' || localStorage.getItem('DEMO_MODE') === 'true'));

class MockSupabaseClient {
    constructor() { }

    from(table: string) {
        return new MockQueryBuilder(table);
    }
}

class MockQueryBuilder {
    table: string;
    data: any[];

    constructor(table: string) {
        this.table = table;
        this.data = this.getData(table);
    }

    getData(table: string) {
        if (table === 'horses') return MOCK_HORSES;
        if (table === 'reports') return MOCK_REPORTS;
        if (table === 'clients') return MOCK_CLIENTS;
        if (table === 'allowed_users') return [{ email: 'demo@example.com' }];
        return [];
    }

    select(query?: string, options?: any) {
        // Basic approximation: return all data
        // If count is requested (HEAD)
        if (options?.head || (options?.count === 'exact' && options?.head)) {
            return {
                data: null,
                error: null,
                count: this.data.length,
                status: 200,
                headers: { get: (k: string) => k === 'content-range' ? `0-${this.data.length - 1}/${this.data.length}` : null }
            };
        }

        // Special check for allowed_users count query in AuthContext
        if (this.table === 'allowed_users' && options?.count === 'exact') {
            return {
                data: this.data,
                error: null,
                count: this.data.length,
            };
        }

        // If query implies specific filtering, we might need to handle it.
        // For now, chaining simply returns this builder, and 'then' or await returns data.
        return this;
    }

    eq(column: string, value: any) {
        this.data = this.data.filter(item => item[column] == value);
        return this;
    }

    order(column: string, options?: any) {
        // Simple mock sort
        this.data.sort((a, b) => {
            if (options?.ascending === false) return a[column] < b[column] ? 1 : -1;
            return a[column] > b[column] ? 1 : -1;
        });
        return this;
    }

    delete() {
        // Mock delete - generally requires 'eq' first
        return this;
    }

    then(resolve: any, reject: any) {
        // Resolve with { data, error }
        resolve({ data: this.data, error: null, count: this.data.length });
    }
}

class MockAuth {
    onAuthStateChange(callback: any) {
        // Simulate immediate sign-in for demo
        const demoUser = { id: 'demo-user', email: 'demo@example.com' };
        const demoSession = { user: demoUser, access_token: 'demo-token' };

        // Async callback to mimic real lifecycle
        setTimeout(() => {
            callback('INITIAL_SESSION', demoSession);
        }, 100);

        return { data: { subscription: { unsubscribe: () => { } } } };
    }

    async getSession() {
        const demoUser = { id: 'demo-user', email: 'demo@example.com' };
        return { data: { session: { user: demoUser, access_token: 'demo-token' } }, error: null };
    }

    async signOut() {
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem('DEMO_MODE');
            location.reload();
        }
        return { error: null };
    }
}

let client;

if (DEMO_MODE) {
    console.log('[MockSupabase] Demo Mode Activated');
    client = new MockSupabaseClient() as any;
    client.auth = new MockAuth();
} else {
    // Fallback to real client, but handle missing keys if in dev without env
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Missing Supabase URL/Key, falling back to MOCK for safety (or erroring)');
        // For user safety in this incomplete env, maybe default to Mock?
        // But let's error if strict.
        // throw new Error('Missing Supabase URL or Anon Key');
        // BETTER: Default to mock if missing env, so it works out of the box
        console.log('[MockSupabase] Missing Env, defaulting to Demo Mode');
        client = new MockSupabaseClient() as any;
        client.auth = new MockAuth();
    } else {
        client = createClient(supabaseUrl, supabaseAnonKey);
    }
}

export const supabase = client;
