import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/ToastProvider';
import { useEffect } from 'react';
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
import ForgotPassword from './ForgotPassword';

import AdminMatches from './AdminMatches';
import AdminPendingProfiles from './AdminPendingProfiles';
import AdminUsers from './AdminUsers';

import './App.css';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const hideNavbarOn = ['/', '/login', '/register', '/forgot-password'];
  const showNavbar = !hideNavbarOn.includes(location.pathname);

  // מנגנון כניסה אוטומטית: אם המשתמש מחובר ומנסה להגיע לדף פומבי - העבר אותו פנימה
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    // רשימת דפים ציבוריים שאין סיבה לראות אם אתה מחובר
    const publicPages = ['/', '/login', '/register'];

    if (token && userStr && publicPages.includes(location.pathname)) {
      const user = JSON.parse(userStr);
      if (user.is_admin) {
        navigate('/admin');
      } else {
        navigate('/matches');
      }
    }
  }, [location.pathname, navigate]);


  return (
    <div className="App">
      {showNavbar && <Navbar />}
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
      </Router>
    </ToastProvider>
  );
}

export default App;