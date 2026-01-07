/**
 * Formats a JavaScript Date object to a MySQL-compatible DATETIME string.
 * Format: YYYY-MM-DD HH:mm:ss
 * 
 * @param date The date object to format. Defaults to now if not provided.
 * @returns String formatted as 'YYYY-MM-DD HH:mm:ss'
 */
export const formatToMysql = (date: Date = new Date()): string => {
    const pad = (num: number) => num.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
