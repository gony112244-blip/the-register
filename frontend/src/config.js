// כתובת ה-API — בפיתוח: localhost, בפרודקשן: ריק (אותו שרת)
const API_BASE = import.meta.env.VITE_API_URL || '';
const FILE_BASE_URL = import.meta.env.VITE_API_URL || ''; // In production, same as the one serving frontend
export { API_BASE, FILE_BASE_URL };
export default API_BASE;
