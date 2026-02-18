export function toAmPmLabel(iso: string): string {
    const date = new Date(iso);
    const hours = date.getHours();
    return hours < 12 ? 'AM' : 'PM';
}

export function formatShortDate(isoDate: string): string {
    const date = new Date(isoDate);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

export function toLocalInputValue(iso: string): string {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
