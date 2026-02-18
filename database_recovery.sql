-- ==========================================
-- 🗄️ The Register - Database Recovery Script
-- ==========================================
-- This script recreates the entire database schema
-- Run this after installing PostgreSQL

-- Drop existing tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS hidden_profiles CASCADE;
DROP TABLE IF EXISTS photo_approvals CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================
-- TABLE 1: users (Main user table)
-- ==========================================
CREATE TABLE users (
    -- Primary Key
    id SERIAL PRIMARY KEY,
    
    -- Authentication
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    
    -- Basic Info
    full_name TEXT,
    last_name VARCHAR(100),
    age INTEGER,
    birth_date DATE,
    gender TEXT,
    height NUMERIC(5,2),
    city VARCHAR(255),
    
    -- System Flags
    is_admin BOOLEAN DEFAULT FALSE,
    is_approved BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP DEFAULT NOW(),
    
    -- Personal Details
    status VARCHAR(20), -- single, divorced, widower
    has_children BOOLEAN DEFAULT FALSE,
    children_count INTEGER,
    country_of_birth VARCHAR(100),
    
    -- Contact Person
    contact_person_type VARCHAR(50),
    contact_person_name VARCHAR(100),
    contact_phone_1 VARCHAR(50),
    contact_phone_2 VARCHAR(50),
    
    -- Family Background
    family_background VARCHAR(50), -- haredi, dati_leumi, masorti, baal_teshuva
    heritage_sector TEXT,
    father_occupation VARCHAR(200),
    mother_occupation VARCHAR(200),
    father_heritage VARCHAR(100),
    mother_heritage VARCHAR(100),
    father_full_name VARCHAR(200),
    mother_full_name VARCHAR(200),
    siblings_count INTEGER,
    sibling_position INTEGER,
    siblings_details TEXT,
    
    -- Appearance
    body_type VARCHAR(30), -- very_thin, thin, average, full
    skin_tone VARCHAR(50),
    appearance VARCHAR(30), -- fair, ok, good, handsome, very_handsome
    
    -- Financial
    apartment_help VARCHAR(100),
    apartment_amount VARCHAR(100),
    
    -- Occupation (Men)
    current_occupation VARCHAR(30), -- studying, working, both, fixed_times
    yeshiva_name VARCHAR(255),
    yeshiva_ketana_name VARCHAR(255),
    work_field VARCHAR(200),
    life_aspiration VARCHAR(255),
    favorite_study VARCHAR(255),
    occupation_details TEXT,
    
    -- Occupation (Women)
    study_place VARCHAR(255),
    study_field VARCHAR(200),
    
    -- Free Text
    about_me TEXT,
    home_style TEXT,
    partner_description TEXT,
    important_in_life TEXT,
    
    -- Photos
    profile_images TEXT[] DEFAULT '{}',
    profile_images_count INTEGER DEFAULT 0,
    id_card_image_url TEXT,
    id_card_owner_type TEXT DEFAULT 'candidate',
    id_card_uploaded_at TIMESTAMP,
    id_card_verified BOOLEAN DEFAULT FALSE,
    
    -- References
    reference_1_name VARCHAR(200),
    reference_1_phone VARCHAR(50),
    reference_2_name VARCHAR(200),
    reference_2_phone VARCHAR(50),
    reference_3_name VARCHAR(200),
    reference_3_phone VARCHAR(50),
    family_reference_name VARCHAR(200),
    family_reference_phone VARCHAR(50),
    rabbi_name VARCHAR(200),
    rabbi_phone VARCHAR(50),
    mechutanim_name VARCHAR(200),
    mechutanim_phone VARCHAR(50),
    
    -- Hidden Details (Part B)
    full_address TEXT,
    
    -- Search Preferences (Part C)
    search_min_age INTEGER,
    search_max_age INTEGER,
    search_sector TEXT,
    search_height_min INTEGER,
    search_height_max INTEGER,
    search_body_types TEXT, -- JSON array
    search_appearances TEXT, -- JSON array
    search_skin_tones TEXT, -- JSON array
    search_statuses TEXT, -- JSON array
    search_backgrounds TEXT, -- JSON array
    unwanted_heritages TEXT, -- JSON array
    mixed_heritage_ok BOOLEAN,
    search_financial_min VARCHAR(100),
    search_financial_discuss BOOLEAN,
    search_occupations TEXT,
    search_life_aspirations TEXT,
    
    -- Approval System
    is_profile_pending BOOLEAN DEFAULT FALSE,
    pending_changes JSONB,
    pending_changes_at TIMESTAMP,
    
    -- System Preferences
    email_notifications_enabled BOOLEAN DEFAULT TRUE
);

-- ==========================================
-- TABLE 2: connections (User connections)
-- ==========================================
CREATE TABLE connections (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, rejected, waiting_for_shadchan
    sender_final_approve BOOLEAN DEFAULT FALSE,
    receiver_final_approve BOOLEAN DEFAULT FALSE,
    last_action_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- TABLE 3: matches (Managed matches)
-- ==========================================
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    boy_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    girl_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'proposal',
    boy_saw_photo BOOLEAN DEFAULT FALSE,
    girl_saw_photo BOOLEAN DEFAULT FALSE,
    shadchan_internal_notes TEXT,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    UNIQUE(boy_id, girl_id)
);

-- ==========================================
-- TABLE 4: messages (Messages)
-- ==========================================
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'user', -- user, system, admin_notification, photo_request, photo_response
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- TABLE 5: notifications (Notifications)
-- ==========================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100),
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- TABLE 6: photo_approvals (Photo access)
-- ==========================================
CREATE TABLE photo_approvals (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    target_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    auto_approve BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requester_id, target_id)
);

-- ==========================================
-- TABLE 7: hidden_profiles (Hidden profiles)
-- ==========================================
CREATE TABLE hidden_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    hidden_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, hidden_user_id)
);

-- ==========================================
-- Create Indexes for Performance
-- ==========================================
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_is_approved ON users(is_approved);
CREATE INDEX idx_connections_sender ON connections(sender_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_messages_to_user ON messages(to_user_id);
CREATE INDEX idx_messages_from_user ON messages(from_user_id);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- ==========================================
-- Create Initial Admin User
-- ==========================================
-- Password: admin123 (hashed with bcrypt)
INSERT INTO users (
    id, phone, email, password, full_name, 
    is_admin, is_approved, is_active, gender
) VALUES (
    1, 
    '0000000000', 
    'admin@hapinkas.com',
    '$2b$10$YourHashedPasswordHere', -- You'll need to hash this
    'מנהל המערכת',
    TRUE,
    TRUE,
    TRUE,
    'male'
) ON CONFLICT (id) DO NOTHING;

-- Reset sequence to start from 2
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- ==========================================
-- Success Message
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE '📊 Tables created: users, connections, matches, messages, notifications, photo_approvals, hidden_profiles';
    RAISE NOTICE '👤 Admin user created (ID: 1)';
END $$;
