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
          <h2 className="site-subtitle">שידוכים לבני תורה</h2>
          <p className="tagline">
            לא לוח מודעות. <span className="tagline-highlight">פנקס אישי.</span>
            <br />
            רק מי שמתאים - יראה אתכם.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">הרשמה למערכת</Link>
            <Link to="/login" className="btn-secondary">כניסה לחברים</Link>
          </div>

          <div className="user-count-badge">
            <span>כבר נרשמו</span>
            <span className="count">{userCount}</span>
            <span>למערכת</span>
          </div>

          <div className="phone-info">
            📞 שירות גם בטלפון: <span className="phone-number">{sitePhoneNumber}</span>
          </div>

          <div className="hero-scroll-menu" style={{
            marginTop: '40px',
            display: 'flex',
            gap: '15px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {[
              { label: '✨ למה אנחנו?', selector: '.features-section' },
              { label: '⚙️ איך זה עובד?', selector: '.how-it-works' },
              { label: '❓ שאלות נפוצות', selector: '.faq-section' }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => document.querySelector(item.selector).scrollIntoView({ behavior: 'smooth' })}
                style={{
                  background: 'linear-gradient(135deg, #FFD700 0%, #daa520 100%)',
                  color: '#3e2723',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px rgba(218, 165, 32, 0.3)',
                  transition: 'transform 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {item.label}
              </button>
            ))}
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
              הרישום מתבצע באתר בצורה מאובטחת.
              לאחר מכן - עדכון פרטים, בירורים וקבלת הצעות זמינים גם בשיחה טלפונית מול נציג.
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
              <p>ממלאים פרטים בסיסיים, מעלים צילום ת.ז. (לאימות בלבד), וממתינים לאישור. אנחנו מוודאים שכולם פה רציניים.</p>
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

          <div
            className={`faq-item ${openFaq === 0 ? 'open' : ''}`}
          >
            <div
              className="faq-question"
              onClick={() => toggleFaq(0)}
            >
              <span className="question-text">
                <span className="question-icon">?</span>
                למי מיועד הפנקס?
              </span>
              <span className="arrow">▼</span>
            </div>
            <p className="faq-answer">
              הפנקס מיועד לבני תורה ובנות סמינר איכותיים, המחפשים שידוך בדרך מכובדת וצנועה. המערכת בנויה תוך הבנה עמוקה של הצרכים והרגישויות של הציבור החרדי.
            </p>
          </div>

          <div
            className={`faq-item ${openFaq === 1 ? 'open' : ''}`}
          >
            <div
              className="faq-question"
              onClick={() => toggleFaq(1)}
            >
              <span className="question-text">
                <span className="question-icon">?</span>
                מה ההבדל בינכם לאתרי שידוכים אחרים?
              </span>
              <span className="arrow">▼</span>
            </div>
            <p className="faq-answer">
              בניגוד ל"לוח מודעות" שבו כולם רואים את כולם - אצלנו הפרופיל שלך מוצג רק למועמדים מתאימים. אתה לא "מוצר על מדף". זו גישה שמכבדת את האדם ושומרת על הצניעות.
            </p>
          </div>

          <div
            className={`faq-item ${openFaq === 2 ? 'open' : ''}`}
          >
            <div
              className="faq-question"
              onClick={() => toggleFaq(2)}
            >
              <span className="question-text">
                <span className="question-icon">?</span>
                אפשר להירשם גם דרך הטלפון?
              </span>
              <span className="arrow">▼</span>
            </div>
            <p className="faq-answer">
              הרישום הראשוני מתבצע דרך האתר בלבד (כדי שנוכל לאמת נתונים בצורה בטוחה). לאחר מכן, ניתן לבצע את כל שאר הפעולות (עדכונים, בירורים) גם בשיחת טלפון מול נציג אישי.
            </p>
          </div>

          <div
            className={`faq-item ${openFaq === 3 ? 'open' : ''}`}
          >
            <div
              className="faq-question"
              onClick={() => toggleFaq(3)}
            >
              <span className="question-text">
                <span className="question-icon">?</span>
                מי רואה את הפרטים שלי?
              </span>
              <span className="arrow">▼</span>
            </div>
            <p className="faq-answer">
              רק מועמדים שמתאימים לקריטריונים שהגדרת, ושאתה מתאים לקריטריונים שלהם. בנוסף, צוות המערכת (לצורך אישור ותמיכה). אנחנו שומרים על פרטיותך.
            </p>
          </div>

          <div
            className={`faq-item ${openFaq === 4 ? 'open' : ''}`}
          >
            <div
              className="faq-question"
              onClick={() => toggleFaq(4)}
            >
              <span className="question-text">
                <span className="question-icon">?</span>
                נתקלתי בקושי או שיש לי שאלה, איך יוצרים קשר?
              </span>
              <span className="arrow">▼</span>
            </div>
            <p className="faq-answer">
              אנחנו כאן לכל שאלה! ניתן לפנות אלינו במייל: <a href="mailto:office@hapinkas.co.il" style={{ color: 'inherit', fontWeight: 'bold' }}>office@hapinkas.co.il</a> ונחזור אליכם בהקדם.
            </p>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <p>© הפנקס - מערכת שידוכים לבני תורה | נבנה באהבה ובסייעתא דשמיא</p>
          <div className="footer-links">
            <div className="footer-contact">
              <span>📞 {sitePhoneNumber}</span>
              <span className="separator">|</span>
              <a href="mailto:office@hapinkas.co.il" className="email-link">✉️ office@hapinkas.co.il</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;