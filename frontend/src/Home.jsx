import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  // המושג ללמידה: useState Hook
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    // שליפת הנתון מה-API שבנינו הרגע
    fetch('http://localhost:3000/api/stats')
      .then(res => res.json())
      .then(data => setUserCount(data.totalUsers))
      .catch(err => console.error("Error fetching stats:", err));
  }, []); // המערך הריק אומר: תריץ את זה רק פעם אחת כשהדף עולה

  return (
    <div className="home-container">
      <h1>ברוכים הבאים למערכת השידוכים</h1>
      
      <div className="stats-box">
        <h2>{userCount}</h2>
        <p>מועמדים כבר רשומים במאגר שלנו!</p>
      </div>

      <div className="home-actions">
        <Link to="/login" className="btn-main">כניסה למערכת</Link>
        <Link to="/register" className="btn-sub">הרשמה מהירה</Link>
      </div>
    </div>
  );
}

export default Home;