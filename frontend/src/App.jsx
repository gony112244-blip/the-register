import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Register from './Register';
import Profile from './Profile'; // ייבוא הקומפוננטה החדשה

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* דף הבית יהיה ההרשמה */}
          <Route path="/" element={<Register />} />
          {/* הנתיב החדש לפרופיל */}
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;