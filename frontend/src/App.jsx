import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Login from './Login';
import Profile from './Profile';
import AdminDashboard from './AdminDashboard';
import Register from './Register';
import Matches from './Matches';
import Inbox from './Inbox';
import Navbar from './Navbar'; // ייבוא ה-Navbar
import './App.css';
import Connections from './Connections'

function App() {
  return (
    <Router>
      <div className="App">
        {/* --- כאן הוספנו את ה-Navbar --- */}
        {/* הוא נמצא מעל ה-Routes כדי שיופיע תמיד בחלק העליון של המסך */}
        <Navbar />

        <Routes>
          {/* דף הבית - הויטרינה של האתר */}
          <Route path="/" element={<Home />} />

          {/* דף הכניסה */}
          <Route path="/login" element={<Login />} />

          {/* דף הפרופיל */}
          <Route path="/profile" element={<Profile />} />

          {/* פאנל הניהול */}
          <Route path="/admin" element={<AdminDashboard />} />

          {/* הרשמה */}
          <Route path="/register" element={<Register />} />

          {/* שידוכים */}
          <Route path="/matches" element={<Matches />} />

          {/* תיבת בקשות */}
          <Route path="/inbox" element={<Inbox />} />

          {/* שידוכים פעילים */}
          <Route path="/connections" element={<Connections />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;