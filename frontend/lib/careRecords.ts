export type CareRecord = {
    id: string;
    date: string;
    note: string;
    noteJp?: string;
    noteEn?: string;
    reportMode: 'none' | 'body' | 'appendix';
    imageUrls?: string[];
    paginationFragment?: boolean;
    appendixRecordNumber?: number;
    continuationIndex?: number;
    continuationCount?: number;
};

export function getCareRecordNote(
    record: Pick<CareRecord, 'note' | 'noteJp' | 'noteEn' | 'paginationFragment'>,
    language: 'ja' | 'en'
) {
    if (record.paginationFragment) {
        return language === 'ja' ? record.noteJp || '' : record.noteEn || '';
    }
    if (language === 'ja') return record.noteJp || record.note || record.noteEn || '';
    return record.noteEn || record.note || record.noteJp || '';
}

export function normalizeCareRecords(records: unknown): CareRecord[] {
    if (!Array.isArray(records)) return [];
    return records.map((raw, index) => {
        const value = (raw || {}) as Partial<CareRecord>;
        const legacyNote = String(value.note || '');
        const legacyNoteHasJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/u.test(legacyNote);
        return {
            id: String(value.id || `care-${index + 1}`),
            date: String(value.date || ''),
            note: legacyNote,
            noteJp: value.noteJp || (!value.noteEn && legacyNoteHasJapanese ? legacyNote : undefined),
            noteEn: value.noteEn || (!value.noteJp && legacyNote && !legacyNoteHasJapanese ? legacyNote : undefined),
            reportMode: value.reportMode === 'body' || value.reportMode === 'appendix' ? value.reportMode : 'none',
            imageUrls: Array.isArray(value.imageUrls) ? value.imageUrls.filter(Boolean) as string[] : []
        };
    });
}

function splitText(text: string, maxChars: number) {
    const normalized = String(text || '').trim();
    if (!normalized) return [] as string[];

    const chunks: string[] = [];
    let remaining = normalized;
    while (remaining.length > maxChars) {
        const minimumBreak = Math.floor(maxChars * 0.6);
        const candidate = remaining.slice(0, maxChars + 1);
        const newlineBreak = candidate.lastIndexOf('\n');
        const whitespaceBreak = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('\t'));
        const naturalBreak = Math.max(newlineBreak, whitespaceBreak);
        const breakAt = naturalBreak >= minimumBreak ? naturalBreak : maxChars;
        chunks.push(remaining.slice(0, breakAt).trim());
        remaining = remaining.slice(breakAt).trim();
    }
    if (remaining) chunks.push(remaining);
    return chunks;
}

function chunkImages(imageUrls: string[], size = 2) {
    const chunks: string[][] = [];
    for (let index = 0; index < imageUrls.length; index += size) {
        chunks.push(imageUrls.slice(index, index + size));
    }
    return chunks;
}

function buildPaginationFragments(record: CareRecord, recordIndex: number, language: 'ja' | 'en'): CareRecord[] {
    const imageChunks = chunkImages((record.imageUrls || []).filter(Boolean));
    const noteChunkSize = imageChunks.length ? 320 : 900;
    const noteChunks = splitText(getCareRecordNote(record, language), noteChunkSize);
    const continuationCount = Math.max(1, imageChunks.length, noteChunks.length);

    return Array.from({ length: continuationCount }, (_, index) => ({
        ...record,
        id: `${record.id}-page-${index + 1}`,
        note: '',
        noteJp: language === 'ja' ? noteChunks[index] || '' : '',
        noteEn: language === 'en' ? noteChunks[index] || '' : '',
        imageUrls: imageChunks[index] || [],
        paginationFragment: true,
        appendixRecordNumber: recordIndex + 1,
        continuationIndex: index + 1,
        continuationCount
    }));
}

function estimateAppendixUnits(record: CareRecord) {
    const jpLines = Math.ceil((record.noteJp || '').length / 45);
    const enLines = Math.ceil((record.noteEn || '').length / 80);
    const noteLines = Math.max(1, jpLines, enLines);
    const imageRows = Math.ceil((record.imageUrls || []).length / 2);
    return 2.2 + noteLines * 0.48 + imageRows * 4;
}

/**
 * A4 appendix pagination that is stable before print layout measurement.
 * Long notes and image-heavy entries receive more space, while every record
 * is retained and never silently dropped.
 */
export function paginateCareRecords(records: CareRecord[], language: 'ja' | 'en' = 'en', maxUnits = 10.5) {
    const pages: CareRecord[][] = [];
    let page: CareRecord[] = [];
    let used = 0;
    const fragments = records.flatMap((record, index) => buildPaginationFragments(record, index, language));

    fragments.forEach((record) => {
        const units = estimateAppendixUnits(record);
        if (page.length && used + units > maxUnits) {
            pages.push(page);
            page = [];
            used = 0;
        }
        page.push(record);
        used += units;
    });

    if (page.length) pages.push(page);
    return pages;
}
