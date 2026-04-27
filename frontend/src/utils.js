export const formatHeight = (val) => {
    if (val === null || val === undefined || val === '') return '';
    const n = Number(val);
    if (Number.isNaN(n)) return val;
    return Math.round(n);
};
