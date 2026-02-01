import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const [userCount, setUserCount] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/stats')
      .then(res => res.json())
      .then(data => setUserCount(data.totalUsers))
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const sitePhoneNumber = "072-XXX-XXXX";

  const faqList = [
    {
      question: "למי מיועד הפנקס?",
      answer: "הפנקס מיועד לבני תורה המחפשים שידוך בדרך מכובדת וצנועה. המערכת בנויה תוך הבנה עמוקה של הצרכים והרגישויות של הציבור החרדי."
    },
    {
      question: "מה ההבדל בינכם לאתרי שידוכים אחרים?",
      answer: "בניגוד ל\"לוח מודעות\" שבו כולם רואים את כולם - אצלנו הפרופיל שלך מוצג רק למועמדים מתאימים. אתה לא \"מוצר על מדף\". זו גישה שמכבדת את האדם ושומרת על הצניעות."
    },
    {
      question: "אפשר להירשם גם דרך הטלפון?",
      answer: "בהחלט! כל השירותים זמינים גם בשיחת טלפון. נציג יעזור לך להירשם, לעדכן פרטים, ולקבל הצעות - הכל בשיחה אחת."
    },
    {
      question: "כמה זה עולה?",
      answer: "ההרשמה והשימוש הבסיסי במערכת הם בחינם. יש אפשרויות מתקדמות בתשלום סמלי."
    },
    {
      question: "מי רואה את הפרטים שלי?",
      answer: "רק מועמדים שמתאימים לקריטריונים שהגדרת, ושאתה מתאים לקריטריונים שלהם. בנוסף, צוות המערכת (לצורך אישור ותמיכה). אנחנו שומרים על פרטיותך."
    }
  ];

  return (
    <div className="home-page">

      <div className="bezrat-hashem">בעזרת ה' יתברך</div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="site-logo">
            <span className="logo-icon">📋</span>
            <span className="logo-text">הפנקס</span>
          </h1>
          <p className="tagline">
            לא לוח מודעות. <span className="tagline-highlight">פנקס אישי.</span>
            <br />
            רק מי שמתאים לך - יראה אותך.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">הרשמה למערכת</Link>
            <Link to="/login" className="btn-secondary">כניסה לחברים</Link>
          </div>

          <div className="user-count-badge">
            <span>כבר נרשמו</span>
            <span className="count">{userCount}</span>
            <span>בני תורה</span>
          </div>

          <div className="phone-info">
            📞 שירות גם בטלפון: <span className="phone-number">{sitePhoneNumber}</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">למה הפנקס?</h2>
        <div className="features-grid">

          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3 className="feature-title">פרטיות מוחלטת</h3>
            <p className="feature-desc">
              הפרופיל שלך לא מוצג לכולם. רק מועמדים שמתאימים לקריטריונים שלך - רואים אותך.
              אתה לא "מוצר על מדף".
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3 className="feature-title">התאמות מדויקות</h3>
            <p className="feature-desc">
              המערכת מציגה לך רק מועמדים שעונים להעדפות שהגדרת - גיל, מגזר, ועוד.
              בלי לבזבז זמן.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📞</div>
            <h3 className="feature-title">שירות טלפוני מלא</h3>
            <p className="feature-desc">
              כל השירותים זמינים גם בשיחת טלפון.
              הרשמה, עדכון פרטים, וקבלת הצעות - הכל בשיחה אחת.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works */}
      <section className="how-it-works">
        <h2 className="section-title">איך זה עובד?</h2>
        <div className="steps-container">

          <div className="step-item">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>נרשמים ומקבלים אישור</h3>
              <p>ממלאים פרטים בסיסיים, מעלים תמונה, וממתינים לאישור. אנחנו מוודאים שכולם פה ברצינות.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>מגדירים העדפות</h3>
              <p>איזה גיל מחפשים? מאיזה מגזר? הגדרות פשוטות שעוזרות למערכת למצוא התאמות מדויקות.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>מקבלים הצעות מותאמות</h3>
              <p>המערכת מציגה לך רק מועמדים שמתאימים להעדפות שלך - ושאתה מתאים להעדפות שלהם.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>מתקדמים בזהירות</h3>
              <p>מצאתם עניין הדדי? שני הצדדים מאשרים, ואז פרטי הקשר עוברים לשדכנית שמלווה את התהליך.</p>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-section">
        <h2 className="section-title">שאלות ותשובות</h2>
        <div className="faq-container">

          {faqList.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${openFaq === index ? 'open' : ''}`}
            >
              <div
                className="faq-question"
                onClick={() => toggleFaq(index)}
              >
                <span className="question-text">
                  <span className="question-icon">?</span>
                  {faq.question}
                </span>
                <span className="arrow">▼</span>
              </div>
              <p className="faq-answer">{faq.answer}</p>
            </div>
          ))}

        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>© הפנקס - מערכת שידוכים לבני תורה | נבנה באהבה ובסייעתא דשמיא</p>
        <div className="footer-phone">📞 {sitePhoneNumber}</div>
      </footer>

    </div>
  );
}

export default Home;