import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const containerRef = useRef(null);

    // יצירת div ייעודי פעם אחת — מחוץ לעץ ה-React רגיל, אבל מנוהל ע"י ref
    useEffect(() => {
        const el = document.createElement('div');
        el.id = 'toast-portal-root';
        document.body.appendChild(el);
        containerRef.current = el;
        return () => {
            // ניקוי בטוח
            try {
                if (el.parentNode === document.body) {
                    document.body.removeChild(el);
                }
            } catch (_) {}
        };
    }, []);

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    }, []);

    const success = (msg) => showToast(msg, 'success');
    const error = (msg) => showToast(msg, 'error');
    const info = (msg) => showToast(msg, 'info');
    const warning = (msg) => showToast(msg, 'warning');

    // רינדור ה-toasts ישירות ב-DOM — ללא createPortal בכלל
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        // נבנה את ה-HTML ישירות — בלי Portal
        if (toasts.length === 0) {
            el.innerHTML = '';
            return;
        }

        el.innerHTML = '';
        Object.assign(el.style, {
            position: 'fixed',
            top: '80px',
            left: '20px',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            maxWidth: '400px'
        });

        toasts.forEach(toast => {
            const div = document.createElement('div');
            const bgColors = {
                success: 'linear-gradient(135deg, #22c55e, #16a34a)',
                error: 'linear-gradient(135deg, #ef4444, #dc2626)',
                warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
                info: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)'
            };
            const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

            Object.assign(div.style, {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '15px 20px',
                borderRadius: '12px',
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                animation: 'slideIn 0.3s ease-out',
                direction: 'rtl',
                fontFamily: "'Heebo', sans-serif",
                background: bgColors[toast.type] || bgColors.info,
                color: '#fff'
            });

            const iconSpan = document.createElement('span');
            iconSpan.style.fontSize = '1.2rem';
            iconSpan.textContent = icons[toast.type] || 'ℹ️';

            const msgSpan = document.createElement('span');
            msgSpan.style.flex = '1';
            msgSpan.style.fontWeight = '500';
            msgSpan.textContent = toast.message;

            const closeBtn = document.createElement('button');
            Object.assign(closeBtn.style, {
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            });
            closeBtn.textContent = '✕';
            closeBtn.onclick = () => {
                setToasts(prev => prev.filter(t => t.id !== toast.id));
            };

            div.appendChild(iconSpan);
            div.appendChild(msgSpan);
            div.appendChild(closeBtn);
            el.appendChild(div);
        });
    }, [toasts]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}
        </ToastContext.Provider>
    );
}

// CSS Animation (add to index.css or global styles)
const cssAnimation = `
@keyframes slideIn {
    from {
        transform: translateX(-100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;

// Inject animation
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = cssAnimation;
    document.head.appendChild(style);
}

export default ToastProvider;
