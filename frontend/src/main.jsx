import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

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
