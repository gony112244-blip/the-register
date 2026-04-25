/**
 * Match Engine — מודול סינון והתאמות משותף לאתר ול-IVR.
 *
 * מייצא פונקציה אחת: buildMatchConditions(userId, pool)
 * שמחזירה את כל תנאי ה-WHERE, הפרמטרים, ומידע נוסף
 * כך ששני הערוצים משתמשים באותו אלגוריתם בדיוק.
 */

const SKIP_MERGE = new Set([
    'id', 'password', 'profile_images', 'profile_images_count',
    'is_admin', 'is_blocked', 'is_approved', 'is_email_verified'
]);

function mergeUserWithPending(user) {
    if (!user.pending_changes || typeof user.pending_changes !== 'object') return user;
    const merged = { ...user };
    Object.entries(user.pending_changes).forEach(([key, val]) => {
        if (!SKIP_MERGE.has(key) && val !== null && val !== undefined && val !== '') {
            merged[key] = val;
        }
    });
    return merged;
}

function splitField(value) {
    if (!value || value === '') return [];
    return value.split(',').map(t => t.trim()).filter(Boolean);
}

/**
 * בונה את כל תנאי ה-WHERE לשאילתת ההתאמות.
 *
 * @param {number} userId
 * @param {object} pool - pg Pool
 * @param {object} [opts]
 * @param {boolean} [opts.includeHidden=false] - true = לא מסנן הסתרות (לעיון מחדש)
 * @param {boolean} [opts.includePendingSent=true] - true = pending שנשלחו עדיין מוצגים (אתר); false = מסוננים (IVR)
 * @returns {Promise<{valid: boolean, conditions: string[], params: any[], paramIndex: number, user: object}>}
 */
async function buildMatchConditions(userId, pool, opts = {}) {
    const { includeHidden = false, includePendingSent = true } = opts;

    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return { valid: false };
    let currentUser = mergeUserWithPending(userResult.rows[0]);

    if (!currentUser.is_approved) return { valid: false };
    if (!currentUser.gender) return { valid: false };

    let params = [userId];
    let pi = 2; // param index
    const c = [
        `is_approved = TRUE`,
        `is_blocked = FALSE`,
        `id != $1`,
        `gender != (SELECT gender FROM users WHERE id = $1)`,
    ];

    // --- חיבורים קיימים ---
    const activeStatuses = includePendingSent
        ? `'active','waiting_for_shadchan'`
        : `'active','waiting_for_shadchan','pending'`;
    c.push(`id NOT IN (SELECT receiver_id FROM connections WHERE sender_id = $1 AND status IN (${activeStatuses}))`);
    c.push(`id NOT IN (SELECT sender_id FROM connections WHERE receiver_id = $1 AND status IN ('active','waiting_for_shadchan'))`);

    // --- הסתרות (דו-כיווני) ---
    if (!includeHidden) {
        c.push(`id NOT IN (SELECT hidden_user_id FROM hidden_profiles WHERE user_id = $1)`);
        c.push(`id NOT IN (SELECT user_id FROM hidden_profiles WHERE hidden_user_id = $1)`);
    }

    // --- חסימות (דו-כיווני) ---
    c.push(`id NOT IN (SELECT blocker_id FROM user_blocks WHERE blocked_id = $1)`);
    c.push(`id NOT IN (SELECT blocked_id FROM user_blocks WHERE blocker_id = $1)`);

    // =====================
    // כיוון א׳: אני מחפש →
    // =====================

    // גיל
    if (currentUser.search_min_age) {
        c.push(`(age IS NOT NULL AND age >= $${pi})`);
        params.push(currentUser.search_min_age); pi++;
    }
    if (currentUser.search_max_age) {
        c.push(`(age IS NOT NULL AND age <= $${pi})`);
        params.push(currentUser.search_max_age); pi++;
    }

    // גובה
    if (currentUser.search_height_min) {
        c.push(`(height IS NOT NULL AND height >= $${pi})`);
        params.push(Math.round(Number(currentUser.search_height_min))); pi++;
    }
    if (currentUser.search_height_max) {
        c.push(`(height IS NOT NULL AND height <= $${pi})`);
        params.push(Math.round(Number(currentUser.search_height_max))); pi++;
    }

    // מבנה גוף
    const bodyTypes = splitField(currentUser.search_body_types);
    if (bodyTypes.length > 0) {
        const ph = bodyTypes.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(body_type IS NULL OR body_type IN (${ph}))`);
        params.push(...bodyTypes); pi += bodyTypes.length;
    }

    // מראה
    const appearances = splitField(currentUser.search_appearances);
    if (appearances.length > 0) {
        const ph = appearances.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(appearance IS NULL OR appearance IN (${ph}))`);
        params.push(...appearances); pi += appearances.length;
    }

    // רקע משפחתי
    const backgrounds = splitField(currentUser.search_backgrounds);
    if (backgrounds.length > 0) {
        const ph = backgrounds.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(family_background IS NULL OR family_background IN (${ph}))`);
        params.push(...backgrounds); pi += backgrounds.length;
    }

    // סטטוס
    const statuses = splitField(currentUser.search_statuses);
    if (statuses.length > 0) {
        const ph = statuses.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(status IS NULL OR status IN (${ph}))`);
        params.push(...statuses); pi += statuses.length;
    }

    // מגזר עדתי
    const sectors = splitField(currentUser.search_heritage_sectors);
    if (sectors.length > 0) {
        const ph = sectors.map((_, i) => `$${pi + i}`).join(',');
        params.push(...sectors); pi += sectors.length;
        const mixedAccept = currentUser.mixed_heritage_ok ? ` OR (heritage_sector = 'mixed')` : '';
        c.push(`(heritage_sector IS NULL OR heritage_sector IN (${ph})${mixedAccept})`);
    }

    // עיסוק
    const occupations = splitField(currentUser.search_occupations);
    if (occupations.length > 0) {
        const ph = occupations.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(current_occupation IS NULL OR current_occupation IN (${ph}))`);
        params.push(...occupations); pi += occupations.length;
    }

    // שאיפות חיים — שדה רלוונטי לגברים בלבד; נשים לא ממלאות אותו, לכן לא מסננים לפי שאיפה של מועמדת נקבה
    const aspirations = splitField(currentUser.search_life_aspirations);
    if (aspirations.length > 0) {
        const ph = aspirations.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(gender != 'male' OR life_aspiration IS NULL OR life_aspiration IN (${ph}))`);
        params.push(...aspirations); pi += aspirations.length;
    }

    // כיסוי ראש
    if (currentUser.search_head_covering && currentUser.search_head_covering !== 'not_relevant') {
        c.push(`(head_covering IS NULL OR head_covering = 'flexible' OR head_covering = $${pi})`);
        params.push(currentUser.search_head_covering); pi++;
    }

    // גוון עור
    const skinTones = splitField(currentUser.search_skin_tones);
    if (skinTones.length > 0) {
        const ph = skinTones.map((_, i) => `$${pi + i}`).join(',');
        c.push(`(skin_tone IS NULL OR skin_tone IN (${ph}))`);
        params.push(...skinTones); pi += skinTones.length;
    }

    // כלכלה — מינימום עזרה בדיור
    if (!currentUser.search_financial_discuss && currentUser.search_financial_min) {
        const minAmt = parseInt(String(currentUser.search_financial_min).replace(/[,\s]/g, ''), 10);
        if (!isNaN(minAmt) && minAmt > 0) {
            c.push(`(
                apartment_help = 'full'
                OR (
                    apartment_amount IS NOT NULL
                    AND NULLIF(regexp_replace(apartment_amount, '[^0-9]', '', 'g'), '')::int >= $${pi}
                )
            )`);
            params.push(minAmt); pi++;
        }
    }

    // =====================
    // כיוון ב׳: הצד השני מחפש אותי ←
    // =====================

    // גיל
    if (currentUser.age) {
        const myAge = Math.round(Number(currentUser.age));
        c.push(`(search_min_age IS NULL OR search_min_age <= $${pi})`);
        params.push(myAge); pi++;
        c.push(`(search_max_age IS NULL OR search_max_age >= $${pi})`);
        params.push(myAge); pi++;
    } else {
        c.push(`(search_min_age IS NULL AND search_max_age IS NULL)`);
    }

    // גובה
    if (currentUser.height) {
        const myHeight = Math.round(Number(currentUser.height));
        c.push(`(search_height_min IS NULL OR search_height_min <= $${pi})`);
        params.push(myHeight); pi++;
        c.push(`(search_height_max IS NULL OR search_height_max >= $${pi})`);
        params.push(myHeight); pi++;
    } else {
        c.push(`(search_height_min IS NULL AND search_height_max IS NULL)`);
    }

    // מגזר עדתי
    if (currentUser.heritage_sector) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_heritage_sectors,'')), E'\\\\s*,\\\\s*')`;
        const mixedOk = currentUser.heritage_sector === 'mixed' ? ' OR (mixed_heritage_ok = TRUE)' : '';
        c.push(`(search_heritage_sectors IS NULL OR trim(coalesce(search_heritage_sectors,'')) = '' OR $${pi} = ANY(${arrExpr})${mixedOk})`);
        params.push(currentUser.heritage_sector); pi++;
    } else {
        c.push(`(search_heritage_sectors IS NULL OR trim(coalesce(search_heritage_sectors,'')) = '')`);
    }

    // סטטוס
    if (currentUser.status) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_statuses,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_statuses IS NULL OR trim(coalesce(search_statuses,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.status); pi++;
    } else {
        c.push(`(search_statuses IS NULL OR trim(coalesce(search_statuses,'')) = '')`);
    }

    // רקע משפחתי
    if (currentUser.family_background) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_backgrounds,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_backgrounds IS NULL OR trim(coalesce(search_backgrounds,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.family_background); pi++;
    } else {
        c.push(`(search_backgrounds IS NULL OR trim(coalesce(search_backgrounds,'')) = '')`);
    }

    // מבנה גוף
    if (currentUser.body_type) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_body_types,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_body_types IS NULL OR trim(coalesce(search_body_types,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.body_type); pi++;
    } else {
        c.push(`(search_body_types IS NULL OR trim(coalesce(search_body_types,'')) = '')`);
    }

    // מראה
    if (currentUser.appearance) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_appearances,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_appearances IS NULL OR trim(coalesce(search_appearances,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.appearance); pi++;
    } else {
        c.push(`(search_appearances IS NULL OR trim(coalesce(search_appearances,'')) = '')`);
    }

    // עיסוק
    if (currentUser.current_occupation) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_occupations,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_occupations IS NULL OR trim(coalesce(search_occupations,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.current_occupation); pi++;
    } else {
        c.push(`(search_occupations IS NULL OR trim(coalesce(search_occupations,'')) = '')`);
    }

    // שאיפות חיים — שדה רלוונטי לגברים בלבד. אם אין ערך (כגון אצל נשים) — לא מוסיפים תנאי מגביל
    if (currentUser.life_aspiration) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_life_aspirations,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_life_aspirations IS NULL OR trim(coalesce(search_life_aspirations,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.life_aspiration); pi++;
    }

    // כיסוי ראש
    if (currentUser.head_covering && currentUser.head_covering !== 'not_relevant') {
        if (currentUser.head_covering !== 'flexible') {
            c.push(`(search_head_covering IS NULL OR search_head_covering = 'not_relevant' OR search_head_covering = 'flexible' OR search_head_covering = $${pi})`);
            params.push(currentUser.head_covering); pi++;
        }
    }

    // גוון עור — כולל else branch (תיקון: אם אין לי גוון עור, רק מועמדים שלא סיננו לפי גוון)
    if (currentUser.skin_tone) {
        const arrExpr = `regexp_split_to_array(trim(both from coalesce(search_skin_tones,'')), E'\\\\s*,\\\\s*')`;
        c.push(`(search_skin_tones IS NULL OR trim(coalesce(search_skin_tones,'')) = '' OR $${pi} = ANY(${arrExpr}))`);
        params.push(currentUser.skin_tone); pi++;
    } else {
        c.push(`(search_skin_tones IS NULL OR trim(coalesce(search_skin_tones,'')) = '')`);
    }

    // כלכלה — דו-כיווני: גם הצד השני צריך לקבל את ההצעה הכלכלית שלי
    const noFinReq = `(search_financial_discuss = TRUE OR search_financial_min IS NULL OR NULLIF(regexp_replace(search_financial_min, '[^0-9]', '', 'g'), '') IS NULL)`;
    if (currentUser.apartment_help === 'full') {
        // אני מציע דירה מלאה — תמיד עומד בדרישות
    } else if (currentUser.apartment_amount) {
        const myAmt = parseInt(String(currentUser.apartment_amount).replace(/[^0-9]/g, ''), 10);
        if (!isNaN(myAmt) && myAmt > 0) {
            c.push(`(search_financial_discuss = TRUE OR search_financial_min IS NULL OR NULLIF(regexp_replace(search_financial_min, '[^0-9]', '', 'g'), '') IS NULL OR NULLIF(regexp_replace(search_financial_min, '[^0-9]', '', 'g'), '')::int <= $${pi})`);
            params.push(myAmt); pi++;
        } else {
            c.push(noFinReq);
        }
    } else {
        c.push(noFinReq);
    }

    return { valid: true, conditions: c, params, paramIndex: pi, user: currentUser };
}

module.exports = { buildMatchConditions };
