export type HorseSex = 'male' | 'female' | 'gelding' | '';

export function normalizeHorseSex(value?: string | null): HorseSex {
    const normalized = String(value || '').trim().toLowerCase();

    if (!normalized) return '';
    if (['male', 'm', 'colt', 'horse', '牡'].includes(normalized)) return 'male';
    if (['female', 'f', 'filly', 'mare', '牝'].includes(normalized)) return 'female';
    if (['gelding', 'gelding', '騸'].includes(normalized)) return 'gelding';

    return '';
}

export function getRacehorseAge(birthDate?: string | null, reportDate?: string | null): number | null {
    const birthYear = parseInt(String(birthDate || '').slice(0, 4), 10);
    if (!birthYear) return null;

    const reportYearMatch = String(reportDate || '').replace(/\//g, '.').replace(/-/g, '.').match(/^(\d{4})/);
    const reportYear = reportYearMatch ? parseInt(reportYearMatch[1], 10) : new Date().getFullYear();

    if (!reportYear || reportYear < birthYear) return null;
    return reportYear - birthYear;
}

export function getHorseSexLabel(value: HorseSex, language: 'ja' | 'en'): string {
    if (language === 'ja') {
        if (value === 'male') return '牡';
        if (value === 'female') return '牝';
        if (value === 'gelding') return '騸';
        return '';
    }

    if (value === 'male') return 'Colt';
    if (value === 'female') return 'Filly';
    if (value === 'gelding') return 'Gelding';
    return '';
}

export function formatHorseSexAge(
    sexValue?: string | null,
    birthDate?: string | null,
    reportDate?: string | null,
    language: 'ja' | 'en' = 'ja',
): string {
    const sex = normalizeHorseSex(sexValue);
    const sexLabel = getHorseSexLabel(sex, language);
    const age = getRacehorseAge(birthDate, reportDate);

    if (sexLabel && age !== null) {
        return language === 'ja' ? `${sexLabel} ${age}歳` : `${sexLabel} / ${age}YO`;
    }

    if (sexLabel) return sexLabel;
    if (age !== null) return language === 'ja' ? `${age}歳` : `${age}YO`;
    return '';
}
