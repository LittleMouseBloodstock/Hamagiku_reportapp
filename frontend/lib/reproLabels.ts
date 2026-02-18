type Lang = 'ja' | 'en';

type LabelMap = Record<string, { ja: string; en: string }>;

const cervix: LabelMap = {
    tight: { ja: '閉', en: 'T' },
    moderate: { ja: '中', en: 'M' },
    lax: { ja: '開', en: 'L' }
};

const uterusFlags: LabelMap = {
    edema: { ja: '浮', en: 'Ed' },
    fluid: { ja: '液', en: 'Fl' }
};

const uterusTone: LabelMap = {
    low: { ja: '低', en: 'Lo' },
    high: { ja: '高', en: 'Hi' }
};

const ovaryTypes: LabelMap = {
    follicle: { ja: '卵', en: 'Fol' },
    CL: { ja: '黄', en: 'CL' }
};

const palpation: LabelMap = {
    soft: { ja: '柔', en: 'Sof' },
    firm: { ja: '硬', en: 'Fir' }
};

const interventions: LabelMap = {
    deslorelin: { ja: 'デ', en: 'Des' },
    mating: { ja: '種', en: 'Mat' },
    altrenogest: { ja: 'レ', en: 'Reg' },
    induction: { ja: '誘', en: 'Ind' },
    ovulation: { ja: '排', en: 'Ov' }
};

export function shortLabel(map: LabelMap, lang: Lang, code?: string | null): string {
    if (!code) return '-';
    const entry = map[code];
    if (!entry) return code;
    return entry[lang];
}

export function uterusShort(
    lang: Lang,
    flags: { edema?: boolean; fluid?: boolean } = {},
    tone?: string | null
): string {
    const parts: string[] = [];
    if (flags.edema) parts.push(uterusFlags.edema[lang]);
    if (flags.fluid) parts.push(uterusFlags.fluid[lang]);
    if (tone && uterusTone[tone]) parts.push(uterusTone[tone][lang]);
    if (parts.length === 0) return '-';
    return parts.join(' ');
}

export const labelMaps = {
    cervix,
    uterusFlags,
    uterusTone,
    ovaryTypes,
    palpation,
    interventions
};
