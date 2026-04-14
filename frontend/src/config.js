// כתובת ה-API — בפיתוח: localhost, בפרודקשן: ריק (אותו שרת)
const API_BASE = import.meta.env.VITE_API_URL || '';
const FILE_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * ממיר נתיב תמונה (/uploads/xxx.jpg) ל-URL מאובטח עם טוקן
 * @param {string} imagePath — נתיב כמו /uploads/file.jpg
 * @returns {string} — URL מאובטח: /secure-file/file.jpg?token=...
 */
function getSecureUrl(imagePath) {
    if (!imagePath) return '';
    const s = String(imagePath).trim();
    if (/^https?:\/\//i.test(s)) return s;
    const filename = s.replace(/^.*[/\\]/, '');
    const token = localStorage.getItem('token') || '';
    const base = API_BASE || '';
    return `${base}/secure-file/${encodeURIComponent(filename)}?token=${encodeURIComponent(token)}`;
}

export { API_BASE, FILE_BASE_URL, getSecureUrl };
export default API_BASE;
