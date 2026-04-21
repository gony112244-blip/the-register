/**
 * InitialsAvatar — בועת ראשי תיבות עברית עם גרשיים (פ״ג)
 * מחליפה את ui-avatars.com עם תמיכה מלאה בעברית
 */
export default function InitialsAvatar({ fullName, lastName, size = 40, style = {} }) {
    const first  = (fullName  || '').trim();
    const last   = (lastName  || '').trim();

    const f1 = first  ? [...first][0]  : '';
    const f2 = last   ? [...last][0]   : (first.split(/\s+/)[1] ? [...first.split(/\s+/)[1]][0] : '');

    let display;
    if (f1 && f2) {
        display = `${f1}״${f2}`;
    } else if (f1) {
        display = f1;
    } else {
        display = '?';
    }

    const colors = [
        ['#1e3a5f', '#c9a227'],
        ['#2d4a6f', '#e2b83a'],
        ['#3d5a7f', '#d4a82e'],
        ['#0f2a4f', '#b89020'],
    ];
    const idx  = (f1.codePointAt(0) || 0) % colors.length;
    const [bg, fg] = colors[idx];

    const fontSize = f1 && f2 ? Math.round(size * 0.32) : Math.round(size * 0.42);

    return (
        <div style={{
            width: size,
            height: size,
            borderRadius: '50%',
            background: bg,
            border: `2px solid ${fg}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            userSelect: 'none',
            ...style,
        }}>
            <span style={{
                color: fg,
                fontSize,
                fontWeight: 700,
                fontFamily: "'Heebo', 'Arial Hebrew', sans-serif",
                letterSpacing: 0,
                lineHeight: 1,
                direction: 'rtl',
            }}>
                {display}
            </span>
        </div>
    );
}
