import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// הסרנו StrictMode כי הוא גורם לרינדור כפול בפיתוח (ריצוד)
// אפשר להחזיר אותו בהמשך לבדיקות
createRoot(document.getElementById('root')).render(
  <App />
)
