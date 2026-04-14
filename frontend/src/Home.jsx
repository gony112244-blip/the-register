import API_BASE from './config';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  const [userCount, setUserCount] = useState(0);
  const [openFaq, setOpenFaq] = useState(null);
  const [activeFaqCat, setActiveFaqCat] = useState('general');

  useEffect(() => {
    fetch(`${API_BASE}/api/stats`)
      .then(res => res.json())
      .then(data => setUserCount(data.totalUsers))
      .catch(err => console.error("Error fetching stats:", err));
  }, []);

  const toggleFaq = (key) => {
    setOpenFaq(openFaq === key ? null : key);
  };

  const sitePhoneNumber = "072-XXX-XXXX";

  const faqCategories = [
    { id: 'general', label: '📌 כללי', icon: '📌' },
    { id: 'howItWorks', label: '⚙️ איך זה עובד', icon: '⚙️' },
    { id: 'privacy', label: '🔒 פרטיות ואבטחה', icon: '🔒' },
    { id: 'cost', label: '💰 עלויות', icon: '💰' },
    { id: 'phone', label: '📞 שימוש בטלפון', icon: '📞' },
  ];

  const faqData = {
    general: [
      {
        q: 'למי מיועד הפנקס?',
        a: 'הפנקס מיועד לבני תורה ובנות סמינר המחפשים שידוך בדרך מכובדת וצנועה. המערכת בנויה מתוך הבנה עמוקה של הצרכים, הרגישויות והמנהגים של הציבור החרדי — ומטרתנו שכל שלב בתהליך ייעשה בדרך ארץ ובכבוד.'
      },
      {
        q: 'מה ההבדל בינכם לבין אתרי שידוכים אחרים?',
        a: 'בניגוד ל"לוח מודעות" שבו כולם רואים את כולם — אצלנו הפרופיל שלך מוצג רק למועמדים שמתאימים לקריטריונים שהגדרת, ושגם הקריטריונים שלהם מתאימים לך. אינך "מוצר על מדף". בנוסף, יש שדכנית מלווה שמנהלת את התהליך מרגע שהשידוך מתקדם — ולא משאירים אותך לבד.'
      },
      {
        q: 'האם האתר מיועד רק לרווקים, או גם לגרושים ואלמנים?',
        a: 'האתר פתוח לכל מי שמחפש שידוך ברצינות — רווקים, גרושים ואלמנים כאחד. ניתן לציין את המצב המשפחתי בפרופיל, והמערכת תתאים הצעות בהתאם להעדפות שלך ושל הצד השני.'
      },
      {
        q: 'איך מוחקים את הכרטיס שלי מהמערכת?',
        a: 'ניתן למחוק את החשבון ישירות מהאתר: לאחר ההתחברות, פתח את עריכת הפרופיל, גלול לתחתית הדף, ושם תמצא את הכפתור "מחיקת החשבון שלי לצמיתות". לחיצה עליו תבקש ממך אישור כפול לפני המחיקה. שים לב: המחיקה סופית ובלתי הפיכה — כל הנתונים, ההודעות והתמונות יימחקו לצמיתות.'
      },
      {
        q: 'נתקלתי בקושי או שיש לי שאלה, איך יוצרים קשר?',
        a: 'הדרך הנוחה ביותר היא דרך טופס יצירת קשר באתר — השדות מתמלאים אוטומטית למשתמש מחובר. לחלופין ניתן לשלוח מייל ל-hapinkas.contact@gmail.com. אנחנו משתדלים לחזור בהקדם.'
      },
    ],
    howItWorks: [
      {
        q: 'איך מתחילים?',
        a: 'נכנסים לאתר, ממלאים טופס רישום קצר עם פרטים בסיסיים, מעלים צילום תעודת זהות (לצורך אימות בלבד), וממתינים לאישור. לאחר שהמנהלת מאשרת את הפרופיל — מתחילים לקבל הצעות.'
      },
      {
        q: 'מה קורה אחרי שאני נרשם?',
        a: 'המנהלת בודקת את הפרטים ומאשרת את הפרופיל. מרגע האישור, המערכת מתחילה להציג לך הצעות שמתאימות לקריטריונים שהגדרת — גיל, מגזר, מוצא, סוג לימוד ועוד.'
      },
      {
        q: 'מה זה "שלב הבירורים"?',
        a: 'כאשר שני הצדדים מביעים עניין הדדי — נפתח שלב הבירורים. בשלב זה תקבלו פרטים מורחבים האחד על השני: גבאים, רבנים, כתובות ופרטי קשר להתקשר ולברר. רק לאחר ששניכם מאשרים שסיימתם בירורים ומעוניינים — הפרטים עוברים לשדכנית.'
      },
      {
        q: 'מה תפקיד השדכנית?',
        a: 'השדכנית מלווה את השידוך מהרגע ששני הצדדים סיימו בירורים ואישרו עניין. היא יוצרת קשר עם שני הצדדים, מתאמת ומסייעת להוביל את התהליך עד סופו בסייעתא דשמיא.'
      },
      {
        q: 'האם אני מחויב להצעה שקיבלתי?',
        a: 'חלילה. ניתן לדחות כל הצעה בכל שלב — בין אם לפני שלב הבירורים ובין אם תוך כדי. אנחנו מבינים שלא כל הצעה מתאימה, והמערכת מכבדת את ההחלטה שלך.'
      },
    ],
    privacy: [
      {
        q: 'האם מישהו יכול לראות את התמונה שלי בלי רשותי?',
        a: 'לא. התמונות שלך נעולות לחלוטין. גם אם מישהו ינסה להגיע ישירות לתמונה דרך הכתובת שלה בדפדפן — הוא יקבל הודעת שגיאה. רק מי שאת/ה אישרת לראות את התמונות שלך, ורק בזמן שהוא מחובר למערכת עם החשבון שלו, יוכל לראות אותן.'
      },
      {
        q: 'מה קורה אם מישהו שמר את הכתובת של התמונה שלי ורוצה לפתוח אותה אחר כך?',
        a: 'זה לא יעבוד. כל כניסה לתמונה דורשת שהמשתמש יהיה מחובר ומזוהה במערכת ברגע הצפייה. הכתובת לבדה — ללא כניסה פעילה למערכת — אינה מאפשרת שום צפייה.'
      },
      {
        q: 'מה זה "סימן מים" שמוסיפים לתמונה?',
        a: 'כל פעם שמישהו רואה תמונה שלך, שמו האישי מודפס על גבי התמונה באופן קבוע. כך, גם אם צילם את המסך — ניתן לדעת בדיוק מי עשה זאת. זו הרתעה חזקה שגורמת לאנשים לנהוג בכבוד.'
      },
      {
        q: 'האם אפשר להוריד את התמונה שלי ישירות דרך הדפדפן?',
        a: 'לא בקלות. המערכת חוסמת לחיצה על "שמור תמונה", מניעה גרירה ואינה מאפשרת פתיחת התמונה בלשונית חדשה. אין מאה אחוז הגנה מפני צילום מסך ידני — אבל סימן המים מבטיח שגם אם מישהו עשה זאת, שמו רשום עליה.'
      },
      {
        q: 'מה קורה אם השידוך לא המשיך?',
        a: 'ברגע שאחד הצדדים מבטל את ההתקדמות — ההרשאה לראות תמונות מתבטלת מיד ואוטומטית. הצד השני לא יוכל עוד לצפות בתמונות, גם אם קיבל אישור קודם. אין צורך לבקש להסיר הרשאה — זה קורה לבד.'
      },
      {
        q: 'כמה זמן מישהו יכול לראות את התמונות שלי לאחר שנתתי אישור?',
        a: '48 שעות בלבד מרגע האישור. לאחר מכן, ההרשאה פוקעת מאליה וצריך לחדש אותה. כך לא נוצר מצב שמישהו ראה תמונות לפני שנה ועדיין "מורשה" לראות אותן היום.'
      },
      {
        q: 'האם צילום תעודת הזהות שמועלה לצורך אימות מוגן גם הוא?',
        a: 'כן, בדיוק באותו אופן כמו תמונות הפרופיל. רק המנהלת יכולה לצפות בה לצורך האימות, ואף משתמש רגיל לא יכול לגשת אליה בשום דרך.'
      },
      {
        q: 'מי רואה את הפרטים שלי?',
        a: 'רק מועמדים שמתאימים לקריטריונים שהגדרת, ושגם קריטריוני החיפוש שלהם מתאימים לפרופיל שלך. בנוסף, צוות המערכת (לצורך אישור ותמיכה). אנחנו שומרים על פרטיותך.'
      },
    ],
    cost: [
      {
        q: 'כמה עולה להשתמש באתר?',
        a: 'השימוש באתר חינם לחלוטין — הרישום, הגדרת ההעדפות, קבלת הצעות, בירורים ושלב ההתאמה — הכל ללא עלות.'
      },
      {
        q: 'אז מתי יש תשלום?',
        a: 'רק אם שידוך יוצא לפועל בסייעתא דשמיא — יש לשלם 4,000 ש"ח לשדכנית שליוותה את התהליך. התשלום הוא עבור העבודה של השדכנית ולא עבור השימוש באתר. למי שמצבו הכלכלי קשה, ניתן לפנות אלינו ונמצא פתרון הולם.'
      },
      {
        q: 'למה לשלם אם האתר עצמו חינם?',
        a: 'האתר מספק כלי חיפוש ובירורים. אך ברגע שהשידוך מתקדם לשלב רציני, שדכנית מקצועית נכנסת לתמונה, מלווה את שני הצדדים, מתאמת ועוזרת להוביל את התהליך. התשלום מגיע רק על תוצאה — שידוך שנגמר בהצלחה.'
      },
    ],
    phone: [
      {
        q: 'בקרוב...',
        a: 'מידע על השירות הטלפוני יתווסף כאן בקרוב בעזרת ה\'.'
      }
    ]
  };

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
            רק מי שמתאים — יראה אתכם.
          </p>

          <div className="hero-buttons">
            <Link to="/register" className="btn-primary">הירשם עכשיו</Link>
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
            marginTop: '35px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            {[
              { label: '✨ למה אנחנו?', selector: '.features-section' },
              { label: '⚙️ איך זה עובד?', selector: '.how-it-works' },
              { label: '💰 עלויות', selector: '.pricing-section' },
              { label: '❓ שאלות נפוצות', selector: '.faq-section' }
            ].map((item, idx) => (
              <button
                key={idx}
                onClick={() => document.querySelector(item.selector)?.scrollIntoView({ behavior: 'smooth' })}
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
              הפרופיל שלך לא מוצג לכולם. רק מועמדים שמתאימים לקריטריונים שלך — רואים אותך.
              אינך "מוצר על מדף". והתמונות? נעולות ומוגנות, לא ניתן להגיע אליהן ללא אישורך.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3 className="feature-title">התאמות מדויקות</h3>
            <p className="feature-desc">
              המערכת מציגה לך רק מועמדים שמתאימים להעדפות שהגדרת — גיל, מגזר, מוצא, תחום עיסוק ועוד.
              ללא בזבוז זמן על הצעות שאינן רלוונטיות.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">👩‍💼</div>
            <h3 className="feature-title">שדכנית מלווה</h3>
            <p className="feature-desc">
              אנחנו לא משאירים אותך לבד. כשהשידוך מתקדם — שדכנית מקצועית נכנסת לתמונה,
              מלווה את שני הצדדים ועוזרת להוביל את התהליך עד סופו.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📞</div>
            <h3 className="feature-title">שירות גם בטלפון</h3>
            <p className="feature-desc">
              הרישום מתבצע באתר בצורה מאובטחת.
              לאחר מכן — עדכון פרטים, בירורים וקבלת הצעות זמינות גם בשיחה טלפונית.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🛡️</div>
            <h3 className="feature-title">הגנה על תמונות</h3>
            <p className="feature-desc">
              כל תמונה שנצפית מוטבע עליה שם הצופה. לא ניתן להוריד, לגרור או לשמור תמונות.
              ההרשאה פוקעת אחרי 48 שעות, ואם השידוך יורד — הגישה נחסמת מיד.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💸</div>
            <h3 className="feature-title">חינם לשימוש</h3>
            <p className="feature-desc">
              כל השימוש באתר — רישום, חיפוש, הצעות ובירורים — ללא עלות כלל.
              תשלום נדרש רק לשדכנית, ורק אם שידוך יצא לפועל בהצלחה.
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
              <p>ממלאים פרטים בסיסיים, מעלים צילום ת.ז. (לאימות בלבד), וממתינים לאישור. אנחנו מוודאים שכולם כאן רציניים.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>מגדירים את ההעדפות</h3>
              <p>איזה גיל מחפשים? מאיזה מגזר? מוצא? תחום עיסוק? הגדרות פשוטות שעוזרות למערכת למצוא התאמות מדויקות.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>מקבלים הצעות מותאמות</h3>
              <p>המערכת מציגה לך רק מועמדים שמתאימים להגדרות החיפוש שלך, ושגם הגדרות החיפוש שלהם מתאימות לך. התאמה דו-כיוונית.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>בירורים מעמיקים</h3>
              <p>מצאתם עניין הדדי? תקבלו פרטים מורחבים — גבאים, רבנים, כתובות ופרטי קשר. תברררו בנחת ובמקצועיות.</p>
            </div>
          </div>

          <div className="step-item">
            <div className="step-number">5</div>
            <div className="step-content">
              <h3>שדכנית נכנסת לתמונה</h3>
              <p>כששני הצדדים מסיימים בירורים ומאשרים עניין — שדכנית מקצועית מקבלת את הפרטים ומלווה את ההמשך עד בסייעתא דשמיא.</p>
            </div>
          </div>

        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section" style={{
        padding: '80px 20px',
        background: 'linear-gradient(180deg, #fff 0%, #f8f5f0 100%)',
        textAlign: 'center',
        direction: 'rtl'
      }}>
        <h2 className="section-title">עלויות</h2>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>

          <div style={{
            background: '#fff',
            borderRadius: '24px',
            padding: '50px 35px',
            border: '2px solid #c9a227',
            boxShadow: '0 8px 40px rgba(201,162,39,0.15)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '5px',
              background: 'linear-gradient(90deg, #8b6914, #e8d48a, #8b6914)'
            }}/>

            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💸</div>
            <h3 style={{ fontSize: '1.6rem', color: '#1a1612', marginBottom: '20px', fontWeight: '700' }}>
              השימוש באתר — חינם לגמרי
            </h3>
            <p style={{ color: '#4a4540', lineHeight: '2', fontSize: '1.1rem', marginBottom: '30px' }}>
              הרישום, החיפוש, ההצעות, הבירורים — הכל ללא עלות.
              <br />
              אנחנו לא גובים דמי שימוש, דמי מנוי או עמלות.
            </p>

            <div style={{
              background: '#fefdfb',
              borderRadius: '16px',
              padding: '30px',
              border: '1px solid #e8e4db'
            }}>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a1612', marginBottom: '10px' }}>
                ואם שידוך יוצא לפועל?
              </div>
              <p style={{ color: '#4a4540', lineHeight: '2', fontSize: '1.05rem', margin: 0 }}>
                רק במקרה שהשידוך נגמר בהצלחה בסייעתא דשמיא — יש לשלם
                {' '}<strong style={{ color: '#c9a227', fontSize: '1.2rem' }}>4,000 ש"ח</strong>{' '}
                לשדכנית שליוותה את התהליך.
                <br /><br />
                <span style={{ fontSize: '0.95rem', color: '#7a756d' }}>
                  מי שמצבו הכלכלי קשה — מוזמן לפנות אלינו ונמצא פתרון הולם בעזרת ה'.
                </span>
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* FAQ Section - Categories */}
      <section className="faq-section">
        <h2 className="section-title">שאלות ותשובות</h2>

        {/* Category Tabs */}
        <div className="faq-tabs">
          {faqCategories.map(cat => (
            <button
              key={cat.id}
              className={`faq-tab ${activeFaqCat === cat.id ? 'active' : ''}`}
              onClick={() => { setActiveFaqCat(cat.id); setOpenFaq(null); }}
            >
              <span className="faq-tab-icon">{cat.icon}</span>
              <span className="faq-tab-label">{cat.label.replace(/^[^\s]+\s/, '')}</span>
            </button>
          ))}
        </div>

        <div className="faq-container">
          {(faqData[activeFaqCat] || []).map((item, idx) => {
            const key = `${activeFaqCat}-${idx}`;
            return (
              <div key={key} className={`faq-item ${openFaq === key ? 'open' : ''}`}>
                <div className="faq-question" onClick={() => toggleFaq(key)}>
                  <span className="question-text">
                    <span className="question-icon">?</span>
                    {item.q}
                  </span>
                  <span className="arrow">▼</span>
                </div>
                <p className="faq-answer">{item.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Support / Contact Section */}
      <section style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d4a6f 100%)',
        padding: '60px 20px',
        textAlign: 'center',
        color: '#fff',
        direction: 'rtl'
      }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '14px' }}>🛠️</div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700', margin: '0 0 10px', color: '#FFD700' }}>
            תמיכה טכנית
          </h2>
          <p style={{ fontSize: '1.05rem', color: '#cbd5e1', lineHeight: '1.8', marginBottom: '28px' }}>
            נתקלת בתקלה באתר? יש שאלה על השימוש? רוצה להציע רעיון לשיפור?<br />
            אנחנו כאן — השאר פנייה ונחזור אליך בהקדם.
          </p>

          <div style={{
            display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap',
            marginBottom: '30px'
          }}>
            {[
              { icon: '🔧', title: 'תקלה טכנית', desc: 'משהו לא עובד? דווח לנו ונטפל מיד.' },
              { icon: '❓', title: 'שאלה על האתר', desc: 'לא ברור איך משהו עובד? נשמח להסביר.' },
              { icon: '💡', title: 'רעיון / שיפור', desc: 'יש לך הצעה שתשפר את חוויית המשתמשים?' },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '14px', padding: '18px 22px',
                flex: '1', minWidth: '180px', maxWidth: '200px'
              }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{item.icon}</div>
                <div style={{ fontWeight: '700', marginBottom: '5px', color: '#FFD700' }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <Link to="/contact" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #c9a227, #f59e0b)',
            color: '#1a1a1a',
            padding: '15px 40px',
            borderRadius: '30px',
            fontWeight: '800',
            fontSize: '1.1rem',
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(201,162,39,0.4)',
            transition: 'transform 0.2s'
          }}>
            ✉️ פנה אלינו עכשיו
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <p>© הפנקס — מערכת שידוכים לבני תורה | נבנה באהבה ובסייעתא דשמיא</p>
          <div className="footer-links">
            <div className="footer-contact">
              <span>📞 {sitePhoneNumber}</span>
              <span className="separator">|</span>
              <a href="mailto:hapinkas.contact@gmail.com" className="email-link" title="שליחת מייל">
                📧 hapinkas.contact@gmail.com
              </a>
              <span className="separator">|</span>
              <a href="/contact" className="email-link" title="טופס יצירת קשר">
                ✉️ צור קשר
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default Home;
