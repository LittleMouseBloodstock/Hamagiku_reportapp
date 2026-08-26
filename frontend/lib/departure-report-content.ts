export const DEPARTURE_CLOSING_MESSAGE_VERSION = 1;

export const DEFAULT_DEPARTURE_CLOSING_MESSAGE = Object.freeze({
    jp: '本馬の安全と今後の活躍を心よりお祈り申し上げます。',
    en: 'We sincerely wish this horse safety, good health, and continued success.',
});

export function resolveDepartureClosingMessage(value: { jp?: string | null; en?: string | null }) {
    return {
        jp: String(value.jp || '').trim() || DEFAULT_DEPARTURE_CLOSING_MESSAGE.jp,
        en: String(value.en || '').trim() || DEFAULT_DEPARTURE_CLOSING_MESSAGE.en,
    };
}
