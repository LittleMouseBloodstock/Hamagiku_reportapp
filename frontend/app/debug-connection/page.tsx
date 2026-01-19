'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DebugConnectionPage() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [session, setSession] = useState<any>(null);

    const checkConnection = async () => {
        setLoading(true);
        setResult(null);
        try {
            // 1. Get Session
            const { data: { session: s }, error: sessErr } = await supabase.auth.getSession();
            setSession(s);

            // 2. Simple Fetch
            const { data, error, count } = await supabase
                .from('horses')
                .select('*', { count: 'exact' })
                .limit(5);

            setResult({
                fetchError: error,
                dataLength: data?.length,
                totalCount: count,
                firstItem: data?.[0],
                sessionError: sessErr
            });

        } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
            setResult({ exception: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 font-mono text-sm min-h-screen bg-white text-gray-900">
            <h1 className="text-xl font-bold mb-4 text-black">Supabase Connection Debugger</h1>

            <div className="mb-6 p-4 bg-gray-100 rounded text-gray-800 border border-gray-300">
                <p><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</p>
                <p><strong>Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10)}...</p>
            </div>

            <button
                onClick={checkConnection}
                className="bg-blue-600 text-white px-4 py-2 rounded mb-6 hover:bg-blue-700"
                disabled={loading}
            >
                {loading ? 'Checking...' : 'Run Connection Test'}
            </button>

            {session && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-900">
                    <p>✅ <strong>Auth:</strong> Logged in as {session.user.email}</p>
                    <p>ID: {session.user.id}</p>
                </div>
            )}

            {result && (
                <div className="p-4 border border-gray-300 rounded bg-white text-gray-700 overflow-auto">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}
