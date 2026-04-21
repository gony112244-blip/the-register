import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onNeedRefresh() {
    // Service worker חדש זמין — טוען מיד (skipWaiting מוגדר)
  },
  onOfflineReady() {},
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // ניקוי caches ישנים בכל עדכון SW
    registration.addEventListener('updatefound', () => {
      if ('caches' in window) {
        caches.keys().then(keys =>
          keys.forEach(key => {
            if (key.includes('-v1') || key.includes('-v2')) {
              caches.delete(key);
            }
          })
        );
      }
    });
  },
})

// חסימת קליק ימני וגרירה על תמונות מאובטחות
document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG' && e.target.src?.includes('secure-file')) {
    e.preventDefault();
  }
});
document.addEventListener('dragstart', (e) => {
  if (e.target.tagName === 'IMG' && e.target.src?.includes('secure-file')) {
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')).render(
  <App />
)
