import API_BASE from './config';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, useToast } from './components/ToastProvider';
import { useEffect, useState, useRef, Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', direction: 'rtl', fontFamily: "'Heebo', sans-serif", padding: '20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#1e3a5f', marginBottom: '8px' }}>אירעה שגיאה בלתי צפויה</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>אנא רענן את הדף ונסה שוב.</p>
          <button
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            style={{ background: '#c9a227', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 28px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}
          >
            רענן דף
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import Home from './Home';
import Login from './Login';
import Profile from './Profile';
import ProfileView from './ProfileView';
import AdminDashboard from './AdminDashboard';
import Register from './Register';
import Matches from './Matches';
import Inbox from './Inbox';
import Navbar from './Navbar'; // סרגל ניווט
import Connections from './Connections';
import PhotoRequests from './PhotoRequests';
import HiddenProfiles from './HiddenProfiles';
import ForgotPassword from './ForgotPassword';
import Requests from './Requests';
import PWAInstallPrompt from './components/PWAInstallPrompt'; // התקנת PWA
// EmailReminderModal הושבת — עדכון מייל זמין דרך הגדרות בלבד
import VerifyEmailLink from './VerifyEmailLink';
import ReportWrongEmail from './ReportWrongEmail';

import WelcomeModal from './components/WelcomeModal';
import IvrSettings from './IvrSettings';
import AdminMatches from './AdminMatches';
import AdminPendingProfiles from './AdminPendingProfiles';
import AdminUsers from './AdminUsers';
import AdminSupport from './AdminSupport';
import AdminMatchDebug from './AdminMatchDebug';
import AdminMatchStats from './AdminMatchStats';
import ContactForm from './ContactForm';

import './App.css';

/** דקות ללא פעילות לפני ניתוק אוטומטי (מחשב משותף / עזיבת המחשב) */
const IDLE_LOGOUT_MINUTES = 30;
/** דקות ללא פעילות בעת מילוי פרופיל — ארוך יותר, כדי לא לנתק באמצע מילוי טופס ארוך */
const IDLE_LOGOUT_PROFILE_MINUTES = 60;

/**
 * ניתוק גלובלי על 401 — מנקה token ומפנה ל-login.
 * ייבוא אם צריך: import { forceLogout } from './App';
 */
export function forceLogout(navigateFn) {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  sessionStorage.removeItem('email_reminder_shown');
  window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
  if (navigateFn) navigateFn('/login');
  else if (typeof window !== 'undefined' && window.location && window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

// Global fetch interceptor: any 401 response → auto logout
if (typeof window !== 'undefined' && !window.__authFetchInstalled) {
  window.__authFetchInstalled = true;
  const _origFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await _origFetch(input, init);
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      const hadToken = !!localStorage.getItem('token');
      if (res && res.status === 401 && hadToken && url.includes(API_BASE)) {
        // Avoid loop on /login or auth endpoints
        if (!/\/(login|register|forgot-password|verify-reset-code|reset-password)\b/.test(url)) {
          forceLogout(null);
        }
      }
    } catch {}
    return res;
  };
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const idleLogoutDone = useRef(false);

  // ניהול מצב משתמש גלובלי (חלקי) עבור תזכורות
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });

  // עדכון המשתמש בסטייט וב-localStorage
  const handleUpdateUser = (newData) => {
    setCurrentUser(newData);
    localStorage.setItem('user', JSON.stringify(newData));
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: newData }));
  };

  // מאזין לעדכוני משתמש מ-NotificationsPanel (ב-Navbar)
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
        localStorage.setItem('user', JSON.stringify(e.detail));
      }
    };
    window.addEventListener('userUpdated', handler);
    return () => window.removeEventListener('userUpdated', handler);
  }, []);

  const hideNavbarOn = ['/', '/login', '/register', '/forgot-password'];
  const showNavbar = !hideNavbarOn.includes(location.pathname);

  // מנגנון כניסה אוטומטית: אם המשתמש מחובר ומנסה להגיע לדף פומבי - העבר אותו פנימה
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // עדכון הסטייט המקומי אם ה-localStorage השתנה (למשל אחרי לוגין)
    if (userStr) {
        const parsed = JSON.parse(userStr);
        if (JSON.stringify(parsed) !== JSON.stringify(currentUser)) {
            setCurrentUser(parsed);
        }
    }

    // רשימת דפים ציבוריים שאין סיבה לראות אם אתה מחובר
    const publicPages = ['/', '/login', '/register'];
    const isForgotPass = location.pathname === '/forgot-password';

    if (token && userStr && publicPages.includes(location.pathname) && !isForgotPass) {
      try {
        const loggedUser = JSON.parse(userStr);
        if (loggedUser) {
                // ניתוב לפי סוג משתמש
                if (loggedUser.is_admin) {
                    navigate('/admin');
                } else if (loggedUser.gender && (loggedUser.age || loggedUser.birth_date)) {
                    // משתמש עם מגדר ותאריך לידה / גיל — שלח להתאמות/הודעות
                    const checkMessages = async () => {
                        try {
                            const msgRes = await fetch(`${API_BASE}/my-messages`, {
                                headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const msgData = await msgRes.json();
                            const hasUnread = Array.isArray(msgData) && msgData.some(m => !m.is_read);
                            
                            if (hasUnread) {
                                navigate('/inbox');
                            } else {
                                navigate('/matches');
                            }
                        } catch (e) {
                            navigate('/matches');
                        }
                    };
                    checkMessages();
                } else {
                    navigate('/profile');
                }
        }
      } catch (e) {
        console.error("Error parsing user from localStorage:", e);
        // If garbage in localStorage, clear it
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, [location.pathname, navigate, currentUser]);

  // ניתוק אחרי חוסר פעילות
  useEffect(() => {
    idleLogoutDone.current = false;
    let lastActivity = Date.now();
    const bump = () => { lastActivity = Date.now(); };

    // mousemove — מכסה גלילה עם העכבר ותנועות בלי לחיצה
    // input/change — מכסה הקלדה במקלדת וירטואלית של טלפונים (שלא תמיד שולחת keydown)
    // focusin — מכסה מעבר בין שדות בטופס (גם אם אין הקלדה ממש)
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'touchmove', 'click', 'pointerdown', 'input', 'change', 'focusin'];
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true, capture: true }));

    // visibilitychange — כשחוזרים לטאב אחרי היעדרות, מעדכנים lastActivity
    // כך חזרה לטאב תמיד "מאפסת" את ספירת הדקות (הניתוק יתחיל רק אחרי חצי שעה של חוסר פעילות בתוך הטאב)
    const onVisible = () => { if (document.visibilityState === 'visible') lastActivity = Date.now(); };
    document.addEventListener('visibilitychange', onVisible);

    const tick = () => {
      if (!localStorage.getItem('token') || idleLogoutDone.current) return;
      // בדף מילוי פרופיל — סבלנות ארוכה יותר (טופס ארוך, אנשים שוהים על שאלה)
      // קוראים ישירות מ-window.location כדי לקבל את הערך העדכני (העפקט עצמו לא רץ-מחדש על כל ניווט)
      const isProfilePage = (typeof window !== 'undefined') && window.location.pathname === '/profile';
      const minutes = isProfilePage ? IDLE_LOGOUT_PROFILE_MINUTES : IDLE_LOGOUT_MINUTES;
      const ms = minutes * 60 * 1000;
      if (Date.now() - lastActivity < ms) return;
      idleLogoutDone.current = true;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      sessionStorage.removeItem('email_reminder_shown');
      setCurrentUser(null);
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
      navigate('/login');
      showToast('החיבור למערכת הופסק בשל חוסר פעילות', 'info', 7000);
    };

    const intervalId = setInterval(tick, 60 * 1000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, bump, { capture: true }));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(intervalId);
    };
  }, [navigate, showToast]);

  return (
    <div className="App">
      {showNavbar && <Navbar />}
      <WelcomeModal user={currentUser} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-email-link" element={<VerifyEmailLink />} />
        <Route path="/report-wrong-email" element={<ReportWrongEmail />} />

        {/* דפים של המשתמש הרגיל */}
        <Route path="/matches" element={<Matches />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/my-profile" element={<ProfileView />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/photo-requests" element={<PhotoRequests />} />
        <Route path="/hidden-profiles" element={<HiddenProfiles />} />
        <Route path="/ivr-settings" element={<IvrSettings />} />

        {/* יצירת קשר */}
        <Route path="/contact" element={<ContactForm />} />

        {/* דפים של המנהל */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/matches" element={<AdminMatches />} />
        <Route path="/admin/pending-profiles" element={<AdminPendingProfiles />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/support" element={<AdminSupport />} />
        <Route path="/admin/match-debug" element={<AdminMatchDebug />} />
        <Route path="/admin/match-stats" element={<AdminMatchStats />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Router>
          <AppContent />
          <PWAInstallPrompt />
        </Router>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;