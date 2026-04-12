import API_BASE from './config';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider, useToast } from './components/ToastProvider';
import { useEffect, useState, useRef } from 'react';
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
import EmailReminderModal from './components/EmailReminderModal'; // תזכורת אימות מייל
import VerifyEmailLink from './VerifyEmailLink';
import ReportWrongEmail from './ReportWrongEmail';

import IvrSettings from './IvrSettings';
import AdminMatches from './AdminMatches';
import AdminPendingProfiles from './AdminPendingProfiles';
import AdminUsers from './AdminUsers';
import AdminSupport from './AdminSupport';
import ContactForm from './ContactForm';

import './App.css';

/** דקות ללא פעילות לפני ניתוק אוטומטי (מחשב משותף / עזיבת המחשב) */
const IDLE_LOGOUT_MINUTES = 30;

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
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, bump, { passive: true }));

    const tick = () => {
      if (!localStorage.getItem('token') || idleLogoutDone.current) return;
      const ms = IDLE_LOGOUT_MINUTES * 60 * 1000;
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
      events.forEach((ev) => window.removeEventListener(ev, bump));
      clearInterval(intervalId);
    };
  }, [navigate, showToast]);

  return (
    <div className="App">
      {showNavbar && <Navbar />}
      <EmailReminderModal user={currentUser} onUpdateUser={handleUpdateUser} />
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
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AppContent />
        <PWAInstallPrompt />
      </Router>
    </ToastProvider>
  );
}

export default App;