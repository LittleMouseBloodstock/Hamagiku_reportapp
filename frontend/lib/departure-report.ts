import type { DepartureReportData } from '@/components/DepartureReportTemplate';
import {
    translateDepartureFields,
    type DepartureTranslationRequest,
    type DepartureTranslationFieldKey,
} from '@/lib/api';

type BilingualField = {
    key: DepartureTranslationFieldKey;
    jpKey: DepartureTextFieldKey;
    enKey: DepartureTextFieldKey;
};

type DepartureTextFieldKey =
    | 'farrierJp' | 'farrierEn'
    | 'wormingJp' | 'wormingEn'
    | 'feedingJp' | 'feedingEn'
    | 'exerciseJp' | 'exerciseEn'
    | 'commentJp' | 'commentEn';

export const DEPARTURE_BILINGUAL_FIELDS: BilingualField[] = [
    { key: 'farrier', jpKey: 'farrierJp', enKey: 'farrierEn' },
    { key: 'worming', jpKey: 'wormingJp', enKey: 'wormingEn' },
    { key: 'feeding', jpKey: 'feedingJp', enKey: 'feedingEn' },
    { key: 'exercise', jpKey: 'exerciseJp', enKey: 'exerciseEn' },
    { key: 'comment', jpKey: 'commentJp', enKey: 'commentEn' },
];

const textValue = (value: unknown) => String(value || '').trim();

export function getDepartureTranslationRequests(
    data: Partial<DepartureReportData>,
): DepartureTranslationRequest[] {
    return DEPARTURE_BILINGUAL_FIELDS.flatMap<DepartureTranslationRequest>(({ key, jpKey, enKey }) => {
        const jp = textValue(data[jpKey]);
        const en = textValue(data[enKey]);

        if (jp && !en) {
            return [{ key, text: jp, sourceLang: 'ja', targetLang: 'en' }];
        }
        if (en && !jp) {
            return [{ key, text: en, sourceLang: 'en', targetLang: 'ja' }];
        }
        return [];
    });
}

export function getDepartureTranslationStatus(data: Partial<DepartureReportData>) {
    let complete = 0;
    let pending = 0;
    let empty = 0;

    DEPARTURE_BILINGUAL_FIELDS.forEach(({ jpKey, enKey }) => {
        const jp = textValue(data[jpKey]);
        const en = textValue(data[enKey]);
        if (jp && en) complete += 1;
        else if (jp || en) pending += 1;
        else empty += 1;
    });

    return {
        total: DEPARTURE_BILINGUAL_FIELDS.length,
        complete,
        pending,
        empty,
    };
}

export async function fillMissingDepartureTranslations(data: DepartureReportData) {
    const requests = getDepartureTranslationRequests(data);
    if (!requests.length) {
        return { data, requests, translatedKeys: [] as DepartureTranslationFieldKey[] };
    }

    const response = await translateDepartureFields(requests);
    const nextData: DepartureReportData = { ...data };
    const translatedKeys: DepartureTranslationFieldKey[] = [];

    requests.forEach((request) => {
        const field = DEPARTURE_BILINGUAL_FIELDS.find((candidate) => candidate.key === request.key);
        const translated = textValue(response.translations?.[request.key]);
        if (!field || !translated) {
            throw new Error(`Translation was not returned for ${request.key}.`);
        }

        const targetKey = request.targetLang === 'ja' ? field.jpKey : field.enKey;
        if (!textValue(nextData[targetKey])) {
            nextData[targetKey] = translated;
            translatedKeys.push(request.key);
        }
    });

    return { data: nextData, requests, translatedKeys };
}
