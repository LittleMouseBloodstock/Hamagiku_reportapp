import { translateName } from '@/lib/api';

export type ClientNameFields = {
    name: string;
    name_en: string;
};

const normalize = (value: string | null | undefined) => String(value || '').trim();

export async function ensureBilingualClientName(nameValue: string, nameEnValue: string): Promise<ClientNameFields> {
    let name = normalize(nameValue);
    let name_en = normalize(nameEnValue);

    if (!name && !name_en) {
        throw new Error('Client name is required in Japanese or English.');
    }

    if (!name) {
        const result = await translateName(name_en, 'ja', 'client');
        name = normalize(result?.translatedName);
    }

    if (!name_en) {
        const result = await translateName(name, 'en', 'client');
        name_en = normalize(result?.translatedName);
    }

    if (!name || !name_en) {
        throw new Error('Both Japanese and English client names are required. Translation returned no usable value.');
    }

    return { name, name_en };
}

export function getClientDisplayName(client: { name?: string | null; name_en?: string | null }, language: 'ja' | 'en') {
    const primary = language === 'ja' ? client.name : client.name_en;
    return normalize(primary) || normalize(language === 'ja' ? client.name_en : client.name) || '-';
}

export function splitClientNameInput(value: string, preferredLanguage: 'ja' | 'en'): ClientNameFields {
    const text = normalize(value);
    if (!text) return { name: '', name_en: '' };
    const hasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(text);
    if (hasJapanese || preferredLanguage === 'ja' && !/^[\x00-\x7F]+$/u.test(text)) {
        return { name: text, name_en: '' };
    }
    return { name: '', name_en: text };
}
