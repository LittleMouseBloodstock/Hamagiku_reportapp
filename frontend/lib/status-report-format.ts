export type StatusReportLanguage = 'ja' | 'en';

export type LegacyStatusFields = {
    assessment?: string;
    management?: string;
    nextSteps?: string;
    comment?: string;
};

export type ParsedStatusSection = {
    number: number | null;
    heading: string;
    paragraphs: string[];
};

const SECTION_HEADING_PATTERN = /^\s*(\d+)\s*[.．、]\s*(.+?)\s*$/;

const LEGACY_HEADINGS: Record<StatusReportLanguage, Array<[keyof LegacyStatusFields, string]>> = {
    ja: [
        ['assessment', '現在の状態'],
        ['management', '治療・管理'],
        ['nextSteps', '今後の方針'],
        ['comment', '総括'],
    ],
    en: [
        ['assessment', 'Current condition'],
        ['management', 'Treatment and management'],
        ['nextSteps', 'Next steps'],
        ['comment', 'Summary'],
    ],
};

export function buildLegacyStatusNarrative(
    language: StatusReportLanguage,
    fields: LegacyStatusFields
) {
    const separator = language === 'ja' ? '．' : '. ';
    return LEGACY_HEADINGS[language]
        .map(([key, heading]) => ({
            heading,
            body: String(fields[key] || '').trim(),
        }))
        .filter((section) => section.body)
        .map((section, index) => (
            `${index + 1}${separator}${section.heading}\n${section.body}`
        ))
        .join('\n\n');
}

export function parseStatusNarrative(value: string): ParsedStatusSection[] {
    const normalized = String(value || '').replace(/\r\n/g, '\n').trim();
    if (!normalized) return [];

    const sections: ParsedStatusSection[] = [];
    let current: ParsedStatusSection = {
        number: null,
        heading: '',
        paragraphs: [],
    };
    let paragraphLines: string[] = [];

    const flushParagraph = () => {
        const paragraph = paragraphLines.join('\n').trim();
        if (paragraph) current.paragraphs.push(paragraph);
        paragraphLines = [];
    };

    const flushSection = () => {
        flushParagraph();
        if (current.heading || current.paragraphs.length) {
            sections.push(current);
        }
    };

    for (const line of normalized.split('\n')) {
        const headingMatch = line.match(SECTION_HEADING_PATTERN);
        if (headingMatch) {
            flushSection();
            current = {
                number: Number(headingMatch[1]),
                heading: headingMatch[2].trim(),
                paragraphs: [],
            };
            continue;
        }

        if (!line.trim()) {
            flushParagraph();
            continue;
        }
        paragraphLines.push(line.trim());
    }

    flushSection();
    return sections;
}
