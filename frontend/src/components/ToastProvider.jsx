import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

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

    return (
        <ToastContext.Provider value={{ showToast, success, error, info, warning }}>
            {children}

            {/* Toast Container */}
            <div style={styles.container}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{ ...styles.toast, ...styles[toast.type] }}>
                        <span style={styles.icon}>
                            {toast.type === 'success' && '✅'}
                            {toast.type === 'error' && '❌'}
                            {toast.type === 'warning' && '⚠️'}
                            {toast.type === 'info' && 'ℹ️'}
                        </span>
                        <span style={styles.message}>{toast.message}</span>
                        <button
                            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                            style={styles.closeBtn}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

const styles = {
    container: {
        position: 'fixed',
        top: '80px',
        left: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '400px'
    },
    toast: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '15px 20px',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        animation: 'slideIn 0.3s ease-out',
        direction: 'rtl',
        fontFamily: "'Heebo', sans-serif"
    },
    success: {
        background: 'linear-gradient(135deg, #22c55e, #16a34a)',
        color: '#fff'
    },
    error: {
        background: 'linear-gradient(135deg, #ef4444, #dc2626)',
        color: '#fff'
    },
    warning: {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: '#fff'
    },
    info: {
        background: 'linear-gradient(135deg, #1e3a5f, #2d4a6f)',
        color: '#fff'
    },
    icon: {
        fontSize: '1.2rem'
    },
    message: {
        flex: 1,
        fontWeight: '500'
    },
    closeBtn: {
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
    }
};

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
