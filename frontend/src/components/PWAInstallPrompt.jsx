import { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showPrompt, setShowPrompt] = useState(false);

    useEffect(() => {
        // בדיקה אם המשתמש כבר התקין
        const installed = localStorage.getItem('pwa-installed');
        if (installed) return;

        // בדיקה מתי בפעם האחרונה המשתמש סגר את ההצעה
        const lastDismissed = localStorage.getItem('pwa-install-dismissed-at');
        if (lastDismissed) {
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            const timePassed = Date.now() - parseInt(lastDismissed);

            if (timePassed < sevenDaysInMs) {
                return; // לא להציג אם עברו פחות מ-7 ימים מהסגירה האחרונה
            }
        }

        // האזנה לאירוע beforeinstallprompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // המתנה של 30 שניות (במקום 10) כדי לתת למשתמש זמן להתרשם מהאתר
            setTimeout(() => {
                setShowPrompt(true);
            }, 30000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // בדיקה אם האפליקציה כבר מותקנת (במצב Standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) {
            localStorage.setItem('pwa-installed', 'true');
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            localStorage.setItem('pwa-installed', 'true');
        } else {
            // אם סירב, נשמור את הזמן הנוכחי כדי להציע שוב רק בעוד שבוע
            localStorage.setItem('pwa-install-dismissed-at', Date.now().toString());
        }

        setShowPrompt(false);
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        // שמירת זמן הסגירה הנוכחי
        localStorage.setItem('pwa-install-dismissed-at', Date.now().toString());
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div className="pwa-install-overlay">
            <div className="pwa-install-prompt">
                <button
                    className="pwa-close-btn"
                    onClick={handleDismiss}
                    aria-label="סגור"
                >
                    ✕
                </button>

                <div className="pwa-content">
                    <div className="pwa-icon">
                        <img src="/logo.svg" alt="הפנקס" />
                    </div>

                    <h3 className="pwa-title">התקן את "הפנקס" כאפליקציה</h3>

                    <p className="pwa-description">
                        גישה מהירה וקלה מהשולחן העבודה או מסך הבית שלך
                    </p>

                    <div className="pwa-benefits">
                        <div className="pwa-benefit">
                            <span className="benefit-icon">🚀</span>
                            <span>פתיחה מהירה</span>
                        </div>
                        <div className="pwa-benefit">
                            <span className="benefit-icon">🔔</span>
                            <span>התראות מיידיות</span>
                        </div>
                        <div className="pwa-benefit">
                            <span className="benefit-icon">📱</span>
                            <span>חוויית אפליקציה</span>
                        </div>
                    </div>

                    <div className="pwa-actions">
                        <button className="pwa-install-btn" onClick={handleInstall}>
                            התקן עכשיו
                        </button>
                        <button className="pwa-maybe-btn" onClick={handleDismiss}>
                            אולי מאוחר יותר
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PWAInstallPrompt;
