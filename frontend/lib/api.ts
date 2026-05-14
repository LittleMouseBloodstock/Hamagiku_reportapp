const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export type GenerateReportV2Payload = {
    workspaceId: string;
    userId: string;
    reportId?: string | null;
    horseId?: string | null;
    clientId?: string | null;
    audienceType: string;
    reportType: string;
    outputMode?: 'japanese_only' | 'english_only' | 'bilingual';
    language: 'ja' | 'en';
    recipientName?: string | null;
    sourceFacts?: Record<string, unknown>;
    draftText?: string;
};

export async function translateText(text: string, targetLang: 'ja' | 'en', userId: string) {
    try {
        const res = await fetch(`${API_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLang, userId }),
        });
        return await res.json();
    } catch (e) {
        console.error("Translation Error:", e);
        return null;
    }
}

export async function generateContent(prompt: string, lang: 'ja' | 'en', apiKey?: string) {
    // Note: In a real app, apiKey should be handled securely on backend.
    // Here we pass it if user provides it on frontend for flexibility as per report.html logic,
    // but ideally backend holds the key.
    try {
        const res = await fetch(`${API_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, lang, apiKey }),
        });
        return await res.json();
    } catch (e) {
        console.error("Content Generation Error:", e);
        return null;
    }
}

export async function generateReportV2(payload: GenerateReportV2Payload) {
    try {
        const res = await fetch(`${API_URL}/reports/generate-v2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(data?.error || `HTTP ${res.status}`);
        }
        return data;
    } catch (e) {
        console.error("V2 Report Generation Error:", e);
        throw e;
    }
}

export async function syncWorkspaceInvite(accessToken: string) {
    const res = await fetch(`${API_URL}/workspace/sync-invite`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
}

export async function inviteWorkspaceUser(
    accessToken: string,
    payload: { email: string; role: 'user' | 'admin' }
) {
    const res = await fetch(`${API_URL}/workspace/invite-user`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
    }
    return data;
}

export async function submitReportFeedback(reportDocumentId: string, payload: Record<string, unknown>) {
    try {
        const res = await fetch(`${API_URL}/reports/${reportDocumentId}/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(data?.error || `HTTP ${res.status}`);
        }
        return data;
    } catch (e) {
        console.error("Report Feedback Error:", e);
        throw e;
    }
}
