import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Home from './Home';
import Login from './Login';
import Profile from './Profile';
import AdminDashboard from './AdminDashboard';
import Register from './Register';
import Matches from './Matches';
import Inbox from './Inbox';
import Navbar from './Navbar';
import Connections from './Connections';

// --- התיקון הקריטי כאן: מייבאים מהקובץ הנכון ---
import AdminMatches from './AdminMatches';

import './App.css';

// קומפוננט עזר שמציג Navbar רק בדפים פנימיים
function AppContent() {
  const location = useLocation();
  const hideNavbarOn = ['/', '/login', '/register']; // דפים שלא צריכים Navbar
  const showNavbar = !hideNavbarOn.includes(location.pathname);

  return (
    <div className="App">
      {showNavbar && <Navbar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/register" element={<Register />} />

        {/* דפים של המשתמש הרגיל */}
        <Route path="/matches" element={<Matches />} />
        <Route path="/inbox" element={<Inbox />} />
        <Route path="/connections" element={<Connections />} />

        {/* דפים של המנהל */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/matches" element={<AdminMatches />} /> {/* הנתיב החדש */}

      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;