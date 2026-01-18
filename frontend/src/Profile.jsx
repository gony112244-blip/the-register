import { useState } from 'react';
import './Profile.css'; // ייבוא העיצוב החדש שיצרת

function Profile() {
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    sector: 'חרדי',
    height: ''
  });

  const handleSave = async () => {
    const userPhone = prompt("הזן את מספר הטלפון שלך לעדכון:");
    
    if (!userPhone) return;

    try {
      const response = await fetch('http://localhost:3000/update-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phone: userPhone,
          fullName: formData.fullName,
          age: parseInt(formData.age) || 0, 
          sector: formData.sector,
          height: parseInt(formData.height) || 0
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert("הצלחה! הפרופיל עודכן.");
      } else {
        alert("שגיאה: " + data.message);
      }
    } catch (err) {
      alert("השרת לא מגיב");
    }
  };

  return (
    <div className="profile-container">
      <h2>פרופיל אישי</h2>
      <p>נא מלא את פרטיך כדי שנוכל להתחיל בשידוך</p>
      
      <div className="form-group">
        <label>שם מלא</label>
        <input 
          type="text" 
          placeholder="ישראל ישראלי"
          onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
        />
      </div>

      <div className="form-group">
        <label>גיל</label>
        <input 
          type="number" 
          placeholder="גיל"
          onChange={(e) => setFormData({...formData, age: e.target.value})} 
        />
      </div>

      <div className="form-group">
        <label>מגזר</label>
        <select onChange={(e) => setFormData({...formData, sector: e.target.value})}>
          <option value="חרדי">חרדי</option>
          <option value="חסידי">חסידי</option>
          <option value="דתי לאומי">דתי לאומי</option>
          <option value="ספרדי">ספרדי</option>
        </select>
      </div>

      <div className="form-group">
        <label>גובה (בס"מ)</label>
        <input 
          type="number" 
          placeholder="175"
          onChange={(e) => setFormData({...formData, height: e.target.value})} 
        />
      </div>

      <button className="save-btn" onClick={handleSave}>
        שמור פרופיל
      </button>
    </div>
  );
}

export default Profile;