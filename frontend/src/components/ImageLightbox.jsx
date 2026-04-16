import { useEffect } from 'react';

/**
 * ImageLightbox — מציג תמונה מוגדלת עם הגנה על העתקה.
 * לחיצה על הרקע / כפתור X — סוגר.
 * לחיצה ימנית + גרירה — חסומות.
 */
export default function ImageLightbox({ src, alt = 'תמונה', onClose }) {
    // Escape key סוגר
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // מנע גלילה ברקע
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    const preventSave = (e) => e.preventDefault();

    return (
        <div
            style={S.backdrop}
            onClick={onClose}
            onContextMenu={preventSave}
        >
            {/* כפתור סגירה */}
            <button
                onClick={onClose}
                style={S.closeBtn}
                aria-label="סגור"
            >✕</button>

            {/* התמונה */}
            <img
                src={src}
                alt={alt}
                draggable={false}
                onContextMenu={preventSave}
                onClick={(e) => e.stopPropagation()}
                style={S.image}
            />

            {/* טקסט רמז */}
            <div style={S.hint}>לחץ מחוץ לתמונה או Escape לסגירה</div>
        </div>
    );
}

const S = {
    backdrop: {
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'zoom-out',
        // מנע בחירת טקסט/תמונה
        userSelect: 'none', WebkitUserSelect: 'none',
    },
    closeBtn: {
        position: 'absolute', top: 20, left: 20,
        background: 'rgba(255,255,255,0.15)', border: 'none',
        color: '#fff', fontSize: 22, borderRadius: '50%',
        width: 44, height: 44, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', zIndex: 1,
    },
    image: {
        maxWidth: '90vw', maxHeight: '85vh',
        borderRadius: 14,
        boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
        cursor: 'default',
        // מנע גרירה וסימון
        pointerEvents: 'none',
        userSelect: 'none', WebkitUserSelect: 'none',
    },
    hint: {
        marginTop: 14, color: 'rgba(255,255,255,0.45)',
        fontSize: '0.82rem', letterSpacing: '0.02em',
    },
};
