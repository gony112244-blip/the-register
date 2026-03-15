import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastProvider';
import { useEffect, useState } from 'react';
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
import PWAInstallPrompt from './components/PWAInstallPrompt'; // התקנת PWA
import EmailReminderModal from './components/EmailReminderModal'; // תזכורת אימות מייל

import AdminMatches from './AdminMatches';
import AdminPendingProfiles from './AdminPendingProfiles';
import AdminUsers from './AdminUsers';

import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

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

    if (token && userStr && publicPages.includes(location.pathname)) {
      try {
        const user = JSON.parse(userStr);
        if (user) {
          if (user.is_admin) {
            navigate('/admin');
          } else if (!user.gender || (!user.age && !user.birth_date)) {
            navigate('/profile');
          } else {
            // משתמש רשום כבר — אם יש מגדר וגיל, שלח להתאמות/הודעות (גם אם מחכה לאישור)
            fetch('http://localhost:3000/my-messages', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data) && data.some(m => !m.is_read)) {
                    navigate('/inbox');
                } else {
                    navigate('/matches');
                }
            })
            .catch(() => navigate('/matches'));
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

        {/* דפים של המשתמש הרגיל */}
        <Route path="/matches" element={<Matches />} />
        <Route path="/my-profile" element={<ProfileView />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/connections" element={<Connections />} />
        <Route path="/photo-requests" element={<PhotoRequests />} />
        <Route path="/hidden-profiles" element={<HiddenProfiles />} />

        {/* דפים של המנהל */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/matches" element={<AdminMatches />} />
        <Route path="/admin/pending-profiles" element={<AdminPendingProfiles />} />
        <Route path="/admin/users" element={<AdminUsers />} />
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