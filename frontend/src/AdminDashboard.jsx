import { useState, useEffect } from 'react';

function AdminDashboard() {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const response = await fetch('http://localhost:3000/admin/users');
        const data = await response.json();
        setUsers(data);
    };

    const approveUser = async (id) => {
        const response = await fetch(`http://localhost:3000/admin/approve/${id}`, { method: 'PUT' });
        if (response.ok) {
            alert("המשתמש אושר!");
            fetchUsers(); // ריענון הרשימה
        }
    };

    return (
        <div style={{ padding: '30px', direction: 'rtl', fontFamily: 'Arial' }}>
            <h1 style={{ color: '#2c3e50' }}>לוח בקרה - שדכנית</h1>
            <p>ניהול ואישור מועמדים חדשים במערכת</p>
            
            <table style={tableStyle}>
                <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={thStyle}>שם מלא</th>
                        <th style={thStyle}>גיל</th>
                        <th style={thStyle}>מגזר</th>
                        <th style={thStyle}>גובה</th>
                        <th style={thStyle}>טלפון</th>
                        <th style={thStyle}>סטטוס</th>
                        <th style={thStyle}>פעולות</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id} style={trStyle}>
                            <td style={tdStyle}>{u.full_name}</td>
                            <td style={tdStyle}>{u.age || '-'}</td>
                            <td style={tdStyle}>{u.sector || '-'}</td>
                            <td style={tdStyle}>{u.height || '-'}</td>
                            <td style={tdStyle}>{u.phone}</td>
                            <td style={tdStyle}>
                                <span style={{ 
                                    padding: '5px 10px', 
                                    borderRadius: '15px', 
                                    fontSize: '12px',
                                    backgroundColor: u.is_approved ? '#d4edda' : '#fff3cd',
                                    color: u.is_approved ? '#155724' : '#856404'
                                }}>
                                    {u.is_approved ? 'מאושר' : 'ממתין'}
                                </span>
                            </td>
                            <td style={tdStyle}>
                                {!u.is_approved && (
                                    <button onClick={() => approveUser(u.id)} style={approveBtnStyle}>
                                        אשר מועמד
                                    </button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- עיצובים קלים ---
const tableStyle = { width: '100%', borderCollapse: 'collapse', marginTop: '20px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
const thStyle = { borderBottom: '2px solid #ddd', padding: '12px', textAlign: 'right' };
const tdStyle = { borderBottom: '1px solid #eee', padding: '12px' };
const trStyle = { transition: 'background 0.2s' };
const approveBtnStyle = { backgroundColor: '#27ae60', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' };

export default AdminDashboard;