export function formatDate(ts) {
    if (!ts) return '';
    return ts.split('T')[0];
}

export function parseDateToInput(tsStr) {
    if (!tsStr) return '';
    const parts = tsStr.split(' ');
    if (parts.length >= 2) {
        const datePart = parts[0].replace(/\//g, '-');
        const timePart = parts[1].substring(0, 5);
        return `${datePart}T${timePart}`;
    }
    return '';
}

export function formatDateForSheet(isoStr) {
    if (!isoStr) return '';
    return isoStr.replace('T', ' ').replace('-', '/').replace('-', '/') + ':00';
}
