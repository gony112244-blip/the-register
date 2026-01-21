import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';         // 1. ייבוא דף הבית
import Login from './Login';
import Profile from './Profile';
import AdminDashboard from './AdminDashboard';
import Register from './Register';
import Matches from './Matches';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* דף הבית - הויטרינה של האתר */}
          <Route path="/" element={<Home />} />
          
          {/* דף הכניסה */}
          <Route path="/login" element={<Login />} />
          
          {/* דף הפרופיל (רק למשתמשים מאושרים) */}
          <Route path="/profile" element={<Profile />} />
          
          {/* פאנל הניהול (רק לשדכנית) */}
          <Route path="/admin" element={<AdminDashboard />} />

          <Route path="/register" element={<Register />} />
        
        <Route path="/matches" element={<Matches />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;