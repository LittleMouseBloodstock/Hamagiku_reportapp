const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function translateText(text: string, targetLang: 'ja' | 'en') {
    try {
        const res = await fetch(`${API_URL}/translate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, targetLang }),
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
