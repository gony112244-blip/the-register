--
-- PostgreSQL database dump
--

\restrict KaVaB0oyTOlQDKrEbT4Ja9UjyNo9fCWX6Y9X76WtcM7h3Vidkr5C1DDXM2CcMK4

-- Dumped from database version 18.2
-- Dumped by pg_dump version 18.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: connections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.connections (
    id integer NOT NULL,
    sender_id integer,
    receiver_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    sender_final_approve boolean DEFAULT false,
    receiver_final_approve boolean DEFAULT false,
    last_action_by integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    shadchanit_id integer,
    match_succeeded boolean,
    fail_reason text,
    close_summary text,
    closed_at timestamp without time zone
);


ALTER TABLE public.connections OWNER TO postgres;

--
-- Name: connections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.connections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.connections_id_seq OWNER TO postgres;

--
-- Name: connections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.connections_id_seq OWNED BY public.connections.id;


--
-- Name: hidden_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.hidden_profiles (
    id integer NOT NULL,
    user_id integer,
    hidden_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.hidden_profiles OWNER TO postgres;

--
-- Name: hidden_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.hidden_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.hidden_profiles_id_seq OWNER TO postgres;

--
-- Name: hidden_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.hidden_profiles_id_seq OWNED BY public.hidden_profiles.id;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    boy_id integer,
    girl_id integer,
    status character varying(50) DEFAULT 'proposal'::character varying,
    boy_saw_photo boolean DEFAULT false,
    girl_saw_photo boolean DEFAULT false,
    shadchan_internal_notes text,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone
);


ALTER TABLE public.matches OWNER TO postgres;

--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.matches_id_seq OWNER TO postgres;

--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    from_user_id integer,
    to_user_id integer,
    content text NOT NULL,
    type character varying(50) DEFAULT 'user'::character varying,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO postgres;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    title character varying(100),
    message text,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO postgres;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: photo_approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.photo_approvals (
    id integer NOT NULL,
    requester_id integer,
    target_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    auto_approve boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    connection_id integer
);


ALTER TABLE public.photo_approvals OWNER TO postgres;

--
-- Name: photo_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.photo_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.photo_approvals_id_seq OWNER TO postgres;

--
-- Name: photo_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.photo_approvals_id_seq OWNED BY public.photo_approvals.id;


--
-- Name: shadchaniot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shadchaniot (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    phone character varying(50),
    email character varying(255),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shadchaniot OWNER TO postgres;

--
-- Name: shadchaniot_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shadchaniot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shadchaniot_id_seq OWNER TO postgres;

--
-- Name: shadchaniot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shadchaniot_id_seq OWNED BY public.shadchaniot.id;


--
-- Name: user_images; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_images (
    id integer NOT NULL,
    user_id integer,
    image_url text NOT NULL,
    is_approved boolean DEFAULT false,
    uploaded_at timestamp without time zone DEFAULT now(),
    approved_at timestamp without time zone,
    rejected_at timestamp without time zone,
    rejection_reason text
);


ALTER TABLE public.user_images OWNER TO postgres;

--
-- Name: user_images_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_images_id_seq OWNER TO postgres;

--
-- Name: user_images_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_images_id_seq OWNED BY public.user_images.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    password character varying(255) NOT NULL,
    full_name text,
    last_name character varying(100),
    age integer,
    birth_date date,
    gender text,
    height numeric(5,2),
    city character varying(255),
    is_admin boolean DEFAULT false,
    is_approved boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_blocked boolean DEFAULT false,
    blocked_reason text,
    created_at timestamp without time zone DEFAULT now(),
    last_login timestamp without time zone DEFAULT now(),
    status character varying(20),
    has_children boolean DEFAULT false,
    children_count integer,
    country_of_birth character varying(100),
    contact_person_type character varying(50),
    contact_person_name character varying(100),
    contact_phone_1 character varying(50),
    contact_phone_2 character varying(50),
    family_background character varying(50),
    heritage_sector text,
    father_occupation character varying(200),
    mother_occupation character varying(200),
    father_heritage character varying(100),
    mother_heritage character varying(100),
    father_full_name character varying(200),
    mother_full_name character varying(200),
    siblings_count integer,
    sibling_position integer,
    siblings_details text,
    body_type character varying(30),
    skin_tone character varying(50),
    appearance character varying(30),
    apartment_help character varying(100),
    apartment_amount character varying(100),
    current_occupation character varying(30),
    yeshiva_name character varying(255),
    yeshiva_ketana_name character varying(255),
    work_field character varying(200),
    life_aspiration character varying(255),
    favorite_study character varying(255),
    occupation_details text,
    study_place character varying(255),
    study_field character varying(200),
    about_me text,
    home_style text,
    partner_description text,
    important_in_life text,
    profile_images text[] DEFAULT '{}'::text[],
    profile_images_count integer DEFAULT 0,
    id_card_image_url text,
    id_card_owner_type text DEFAULT 'candidate'::text,
    id_card_uploaded_at timestamp without time zone,
    id_card_verified boolean DEFAULT false,
    reference_1_name character varying(200),
    reference_1_phone character varying(50),
    reference_2_name character varying(200),
    reference_2_phone character varying(50),
    reference_3_name character varying(200),
    reference_3_phone character varying(50),
    family_reference_name character varying(200),
    family_reference_phone character varying(50),
    rabbi_name character varying(200),
    rabbi_phone character varying(50),
    mechutanim_name character varying(200),
    mechutanim_phone character varying(50),
    full_address text,
    search_min_age integer,
    search_max_age integer,
    search_sector text,
    search_height_min integer,
    search_height_max integer,
    search_body_types text,
    search_appearances text,
    search_skin_tones text,
    search_statuses text,
    search_backgrounds text,
    unwanted_heritages text,
    mixed_heritage_ok boolean,
    search_financial_min character varying(100),
    search_financial_discuss boolean,
    search_occupations text,
    search_life_aspirations text,
    is_profile_pending boolean DEFAULT false,
    pending_changes jsonb,
    pending_changes_at timestamp without time zone,
    email_notifications_enabled boolean DEFAULT true,
    search_heritage_sectors text,
    blocked_at timestamp without time zone,
    sector text,
    admin_notes text,
    contact_person_phone character varying(50),
    profile_edit_count integer DEFAULT 0,
    is_email_verified boolean DEFAULT false,
    email_verification_code character varying(6),
    real_id_number character varying(20),
    never_ask_email boolean DEFAULT false,
    email_skip_verification boolean DEFAULT false
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: connections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections ALTER COLUMN id SET DEFAULT nextval('public.connections_id_seq'::regclass);


--
-- Name: hidden_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hidden_profiles ALTER COLUMN id SET DEFAULT nextval('public.hidden_profiles_id_seq'::regclass);


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: photo_approvals id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photo_approvals ALTER COLUMN id SET DEFAULT nextval('public.photo_approvals_id_seq'::regclass);


--
-- Name: shadchaniot id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shadchaniot ALTER COLUMN id SET DEFAULT nextval('public.shadchaniot_id_seq'::regclass);


--
-- Name: user_images id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_images ALTER COLUMN id SET DEFAULT nextval('public.user_images_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: connections; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.connections (id, sender_id, receiver_id, status, sender_final_approve, receiver_final_approve, last_action_by, created_at, updated_at, shadchanit_id, match_succeeded, fail_reason, close_summary, closed_at) FROM stdin;
21	200	245	pending	f	f	\N	2026-03-15 01:30:19.914431	2026-03-15 01:30:19.914431	\N	\N	\N	\N	\N
22	201	246	pending	f	f	\N	2026-03-15 01:31:02.620436	2026-03-15 01:31:02.620436	\N	\N	\N	\N	\N
23	251	249	rejected	f	f	\N	2026-03-15 18:14:21.077977	2026-03-15 18:14:21.077977	\N	\N	\N	\N	\N
24	249	204	pending	f	f	\N	2026-03-15 18:35:22.257387	2026-03-15 18:35:22.257387	\N	\N	\N	\N	\N
25	258	257	rejected	t	t	257	2026-03-15 23:59:30.307508	2026-03-16 00:05:53.493305	2	f	44	454	2026-03-16 18:41:00.36241
27	258	257	cancelled	f	f	257	2026-03-16 18:52:44.557887	2026-03-16 20:10:17.486374	\N	\N	\N	\N	\N
\.


--
-- Data for Name: hidden_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.hidden_profiles (id, user_id, hidden_user_id, created_at) FROM stdin;
4	257	246	2026-03-16 11:43:50.428328
5	257	252	2026-03-16 11:44:05.694591
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.matches (id, boy_id, girl_id, status, boy_saw_photo, girl_saw_photo, shadchan_internal_notes, started_at, ended_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.messages (id, from_user_id, to_user_id, content, type, is_read, created_at) FROM stdin;
44	1	1	test	system	t	2026-03-10 16:53:29.493145
105	1	250	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 01:53:58.095621
106	250	1	📷 חיי העלה צילום תעודת זהות של המועמד (הועלה ע"י הורה).\nנא לאמת את הזהות.	admin_notification	f	2026-03-15 01:55:38.620826
107	1	250	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 01:56:25.177028
108	202	1	📷 יצחק העלה צילום תעודת זהות של המועמד (הועלה ע"י הורה).\nנא לאמת את הזהות.	admin_notification	f	2026-03-15 02:40:00.424649
109	202	1	📝 יצחק מבקש לשנות את הפרופיל שלו.\nשדות ששונו: full_name, last_name, age, gender, country_of_birth, city, status, has_children, children_count, contact_person_type, contact_person_name, contact_phone_1, contact_phone_2, family_background, heritage_sector, father_occupation, mother_occupation, father_heritage, mother_heritage, siblings_count, sibling_position, height, body_type, skin_tone, appearance, apartment_help, apartment_amount, current_occupation, yeshiva_name, yeshiva_ketana_name, work_field, life_aspiration, favorite_study, study_place, study_field, occupation_details, about_me, home_style, partner_description, important_in_life, email, full_address, father_full_name, mother_full_name, siblings_details, reference_1_name, reference_1_phone, reference_2_name, reference_2_phone, reference_3_name, reference_3_phone, family_reference_name, family_reference_phone, rabbi_name, rabbi_phone, mechutanim_name, mechutanim_phone, search_min_age, search_max_age, search_height_min, search_height_max, search_body_types, search_appearances, search_statuses, search_backgrounds, search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss, search_occupations, search_life_aspirations, is_approved, id_card_image_url, profile_images, id_card_owner_type, id, is_admin, birth_date, phone, is_active, is_blocked, created_at, last_login, profile_images_count, id_card_verified, is_profile_pending, email_notifications_enabled, profile_edit_count, is_email_verified\nזו בקשת העריכה מספר 1 שלו.	admin_notification	f	2026-03-15 02:40:05.624643
110	1	252	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 12:37:45.879866
111	252	1	📷 thh העלה צילום תעודת זהות של המועמד (הועלה ע"י הורה).\nנא לאמת את הזהות.	admin_notification	f	2026-03-15 12:42:24.15603
112	1	202	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 12:43:31.143678
113	1	252	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 12:43:49.215385
114	1	253	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 14:06:54.320739
115	1	254	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 16:54:08.085978
116	1	255	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 17:00:37.803567
117	1	256	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 17:13:11.977332
118	250	1	📝 אהרון מבקש לשנות את הפרופיל שלו.\nשדות ששונו: full_name, last_name, age, gender, country_of_birth, city, status, has_children, children_count, contact_person_type, contact_person_name, contact_phone_1, contact_phone_2, family_background, heritage_sector, father_occupation, mother_occupation, father_heritage, mother_heritage, siblings_count, sibling_position, height, body_type, skin_tone, appearance, apartment_help, apartment_amount, current_occupation, yeshiva_name, yeshiva_ketana_name, work_field, life_aspiration, favorite_study, study_place, study_field, occupation_details, about_me, home_style, partner_description, important_in_life, email, full_address, father_full_name, mother_full_name, siblings_details, reference_1_name, reference_1_phone, reference_2_name, reference_2_phone, reference_3_name, reference_3_phone, family_reference_name, family_reference_phone, rabbi_name, rabbi_phone, mechutanim_name, mechutanim_phone, search_min_age, search_max_age, search_height_min, search_height_max, search_body_types, search_appearances, search_statuses, search_backgrounds, search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss, search_occupations, search_life_aspirations, is_approved, id_card_image_url, profile_images, id_card_owner_type, id, is_admin, birth_date, phone, is_email_verified, email_notifications_enabled, never_ask_email, is_active, is_blocked, created_at, last_login, profile_images_count, id_card_uploaded_at, id_card_verified, is_profile_pending, profile_edit_count, email_verification_code, search_skin_tones\nזו בקשת העריכה מספר 1 שלו.	admin_notification	f	2026-03-15 18:08:54.765747
119	1	253	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 18:09:44.025909
120	1	254	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 18:09:51.699184
121	1	255	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 18:09:57.274202
122	1	256	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 18:10:00.954183
123	1	250	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 18:10:06.430263
124	251	1	📷 יוסף העלה צילום תעודת זהות של המועמד (הועלה ע"י הורה).\nנא לאמת את הזהות.	admin_notification	f	2026-03-15 18:16:41.502383
126	257	1	📷 גוני  העלה צילום תעודת זהות של המועמד (הועלה ע"י הורה).\nנא לאמת את הזהות.	admin_notification	f	2026-03-15 19:58:09.937907
127	1	258	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-15 20:00:53.678602
128	258	1	📷 לאה העלה צילום תעודת זהות של המועמד (הועלה ע"י הורה).\nנא לאמת את הזהות.	admin_notification	f	2026-03-15 20:03:31.726868
130	1	258	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 20:04:54.727258
131	257	1	📝 גוני מבקש לשנות את הפרופיל שלו.\nשדות ששונו: full_name, last_name, age, gender, country_of_birth, city, status, has_children, children_count, contact_person_type, contact_person_name, contact_phone_1, contact_phone_2, family_background, heritage_sector, father_occupation, mother_occupation, father_heritage, mother_heritage, siblings_count, sibling_position, height, body_type, skin_tone, appearance, apartment_help, apartment_amount, current_occupation, yeshiva_name, yeshiva_ketana_name, work_field, life_aspiration, favorite_study, study_place, study_field, occupation_details, about_me, home_style, partner_description, important_in_life, email, full_address, father_full_name, mother_full_name, siblings_details, reference_1_name, reference_1_phone, reference_2_name, reference_2_phone, reference_3_name, reference_3_phone, family_reference_name, family_reference_phone, rabbi_name, rabbi_phone, mechutanim_name, mechutanim_phone, search_min_age, search_max_age, search_height_min, search_height_max, search_body_types, search_appearances, search_statuses, search_backgrounds, search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss, search_occupations, search_life_aspirations, is_approved, id_card_image_url, profile_images, id_card_owner_type, id, is_admin, birth_date, phone, is_email_verified, email_notifications_enabled, never_ask_email, is_active, is_blocked, created_at, last_login, profile_images_count, id_card_uploaded_at, id_card_verified, is_profile_pending, profile_edit_count, email_verification_code, search_skin_tones\nזו בקשת העריכה מספר 1 שלו.	admin_notification	f	2026-03-15 20:41:54.228714
133	258	1	📝 אברהם מבקש לשנות את הפרופיל שלו.\nשדות ששונו: full_name, last_name, age, gender, country_of_birth, city, status, has_children, children_count, contact_person_type, contact_person_name, contact_phone_1, contact_phone_2, family_background, heritage_sector, father_occupation, mother_occupation, father_heritage, mother_heritage, siblings_count, sibling_position, height, body_type, skin_tone, appearance, apartment_help, apartment_amount, current_occupation, yeshiva_name, yeshiva_ketana_name, work_field, life_aspiration, favorite_study, study_place, study_field, occupation_details, about_me, home_style, partner_description, important_in_life, email, full_address, father_full_name, mother_full_name, siblings_details, reference_1_name, reference_1_phone, reference_2_name, reference_2_phone, reference_3_name, reference_3_phone, family_reference_name, family_reference_phone, rabbi_name, rabbi_phone, mechutanim_name, mechutanim_phone, search_min_age, search_max_age, search_height_min, search_height_max, search_body_types, search_appearances, search_statuses, search_backgrounds, search_heritage_sectors, mixed_heritage_ok, search_financial_min, search_financial_discuss, search_occupations, search_life_aspirations, is_approved, id_card_image_url, profile_images, id_card_owner_type, id, is_admin, birth_date, phone, is_email_verified, email_notifications_enabled, never_ask_email, is_active, is_blocked, created_at, last_login, profile_images_count, id_card_uploaded_at, id_card_verified, is_profile_pending, profile_edit_count, email_verification_code, search_skin_tones\nזו בקשת העריכה מספר 1 שלו.	admin_notification	f	2026-03-15 21:14:22.490848
134	1	258	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	f	2026-03-15 21:23:17.030772
136	257	258	✅ גוני אישר/ה צפייה בתמונות!	photo_response	f	2026-03-16 00:05:55.979206
135	258	257	📷 לאה מבקש/ת לראות את התמונות שלך	photo_request	t	2026-03-15 23:57:50.378586
132	1	257	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	t	2026-03-15 21:11:30.066475
129	1	257	✅ השינויים בפרופיל אושרו על ידי המנהל!	system	t	2026-03-15 20:04:49.711272
125	1	257	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	t	2026-03-15 19:54:07.662179
137	257	252	📷 גוני מבקש/ת לראות את התמונות שלך	photo_request	f	2026-03-16 11:43:08.112905
138	1	258	📬 הודעה מהמנהל:\n4654645	admin_message	f	2026-03-16 18:13:44.477315
139	1	258	📬 הודעה מהמנהל:\n46846846464646666666666666	admin_message	f	2026-03-16 18:51:53.259806
140	257	258	💔 גוני ביטל/ה את השידוך.\nסיבה: לצערנו, לאחר בירורים נראה שאנחנו פחות מתאימים זה לזה	system	t	2026-03-16 20:33:10.926351
141	1	259	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-17 13:21:01.013804
142	1	260	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-17 15:10:21.836051
143	1	261	👋 ברוכים הבאים ל"הפנקס"! \nנא להשלים את הפרופיל בטאב "הפרופיל שלי" כדי להתחיל לקבל הצעות.	system	f	2026-03-20 12:26:25.296743
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, user_id, title, message, is_read, created_at) FROM stdin;
\.


--
-- Data for Name: photo_approvals; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.photo_approvals (id, requester_id, target_id, status, auto_approve, created_at, updated_at, connection_id) FROM stdin;
1	258	257	approved	f	2026-03-15 23:57:50.343968	2026-03-16 00:05:55.967996	\N
2	257	258	approved	f	2026-03-16 00:05:55.972749	2026-03-16 00:05:55.972749	\N
\.


--
-- Data for Name: shadchaniot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.shadchaniot (id, name, phone, email, created_at) FROM stdin;
2	לאה	55555555	gony112244@gmail.com	2026-03-16 18:39:58.67533
\.


--
-- Data for Name: user_images; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_images (id, user_id, image_url, is_approved, uploaded_at, approved_at, rejected_at, rejection_reason) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, phone, email, password, full_name, last_name, age, birth_date, gender, height, city, is_admin, is_approved, is_active, is_blocked, blocked_reason, created_at, last_login, status, has_children, children_count, country_of_birth, contact_person_type, contact_person_name, contact_phone_1, contact_phone_2, family_background, heritage_sector, father_occupation, mother_occupation, father_heritage, mother_heritage, father_full_name, mother_full_name, siblings_count, sibling_position, siblings_details, body_type, skin_tone, appearance, apartment_help, apartment_amount, current_occupation, yeshiva_name, yeshiva_ketana_name, work_field, life_aspiration, favorite_study, occupation_details, study_place, study_field, about_me, home_style, partner_description, important_in_life, profile_images, profile_images_count, id_card_image_url, id_card_owner_type, id_card_uploaded_at, id_card_verified, reference_1_name, reference_1_phone, reference_2_name, reference_2_phone, reference_3_name, reference_3_phone, family_reference_name, family_reference_phone, rabbi_name, rabbi_phone, mechutanim_name, mechutanim_phone, full_address, search_min_age, search_max_age, search_sector, search_height_min, search_height_max, search_body_types, search_appearances, search_skin_tones, search_statuses, search_backgrounds, unwanted_heritages, mixed_heritage_ok, search_financial_min, search_financial_discuss, search_occupations, search_life_aspirations, is_profile_pending, pending_changes, pending_changes_at, email_notifications_enabled, search_heritage_sectors, blocked_at, sector, admin_notes, contact_person_phone, profile_edit_count, is_email_verified, email_verification_code, real_id_number, never_ask_email, email_skip_verification) FROM stdin;
213	0600000013	fullseed_13@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	לוי	רוזנבלום	32	\N	male	178.00	מודיעין עילית	f	t	t	f	\N	2026-03-15 01:24:47.38704	2026-03-15 01:24:47.38704	single	f	0	\N	parent	נחמן וייס	055-9949143	050-5115958	dati_leumi	sephardi	אברך כולל	מורה	ashkenazi	sephardi	אלחנן ברגר	אסתר גרוס	4	3	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	handsome	yes (200000)	200000	both	תושיה	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב וייס	050-1111111	יעקב רוזנבלום	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג וייס	02-5556666	משפחת גולדשטיין	03-7778888	מודיעין עילית, רחוב הורדים 44	28	38	\N	163	183	average	handsome,very_handsome	\N	single	dati_leumi,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
220	0600000020	fullseed_20@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	עמרם	כהן	25	\N	male	185.00	ירושלים	f	t	t	f	\N	2026-03-15 01:24:47.403025	2026-03-15 01:24:47.403025	single	f	0	\N	parent	שלמה כץ	057-5113044	051-6642677	haredi	ashkenazi	אברך כולל	מורה	ashkenazi	ashkenazi	רפאל גולדברג	ביינה כץ	8	2	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	fair	yes (200000)	200000	fixed_times	מיר	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב גרוס	050-1111111	דוד קליין	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג כהן	02-5556666	משפחת גולדשטיין	03-7778888	ירושלים, רחוב הורדים 10	21	31	\N	170	190	average	fair,ok	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
225	0600000025	fullseed_25@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	רחל	וייס	30	\N	female	155.00	ירושלים	f	t	t	f	\N	2026-03-15 01:24:47.413811	2026-03-15 01:24:47.413811	single	f	0	\N	parent	מאיר שוורץ	052-2271456	057-3363513	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	ashkenazi	ashkenazi	דוד ברגר	יהודית גולדברג	7	1	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	fair	yes (200000)	200000	working			חינוך	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	נעמה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב דייטש	050-1111111	גבריאל פרידמן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג אדלר	02-5556666	משפחת גולדשטיין	03-7778888	ירושלים, רחוב הורדים 76	26	36	\N	150	175	average	fair,ok	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
231	0600000031	fullseed_31@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אסתר	שטרן	22	\N	female	161.00	נתניה	f	t	t	f	\N	2026-03-15 01:24:47.430036	2026-03-15 01:24:47.430036	single	f	0	\N	parent	עמרם כהן	051-9957816	052-7142253	masorti	teimani	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	מאיר ברגר	חנה דייטש	7	1	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	ok	yes (200000)	200000	working			שיווק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	עמינח	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שור	050-1111111	אריאל ברגר	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שטרן	02-5556666	משפחת גולדשטיין	03-7778888	נתניה, רחוב הורדים 46	18	28	\N	156	181	full	ok,good	\N	single	masorti,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
237	0600000037	fullseed_37@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	פייגי	הרשקוביץ	28	\N	female	167.00	אלעד	f	t	t	f	\N	2026-03-15 01:24:47.445926	2026-03-15 01:24:47.445926	single	f	0	\N	parent	דוד גולדברג	050-4742208	055-7533655	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	sephardi	sephardi	רפאל שטרן	מרים דייטש	4	1	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	good	yes (200000)	200000	working			הייטק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שפירא	050-1111111	גבריאל מזרחי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג אדלר	02-5556666	משפחת גולדשטיין	03-7778888	אלעד, רחוב הורדים 21	24	34	\N	162	187	average	good,handsome	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
243	0600000043	fullseed_43@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	מלכה	שפירא	20	\N	female	173.00	צפת	f	t	t	f	\N	2026-03-15 01:24:47.462487	2026-03-15 01:24:47.462487	single	f	0	\N	parent	שמואל לוי	051-2057441	055-2017813	masorti	teimani	מורה ב'בית יעקב'	גננת	sephardi	sephardi	נחמן לוי	רבקה ברגר	7	4	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	handsome	yes (200000)	200000	working			חשבונאות	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב כץ	050-1111111	אלחנן שטרן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג פרידמן	02-5556666	משפחת גולדשטיין	03-7778888	צפת, רחוב הורדים 29	18	26	\N	168	193	full	handsome,very_handsome	\N	single	masorti,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
261	051213131	gony112244@gmail.com	$2b$10$BdoEJ1jlGgGMsKhydFjPLe1Pj/UDeocRQnbMaNeZ6WIcHsBIXjzfW	hhkljnjnjnj	\N	\N	\N	\N	\N	\N	f	f	t	f	\N	2026-03-20 12:26:25.263137	2026-03-20 12:26:25.263137	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	508582	\N	f	f
255	0549898155	gony112244@gmail.com	$2b$10$9RI5Y9V6AYm6CVwT4UdHIOhAku6GDZyDxuvWh9IvmXfvxTe9bnkrO	יי	\N	\N	\N	\N	\N	\N	f	t	t	f	\N	2026-03-15 17:00:37.769077	2026-03-15 17:00:37.769077	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	682680	\N	t	f
256	0511111111	\N	$2b$10$dfQXUM9GCCWX13SiEFtYSe3jNtu/lLxKsYisxLS4edCG9tzjMYVPi	fgfgfgg	\N	\N	\N	\N	\N	\N	f	t	t	f	\N	2026-03-15 17:13:11.952099	2026-03-15 17:13:11.952099	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	f	\N	\N	\N	\N	\N	0	f	300421	\N	t	f
1	0000000000	admin@hapinkas.com	$2b$10$4LbX13L1m/3CJS3t/khMkuyzkxaLdEw5js5oHEpH4TiYV59HIBS/i	מנהל המערכת	\N	\N	\N	male	\N	\N	t	t	t	f	\N	2026-02-17 21:25:27.171627	2026-03-16 14:44:48.076454	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	\N	\N	f	f
259	0522334343	gony112244@gmail.com	$2b$10$ewW8c91bqFnCKhN/aIWyb.YwPoa.yUEjhA0CIFfl97jSlnjtEV.uK	גוני	\N	\N	\N	\N	\N	\N	f	f	t	f	\N	2026-03-17 13:21:00.964739	2026-03-17 13:21:00.964739	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	570142	\N	f	f
268	0599001001	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו בחור א	כהן	24	2001-06-01	male	178.00	ירושלים	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	single	f	0	israel	self	\N	0599001001	\N	haredi	ashkenazi	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	average	light	good	no	\N	studying	ישיבת דמו	\N	\N	study_only	\N	\N	\N	\N	משתמש דמו לבדיקת התאמות.	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	18	55	\N	140	200	very_thin,thin,average_thin,average,average_full,full	fair,ok,good,handsome,very_handsome,stunning	\N	single,divorced,widower	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi,teimani,mixed	\N	\N	\N	\N	0	t	\N	\N	f	f
269	0599001002	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו בת א	לוי	22	2003-03-15	female	165.00	בני ברק	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	single	f	0	israel	self	\N	0599001002	\N	haredi	ashkenazi	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	thin	light	ok	no	\N	studying	\N	\N	\N	study_only	\N	\N	סמינר דמו	\N	משתמשת דמו לבדיקת התאמות.	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	18	55	\N	140	200	very_thin,thin,average_thin,average,average_full,full	fair,ok,good,handsome,very_handsome,stunning	\N	single,divorced,widower	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi,teimani,mixed	\N	\N	\N	\N	0	t	\N	\N	f	f
253	054000000	gony112244@gmail.com	$2b$10$xZOKUR6PeQebkz7/hloUvOXqLr3PUiREmQP3vOr7HSFMEzO6GJ7/G	קחכק	\N	\N	\N	\N	\N	\N	f	t	t	f	\N	2026-03-15 14:06:54.268334	2026-03-15 14:06:54.268334	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	819950	\N	f	f
270	0599001003	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו בחור ב	מזרחי	28	1997-11-20	male	182.00	בית שמש	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	single	f	0	israel	self	\N	0599001003	\N	dati_leumi	sephardi	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	average	medium	handsome	no	\N	working	\N	\N	הייטק	study_and_work	\N	\N	\N	\N	דמו שני – בודקים סינון.	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	18	55	\N	140	200	very_thin,thin,average_thin,average,average_full,full	fair,ok,good,handsome,very_handsome,stunning	\N	single,divorced,widower	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi,teimani,mixed	\N	\N	\N	\N	0	t	\N	\N	f	f
271	0599001004	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו בת ב	עמר	26	1999-08-10	female	162.00	מודיעין	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	single	f	0	israel	self	\N	0599001004	\N	dati_leumi	sephardi	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	average	medium	good	no	\N	both	\N	\N	\N	study_and_work	\N	\N	מכללה	\N	דמו שני – נקבה.	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	18	55	\N	140	200	very_thin,thin,average_thin,average,average_full,full	fair,ok,good,handsome,very_handsome,stunning	\N	single,divorced,widower	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi,teimani,mixed	\N	\N	\N	\N	0	t	\N	\N	f	f
251	0500000000	\N	$2b$10$atG9cdp3ckC.0cWuVLq/h.NjsbSIxjsc2r3yNMc6hq/Eme5fkzmOO	יוסף	\N	30	1995-01-01	male	\N	ירושלים	f	t	t	f	\N	2026-03-15 03:09:35.543856	2026-03-15 18:13:22.755031	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	/uploads/idCard-1773591401313-324031150.png	candidate	2026-03-15 18:16:41.477047	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	\N	\N	t	f
272	0599001005	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו בחור ג	חדד	32	1993-01-05	male	170.00	חיפה	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	divorced	f	0	israel	self	\N	0599001005	\N	baal_teshuva	mixed	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	average	light	ok	no	\N	fixed_times	כולל דמו	\N	\N	fixed_times	\N	\N	\N	\N	דמו שלישי – גיל שונה לבדיקת טווח גיל.	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	18	55	\N	140	200	very_thin,thin,average_thin,average,average_full,full	fair,ok,good,handsome,very_handsome,stunning	\N	single,divorced,widower	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi,teimani,mixed	\N	\N	\N	\N	0	t	\N	\N	f	f
273	0599001006	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו בת ג	אברהם	29	1996-12-01	female	168.00	נתניה	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	single	f	0	israel	self	\N	0599001006	\N	masorti	teimani	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	full	tan	fair	no	\N	working	\N	\N	חינוך	work_only	\N	\N	\N	\N	דמו שלישי – נקבה.	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	18	55	\N	140	200	very_thin,thin,average_thin,average,average_full,full	fair,ok,good,handsome,very_handsome,stunning	\N	single,divorced,widower	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi,teimani,mixed	\N	\N	\N	\N	0	t	\N	\N	f	f
274	0599001010	\N	$2b$10$fqWgI6npzfxLeiDGtSPrt.LZ7I.TB4cslN0SPzwk4qJBHUZFmlbDu	דמו חיפוש צר	מבחן	30	1995-05-01	male	180.00	ירושלים	f	t	t	f	\N	2026-03-20 14:04:26.281231	2026-03-20 14:04:26.281231	single	f	0	israel	self	\N	0599001010	\N	dati_leumi	sephardi	\N	\N	\N	\N	אבא דמו	אמא דמו	2	\N	\N	average	medium	good	no	\N	working	\N	\N	הייטק	study_and_work	\N	\N	\N	\N	חיפוש צר לבדיקה: רק בנות גיל 25–26, גובה 161–163, מגזר ספרדי בלבד (בדמו: רק בת ב׳).	\N	\N	\N	{}	0	\N	candidate	\N	f	ממליץ א	0501234567	ממליץ ב	0507654321	\N	\N	\N	\N	\N	\N	\N	\N	כתובת דמו 1	25	26	\N	161	163	thin,average	ok,good	\N	single	haredi,dati_leumi,masorti,baal_teshuva	\N	t	\N	f	studying,working,both,fixed_times	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	sephardi	\N	\N	\N	\N	0	t	\N	\N	f	f
260	054989855	gony112244@gmail.com	$2b$10$s5cn3v8Nrr00kDwwEdzLaO83MjuFE/Dh7Xv/W3GyHQ7MSKuFrP0dO	רקרקרג	\N	\N	\N	\N	\N	\N	f	f	t	f	\N	2026-03-17 15:10:21.792532	2026-03-17 15:10:21.792532	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	f	502897	\N	f	f
254	052222222	gony112244@gmail.com	$2b$10$aEmSXfwsGkOy6zakbwJ6B.ZGhVsLHuaxVEBa2i1.tVn2T/x9bSX4m	hhhh	\N	\N	\N	\N	\N	\N	f	t	t	f	\N	2026-03-15 16:54:08.042735	2026-03-15 16:55:53.156699	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	0	\N	candidate	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	\N	t	\N	\N	\N	\N	\N	0	t	\N	\N	f	f
208	0600000008	fullseed_8@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	שלמה	אדלר	27	\N	male	173.00	צפת	f	t	t	f	\N	2026-03-15 01:24:47.373511	2026-03-15 01:24:47.373511	single	f	0	\N	parent	מרדכי הרשקוביץ	057-5597660	057-9904270	haredi	ashkenazi	אברך כולל	מורה	sephardi	ashkenazi	יוסף דייטש	חיה דייטש	8	2	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	handsome	yes (200000)	200000	fixed_times	בית מתתיהו	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שוורץ	050-1111111	אברהם דייטש	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג הרשקוביץ	02-5556666	משפחת גולדשטיין	03-7778888	צפת, רחוב הורדים 51	23	33	\N	158	178	average	handsome,very_handsome	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
207	0600000007	fullseed_7@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	דוד	כץ	26	\N	male	172.00	אשדוד	f	t	t	f	\N	2026-03-15 01:24:47.370786	2026-03-15 01:24:47.370786	single	f	0	\N	parent	משה רוזנבלום	054-3841087	053-3271990	baal_teshuva	mixed	אברך כולל	מורה	sephardi	ashkenazi	יוסף גולדברג	מרים הרשקוביץ	8	5	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	good	yes (200000)	200000	both	אור ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שפירא	050-1111111	פנחס גולדברג	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג כץ	02-5556666	משפחת גולדשטיין	03-7778888	אשדוד, רחוב הורדים 63	22	32	\N	157	177	full,full	good,handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
209	0600000009	fullseed_9@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	חיים	שור	28	\N	male	174.00	רכסים	f	t	t	f	\N	2026-03-15 01:24:47.377463	2026-03-15 01:24:47.377463	single	f	0	\N	parent	משה גולדברג	054-6524575	052-9072993	dati_leumi	sephardi	אברך כולל	מורה	sephardi	ashkenazi	אלחנן כהן	פרל שוורץ	6	3	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	very_handsome	yes (200000)	200000	studying	תושיה	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב לוי	050-1111111	חיים לוי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שור	02-5556666	משפחת גולדשטיין	03-7778888	רכסים, רחוב הורדים 42	24	34	\N	159	179	average	very_handsome,very_handsome	\N	single	dati_leumi,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
210	0600000010	fullseed_10@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	מרדכי	קנייבסקי	29	\N	male	175.00	ירושלים	f	t	t	f	\N	2026-03-15 01:24:47.380568	2026-03-15 01:24:47.380568	single	f	0	\N	parent	רפאל שוורץ	052-5315904	052-9683860	masorti	teimani	אברך כולל	מורה	sephardi	ashkenazi	אריאל שוורץ	לאה כהן	8	5	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	fair	yes (200000)	200000	both	אור ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הרשקוביץ	050-1111111	אלחנן אדלר	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג דייטש	02-5556666	משפחת גולדשטיין	03-7778888	ירושלים, רחוב הורדים 70	25	35	\N	160	180	full	fair,ok	\N	single	masorti,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
212	0600000012	fullseed_12@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	יוסף	הורוביץ	31	\N	male	177.00	אלעד	f	t	t	f	\N	2026-03-15 01:24:47.384843	2026-03-15 01:24:47.384843	single	f	0	\N	parent	חיים פרידמן	050-7682418	050-1372858	haredi	ashkenazi	אברך כולל	מורה	sephardi	ashkenazi	אלחנן לוי	רבקה קנייבסקי	6	2	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	good	yes (200000)	200000	studying	קול תורה	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הורוביץ	050-1111111	לוי מזרחי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שפירא	02-5556666	משפחת גולדשטיין	03-7778888	אלעד, רחוב הורדים 78	27	37	\N	162	182	average	good,handsome	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
214	0600000014	fullseed_14@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	מאיר	גרוס	19	\N	male	179.00	בית שמש	f	t	t	f	\N	2026-03-15 01:24:47.389331	2026-03-15 01:24:47.389331	single	f	0	\N	parent	רפאל רוזנבלום	056-6148006	053-4375481	masorti	teimani	אברך כולל	מורה	sephardi	sephardi	אברהם כהן	פייגי דייטש	9	1	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	very_handsome	yes (200000)	200000	fixed_times	חברון	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הרשקוביץ	050-1111111	אברהם וייס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג כץ	02-5556666	משפחת גולדשטיין	03-7778888	בית שמש, רחוב הורדים 53	18	25	\N	164	184	full	very_handsome,very_handsome	\N	single	masorti,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
215	0600000015	fullseed_15@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אלעזר	שוורץ	20	\N	male	180.00	ביתר עילית	f	t	t	f	\N	2026-03-15 01:24:47.391973	2026-03-15 01:24:47.391973	single	f	0	\N	parent	נתנאל הרשקוביץ	053-1467776	051-5352708	baal_teshuva	mixed	אברך כולל	מורה	ashkenazi	sephardi	אלחנן רוזנבלום	חנה קנייבסקי	3	1	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	fair	yes (200000)	200000	studying	חברון	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב קנייבסקי	050-1111111	נחמן וייס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גולדברג	02-5556666	משפחת גולדשטיין	03-7778888	ביתר עילית, רחוב הורדים 25	18	26	\N	165	185	full,full	fair,ok	\N	single	baal_teshuva,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
216	0600000016	fullseed_16@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	רפאל	קליין	21	\N	male	181.00	נתניה	f	t	t	f	\N	2026-03-15 01:24:47.394416	2026-03-15 01:24:47.394416	single	f	0	\N	parent	חיים פרידמן	050-3985721	055-5668699	haredi	ashkenazi	אברך כולל	מורה	ashkenazi	sephardi	דוד גרוס	טובה פרידמן	7	5	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	ok	yes (200000)	200000	both	מיר	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הורוביץ	050-1111111	אריאל קנייבסקי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג ברגר	02-5556666	משפחת גולדשטיין	03-7778888	נתניה, רחוב הורדים 8	18	27	\N	166	186	average	ok,good	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
217	0600000017	fullseed_17@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	גבריאל	הרשקוביץ	22	\N	male	182.00	אשדוד	f	t	t	f	\N	2026-03-15 01:24:47.396236	2026-03-15 01:24:47.396236	single	f	0	\N	parent	אהרון וייס	053-5653075	056-8046579	dati_leumi	sephardi	אברך כולל	מורה	ashkenazi	sephardi	שלמה גרוס	רוחמה שור	8	5	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	good	yes (200000)	200000	fixed_times	אור ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב קליין	050-1111111	לוי כץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג אדלר	02-5556666	משפחת גולדשטיין	03-7778888	אשדוד, רחוב הורדים 34	18	28	\N	167	187	average	good,handsome	\N	single	dati_leumi,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
218	0600000018	fullseed_18@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	נתנאל	ברגר	23	\N	male	183.00	צפת	f	t	t	f	\N	2026-03-15 01:24:47.398589	2026-03-15 01:24:47.398589	single	f	0	\N	parent	שמואל שפירא	050-5340894	058-6789978	masorti	teimani	אברך כולל	מורה	ashkenazi	ashkenazi	פנחס שוורץ	טובה לוי	3	1	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	handsome	yes (200000)	200000	studying	עטרת ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הורוביץ	050-1111111	אהרון קנייבסקי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שטרן	02-5556666	משפחת גולדשטיין	03-7778888	צפת, רחוב הורדים 79	19	29	\N	168	188	full	handsome,very_handsome	\N	single	masorti,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
221	0600000021	fullseed_21@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	פינחס	לוי	26	\N	male	186.00	בני ברק	f	t	t	f	\N	2026-03-15 01:24:47.405336	2026-03-15 01:24:47.405336	single	f	0	\N	parent	נתנאל מזרחי	052-7459985	054-4335504	dati_leumi	sephardi	אברך כולל	מורה	sephardi	sephardi	גבריאל פרידמן	אביגיל ברגר	8	3	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	ok	yes (200000)	200000	studying	עטרת ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הורוביץ	050-1111111	אלחנן שטרן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג הרשקוביץ	02-5556666	משפחת גולדשטיין	03-7778888	בני ברק, רחוב הורדים 30	22	32	\N	171	191	average	ok,good	\N	single	dati_leumi,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
219	0600000019	fullseed_19@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אריאל	דייטש	24	\N	male	184.00	רכסים	f	t	t	f	\N	2026-03-15 01:24:47.400681	2026-03-15 01:24:47.400681	single	f	0	\N	parent	גבריאל הורוביץ	058-6050130	053-3398452	baal_teshuva	mixed	אברך כולל	מורה	ashkenazi	sephardi	נתנאל שפירא	נחמה פרידמן	9	1	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	very_handsome	yes (200000)	200000	both	עטרת ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב רוזנבלום	050-1111111	נתנאל וייס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שוורץ	02-5556666	משפחת גולדשטיין	03-7778888	רכסים, רחוב הורדים 61	20	30	\N	169	189	full,full	very_handsome,very_handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
223	0600000023	fullseed_23@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	בן-ציון	שפירא	28	\N	male	188.00	מודיעין עילית	f	t	t	f	\N	2026-03-15 01:24:47.409475	2026-03-15 01:24:47.409475	single	f	0	\N	parent	גבריאל שפירא	056-5005573	052-8678468	baal_teshuva	mixed	אברך כולל	מורה	sephardi	ashkenazi	משה שוורץ	יהודית אדלר	6	2	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	handsome	yes (200000)	200000	fixed_times	חברון	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב גולדברג	050-1111111	שמואל לוי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג וייס	02-5556666	משפחת גולדשטיין	03-7778888	מודיעין עילית, רחוב הורדים 36	24	34	\N	173	193	full,full	handsome,very_handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
222	0600000022	fullseed_22@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אלחנן	מזרחי	27	\N	male	187.00	אלעד	f	t	t	f	\N	2026-03-15 01:24:47.407363	2026-03-15 01:24:47.407363	single	f	0	\N	parent	אהרון כץ	055-9541973	052-1928426	masorti	teimani	אברך כולל	מורה	sephardi	ashkenazi	אריאל גרוס	חנה שפירא	5	5	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	good	yes (200000)	200000	both	מיר	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב ברגר	050-1111111	יוסף גרוס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גרוס	02-5556666	משפחת גולדשטיין	03-7778888	אלעד, רחוב הורדים 14	23	33	\N	172	192	full	good,handsome	\N	single	masorti,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
224	0600000024	fullseed_24@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	נחמן	פרידמן	29	\N	male	189.00	בית שמש	f	t	t	f	\N	2026-03-15 01:24:47.411345	2026-03-15 01:24:47.411345	single	f	0	\N	parent	אלעזר ברגר	053-9868959	052-3551157	haredi	ashkenazi	אברך כולל	מורה	sephardi	sephardi	מאיר לוי	שפרה גרוס	5	1	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	very_handsome	yes (200000)	200000	studying	קול תורה	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב אדלר	050-1111111	אריאל שוורץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג הרשקוביץ	02-5556666	משפחת גולדשטיין	03-7778888	בית שמש, רחוב הורדים 68	25	35	\N	174	194	average	very_handsome,very_handsome	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
226	0600000026	fullseed_26@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	לאה	גולדברג	31	\N	female	156.00	בני ברק	f	t	t	f	\N	2026-03-15 01:24:47.416141	2026-03-15 01:24:47.416141	single	f	0	\N	parent	אברהם אדלר	056-3828114	052-8634467	dati_leumi	sephardi	מורה ב'בית יעקב'	גננת	ashkenazi	ashkenazi	אלחנן קנייבסקי	לאה אדלר	7	1	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	ok	yes (200000)	200000	studying			שיווק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	שבי	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב וייס	050-1111111	רפאל גרוס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גולדברג	02-5556666	משפחת גולדשטיין	03-7778888	בני ברק, רחוב הורדים 49	27	37	\N	151	176	average	ok,good	\N	single	dati_leumi,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
228	0600000028	fullseed_28@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	שרה	אדלר	19	\N	female	158.00	מודיעין עילית	f	t	t	f	\N	2026-03-15 01:24:47.421134	2026-03-15 01:24:47.421134	single	f	0	\N	parent	גבריאל אדלר	055-5278421	051-6521853	baal_teshuva	mixed	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	בן-ציון מזרחי	מלכה לוי	3	1	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	handsome	yes (200000)	200000	working			שיווק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב פרידמן	050-1111111	לוי מזרחי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גולדברג	02-5556666	משפחת גולדשטיין	03-7778888	מודיעין עילית, רחוב הורדים 42	18	25	\N	153	178	full,full	handsome,very_handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
227	0600000027	fullseed_27@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	רבקה	כץ	32	\N	female	157.00	אלעד	f	t	t	f	\N	2026-03-15 01:24:47.418472	2026-03-15 01:24:47.418472	single	f	0	\N	parent	פנחס לוי	055-1676590	058-7892472	masorti	teimani	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	יוסף מזרחי	יהודית פרידמן	6	3	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	good	yes (200000)	200000	both			חשבונאות	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שטרן	050-1111111	שלמה גרוס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג ברגר	02-5556666	משפחת גולדשטיין	03-7778888	אלעד, רחוב הורדים 79	28	38	\N	152	177	full	good,handsome	\N	single	masorti,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
229	0600000029	fullseed_29@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	חנה	שור	20	\N	female	159.00	בית שמש	f	t	t	f	\N	2026-03-15 01:24:47.423924	2026-03-15 01:24:47.423924	single	f	0	\N	parent	פינחס דייטש	057-1758289	056-8505766	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	sephardi	ashkenazi	גבריאל קנייבסקי	רבקה גרוס	3	5	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	very_handsome	yes (200000)	200000	studying			הייטק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בינה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הורוביץ	050-1111111	אברהם שור	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג קנייבסקי	02-5556666	משפחת גולדשטיין	03-7778888	בית שמש, רחוב הורדים 90	18	26	\N	154	179	average	very_handsome,very_handsome	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
230	0600000030	fullseed_30@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	מרים	קנייבסקי	21	\N	female	160.00	ביתר עילית	f	t	t	f	\N	2026-03-15 01:24:47.427774	2026-03-15 01:24:47.427774	single	f	0	\N	parent	שלמה הורוביץ	056-2755718	056-2154615	dati_leumi	sephardi	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	רפאל שור	ביינה כהן	7	4	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	fair	yes (200000)	200000	both			חשבונאות	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	נעמה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב מזרחי	050-1111111	אלעזר כץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שטרן	02-5556666	משפחת גולדשטיין	03-7778888	ביתר עילית, רחוב הורדים 67	18	27	\N	155	180	average	fair,ok	\N	single	dati_leumi,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
233	0600000033	fullseed_33@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	ציפורה	רוזנבלום	24	\N	female	163.00	צפת	f	t	t	f	\N	2026-03-15 01:24:47.435033	2026-03-15 01:24:47.435033	single	f	0	\N	parent	ישראל הורוביץ	051-5718367	054-1489391	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	sephardi	ashkenazi	חיים רוזנבלום	חנה דייטש	4	4	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	handsome	yes (200000)	200000	both			שיווק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בנות ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב מזרחי	050-1111111	לוי שוורץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שור	02-5556666	משפחת גולדשטיין	03-7778888	צפת, רחוב הורדים 83	20	30	\N	158	183	average	handsome,very_handsome	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
232	0600000032	fullseed_32@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	דבורה	הורוביץ	23	\N	female	162.00	אשדוד	f	t	t	f	\N	2026-03-15 01:24:47.432676	2026-03-15 01:24:47.432676	single	f	0	\N	parent	גבריאל פרידמן	056-1168117	051-3364846	baal_teshuva	mixed	מורה ב'בית יעקב'	גננת	ashkenazi	ashkenazi	אלחנן ברגר	פרל שוורץ	4	2	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	good	yes (200000)	200000	studying			חינוך	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בינה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שוורץ	050-1111111	יוסף דייטש	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג וייס	02-5556666	משפחת גולדשטיין	03-7778888	אשדוד, רחוב הורדים 66	19	29	\N	157	182	full,full	good,handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
236	0600000036	fullseed_36@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	בתיה	קליין	27	\N	female	166.00	בני ברק	f	t	t	f	\N	2026-03-15 01:24:47.443302	2026-03-15 01:24:47.443302	single	f	0	\N	parent	ישראל אדלר	051-4926061	051-3179530	baal_teshuva	mixed	מורה ב'בית יעקב'	גננת	ashkenazi	ashkenazi	יצחק רוזנבלום	שרה כהן	8	2	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	ok	yes (200000)	200000	both			עבודה סוציאלית	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בינה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב גרוס	050-1111111	משה וייס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג וייס	02-5556666	משפחת גולדשטיין	03-7778888	בני ברק, רחוב הורדים 31	23	33	\N	161	186	full,full	ok,good	\N	single	baal_teshuva,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
234	0600000034	fullseed_34@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	יהודית	גרוס	25	\N	female	164.00	רכסים	f	t	t	f	\N	2026-03-15 01:24:47.437329	2026-03-15 01:24:47.437329	single	f	0	\N	parent	רפאל כהן	057-1516010	057-3953173	dati_leumi	sephardi	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	שמואל רוזנבלום	טובה כץ	3	1	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	very_handsome	yes (200000)	200000	working			חינוך	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בנות ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב ברגר	050-1111111	אהרון ברגר	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג אדלר	02-5556666	משפחת גולדשטיין	03-7778888	רכסים, רחוב הורדים 30	21	31	\N	159	184	average	very_handsome,very_handsome	\N	single	dati_leumi,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
235	0600000035	fullseed_35@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אביגיל	שוורץ	26	\N	female	165.00	ירושלים	f	t	t	f	\N	2026-03-15 01:24:47.439904	2026-03-15 01:24:47.439904	single	f	0	\N	parent	משה לוי	054-7265824	052-6892339	masorti	teimani	מורה ב'בית יעקב'	גננת	sephardi	sephardi	אהרון מזרחי	בתיה דייטש	4	2	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	fair	yes (200000)	200000	studying			חינוך	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	נעמה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שוורץ	050-1111111	אברהם כהן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג הורוביץ	02-5556666	משפחת גולדשטיין	03-7778888	ירושלים, רחוב הורדים 52	22	32	\N	160	185	full	fair,ok	\N	single	masorti,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
204	0600000004	fullseed_4@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	משה	פרידמן	23	\N	male	169.00	בית שמש	f	t	t	f	\N	2026-03-15 01:24:47.361251	2026-03-15 01:24:47.361251	single	f	0	\N	parent	פנחס אדלר	057-8896542	056-1376866	haredi	ashkenazi	אברך כולל	מורה	sephardi	sephardi	ישראל הורוביץ	ביינה דייטש	6	4	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	very_handsome	yes (200000)	200000	both	פוניבז'	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שפירא	050-1111111	אברהם לוי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שטרן	02-5556666	משפחת גולדשטיין	03-7778888	בית שמש, רחוב הורדים 91	19	29	\N	154	174	average	very_handsome,very_handsome	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
203	0600000003	fullseed_3@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	יעקב	שפירא	22	\N	male	168.00	מודיעין עילית	f	t	t	f	\N	2026-03-15 01:24:47.357863	2026-03-15 01:24:47.357863	single	f	0	\N	parent	פינחס הורוביץ	055-8456220	054-2221245	baal_teshuva	mixed	אברך כולל	מורה	sephardi	sephardi	דוד כהן	רוחמה שוורץ	7	5	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	handsome	yes (200000)	200000	studying	אור ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב וייס	050-1111111	יצחק אדלר	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שטרן	02-5556666	משפחת גולדשטיין	03-7778888	מודיעין עילית, רחוב הורדים 7	18	28	\N	153	173	full,full	handsome,very_handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
205	0600000005	fullseed_5@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אהרון	וייס	24	\N	male	170.00	ביתר עילית	f	t	t	f	\N	2026-03-15 01:24:47.364595	2026-03-15 01:24:47.364595	single	f	0	\N	parent	גבריאל לוי	054-4700008	053-3644798	dati_leumi	sephardi	אברך כולל	מורה	ashkenazi	sephardi	אהרון שור	שרה כץ	5	3	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	fair	yes (200000)	200000	fixed_times	מיר	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שפירא	050-1111111	דוד הורוביץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג אדלר	02-5556666	משפחת גולדשטיין	03-7778888	ביתר עילית, רחוב הורדים 94	20	30	\N	155	175	average	fair,ok	\N	single	dati_leumi,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
201	0600000001	fullseed_1@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	אברהם	לוי	20	\N	male	166.00	בני ברק	f	t	t	f	\N	2026-03-15 01:24:47.35094	2026-03-15 01:30:47.70591	single	f	0	\N	parent	בן-ציון ברגר	054-5343603	051-8357191	dati_leumi	sephardi	אברך כולל	מורה	sephardi	sephardi	אברהם שור	מלכה שפירא	3	4	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	ok	yes (200000)	200000	both	אור ישראל	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הרשקוביץ	050-1111111	אלעזר הרשקוביץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג קנייבסקי	02-5556666	משפחת גולדשטיין	03-7778888	בני ברק, רחוב הורדים 62	18	26	\N	151	171	average	ok,good	\N	single	dati_leumi,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
206	0600000006	fullseed_6@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	שמואל	גולדברג	25	\N	male	171.00	נתניה	f	t	t	f	\N	2026-03-15 01:24:47.367894	2026-03-15 01:24:47.367894	single	f	0	\N	parent	דוד כץ	054-4569768	056-5094437	masorti	teimani	אברך כולל	מורה	sephardi	sephardi	יוסף שוורץ	פנינה אדלר	4	2	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	ok	yes (200000)	200000	studying	בית מתתיהו	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב שטרן	050-1111111	אהרון אדלר	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג הורוביץ	02-5556666	משפחת גולדשטיין	03-7778888	נתניה, רחוב הורדים 71	21	31	\N	156	176	full	ok,good	\N	single	masorti,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
240	0600000040	fullseed_40@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	שירה	כהן	31	\N	female	170.00	ביתר עילית	f	t	t	f	\N	2026-03-15 01:24:47.454059	2026-03-15 01:24:47.454059	single	f	0	\N	parent	יוסף שוורץ	053-3051949	052-1476704	baal_teshuva	mixed	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	שמואל פרידמן	ביינה פרידמן	4	5	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	fair	yes (200000)	200000	working			עבודה סוציאלית	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	נעמה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב ברגר	050-1111111	משה קנייבסקי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גולדברג	02-5556666	משפחת גולדשטיין	03-7778888	ביתר עילית, רחוב הורדים 14	27	37	\N	165	190	full,full	fair,ok	\N	single	baal_teshuva,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
238	0600000038	fullseed_38@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	חיה	ברגר	29	\N	female	168.00	מודיעין עילית	f	t	t	f	\N	2026-03-15 01:24:47.448915	2026-03-15 01:24:47.448915	single	f	0	\N	parent	פנחס שור	057-9077612	053-4781477	dati_leumi	sephardi	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	נתנאל קליין	ציפורה שור	3	4	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	handsome	yes (200000)	200000	studying			הייטק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בינה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב דייטש	050-1111111	אלחנן אדלר	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג קליין	02-5556666	משפחת גולדשטיין	03-7778888	מודיעין עילית, רחוב הורדים 99	25	35	\N	163	188	average	handsome,very_handsome	\N	single	dati_leumi,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
239	0600000039	fullseed_39@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	מיכל	דייטש	30	\N	female	169.00	בית שמש	f	t	t	f	\N	2026-03-15 01:24:47.451215	2026-03-15 01:24:47.451215	single	f	0	\N	parent	יעקב גרוס	052-6576920	057-7557905	masorti	teimani	מורה ב'בית יעקב'	גננת	ashkenazi	ashkenazi	שמואל מזרחי	רחל קליין	6	5	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	very_handsome	yes (200000)	200000	both			ייעוץ	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	נעמה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב וייס	050-1111111	מאיר כהן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג הורוביץ	02-5556666	משפחת גולדשטיין	03-7778888	בית שמש, רחוב הורדים 79	26	36	\N	164	189	full	very_handsome,very_handsome	\N	single	masorti,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
241	0600000041	fullseed_41@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	טובה	לוי	32	\N	female	171.00	נתניה	f	t	t	f	\N	2026-03-15 01:24:47.456738	2026-03-15 01:24:47.456738	single	f	0	\N	parent	יוסף הרשקוביץ	052-9180801	051-9429262	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	sephardi	ashkenazi	עמרם שוורץ	רוחמה גולדברג	5	3	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	ok	yes (200000)	200000	studying			עבודה סוציאלית	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בינה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב מזרחי	050-1111111	פינחס הרשקוביץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שוורץ	02-5556666	משפחת גולדשטיין	03-7778888	נתניה, רחוב הורדים 64	28	38	\N	166	191	average	ok,good	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
242	0600000042	fullseed_42@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	נחמה	מזרחי	19	\N	female	172.00	אשדוד	f	t	t	f	\N	2026-03-15 01:24:47.459887	2026-03-15 01:24:47.459887	single	f	0	\N	parent	יעקב לוי	058-8523278	053-1756261	dati_leumi	sephardi	מורה ב'בית יעקב'	גננת	sephardi	sephardi	פנחס קנייבסקי	הינדי ברגר	7	3	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	good	yes (200000)	200000	both			עבודה סוציאלית	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	נעמה	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב כהן	050-1111111	גבריאל קנייבסקי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג אדלר	02-5556666	משפחת גולדשטיין	03-7778888	אשדוד, רחוב הורדים 14	18	25	\N	167	192	average	good,handsome	\N	single	dati_leumi,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
244	0600000044	fullseed_44@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	ביינה	פרידמן	21	\N	female	174.00	רכסים	f	t	t	f	\N	2026-03-15 01:24:47.464943	2026-03-15 01:24:47.464943	single	f	0	\N	parent	אלחנן שור	054-3472105	051-8995126	baal_teshuva	mixed	מורה ב'בית יעקב'	גננת	ashkenazi	ashkenazi	ישראל שור	בתיה הרשקוביץ	4	5	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	very_handsome	yes (200000)	200000	studying			שיווק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	שבי	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב גרוס	050-1111111	פינחס שטרן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גולדברג	02-5556666	משפחת גולדשטיין	03-7778888	רכסים, רחוב הורדים 46	18	27	\N	169	194	full,full	very_handsome,very_handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
248	0600000048	fullseed_48@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	הינדי	אדלר	25	\N	female	158.00	מודיעין עילית	f	t	t	f	\N	2026-03-15 01:24:47.475211	2026-03-15 01:24:47.475211	single	f	0	\N	parent	עמרם רוזנבלום	056-9046625	055-2858561	baal_teshuva	mixed	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	פינחס כהן	טובה כהן	5	4	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	handsome	yes (200000)	200000	both			עבודה סוציאלית	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	שבי	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב הרשקוביץ	050-1111111	גבריאל הורוביץ	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג וייס	02-5556666	משפחת גולדשטיין	03-7778888	מודיעין עילית, רחוב הורדים 29	21	31	\N	153	178	full,full	handsome,very_handsome	\N	single	baal_teshuva,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
245	0600000045	fullseed_45@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	רוחמה	וייס	22	\N	female	155.00	ירושלים	f	t	t	f	\N	2026-03-15 01:24:47.46758	2026-03-15 01:24:47.46758	single	f	0	\N	parent	חיים וייס	058-6116734	051-6994825	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	sephardi	ashkenazi	אברהם שור	לאה קנייבסקי	7	1	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	fair	yes (200000)	200000	both			עבודה סוציאלית	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב ברגר	050-1111111	פנחס דייטש	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג קליין	02-5556666	משפחת גולדשטיין	03-7778888	ירושלים, רחוב הורדים 46	18	28	\N	150	175	average	fair,ok	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
246	0600000046	fullseed_46@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	שפרה	גולדברג	23	\N	female	156.00	בני ברק	f	t	t	f	\N	2026-03-15 01:24:47.470191	2026-03-15 01:24:47.470191	single	f	0	\N	parent	ישראל מזרחי	058-3292560	050-7249462	dati_leumi	sephardi	מורה ב'בית יעקב'	גננת	sephardi	ashkenazi	יעקב וייס	לאה גרוס	4	5	אח נשוי, אחות בסמינר, אחיות צעירות	average	medium	ok	yes (200000)	200000	working			שיווק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	שבי	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב וייס	050-1111111	לוי גרוס	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג שור	02-5556666	משפחת גולדשטיין	03-7778888	בני ברק, רחוב הורדים 95	19	29	\N	151	176	average	ok,good	\N	single	dati_leumi,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	sephardi,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
247	0600000047	fullseed_47@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	פרל	כץ	24	\N	female	157.00	אלעד	f	t	t	f	\N	2026-03-15 01:24:47.47256	2026-03-15 01:24:47.47256	single	f	0	\N	parent	לוי הרשקוביץ	050-2017329	051-2772554	masorti	teimani	מורה ב'בית יעקב'	גננת	ashkenazi	sephardi	עמרם גרוס	יהודית קנייבסקי	9	1	אח נשוי, אחות בסמינר, אחיות צעירות	athletic	olive	good	yes (200000)	200000	studying			הייטק	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב רוזנבלום	050-1111111	חיים קנייבסקי	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג גרוס	02-5556666	משפחת גולדשטיין	03-7778888	אלעד, רחוב הורדים 97	20	30	\N	152	177	full	good,handsome	\N	single	masorti,haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	teimani,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
211	0600000011	fullseed_11@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	פנחס	שטרן	30	\N	male	176.00	בני ברק	f	t	t	f	\N	2026-03-15 01:24:47.382606	2026-03-15 01:32:23.816098	single	f	0	\N	parent	חיים שפירא	054-6615491	058-9129838	baal_teshuva	mixed	אברך כולל	מורה	ashkenazi	ashkenazi	לוי גרוס	לאה מזרחי	8	4	אח נשוי, אחות בסמינר, אחיות צעירות	full	dark	ok	yes (200000)	200000	fixed_times	חברון	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב דייטש	050-1111111	יוסף גולדברג	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג מזרחי	02-5556666	משפחת גולדשטיין	03-7778888	בני ברק, רחוב הורדים 58	26	36	\N	161	181	full,full	ok,good	\N	single	baal_teshuva,haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	mixed,ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
200	0600000000	fullseed_0@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	ישראל	כהן	19	\N	male	165.00	ירושלים	f	t	t	f	\N	2026-03-15 01:24:47.337277	2026-03-15 02:22:20.543857	single	f	0	\N	parent	נתנאל מזרחי	054-8504225	051-5468831	haredi	ashkenazi	אברך כולל	מורה	sephardi	ashkenazi	יוסף מזרחי	פרל רוזנבלום	5	5	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	fair	yes (200000)	200000	studying	קול תורה	סלבודקה		\N	\N	לומד בכולל ומשלב עבודה בהייטק		הלכה ועיון	בחור רציני עם שמחת חיים ואהבה לתורה.	בית תורני חם ומסביר פנים	בחורה יראת שמיים, בעלת מידות, שמחה ואוהבת אנשים.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב גרוס	050-1111111	שמואל שטרן	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג כץ	02-5556666	משפחת גולדשטיין	03-7778888	ירושלים, רחוב הורדים 47	18	25	\N	150	170	average	fair,ok	\N	single	haredi	\N	t	80000	t	working,studying,both	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
249	0600000049	fullseed_49@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	פנינה	שור	26	\N	female	159.00	בית שמש	f	t	t	f	\N	2026-03-15 01:24:47.477612	2026-03-15 18:34:46.243175	single	f	0	\N	parent	עמרם מזרחי	052-2204112	053-8890882	haredi	ashkenazi	מורה ב'בית יעקב'	גננת	sephardi	sephardi	אלעזר וייס	שפרה רוזנבלום	8	4	אח נשוי, אחות בסמינר, אחיות צעירות	slim	fair	very_handsome	yes (200000)	200000	working			חינוך	\N	\N	עובדת במשרד חינוכי, ת'ה בשעות הצהריים	בית יעקב ירושלים	חינוך ומשפחה	בחורה עם מידות טובות, אוהבת ילדים ואנשים.	בית שמח, מלא חיים ואורחים	בחור תורני, אחראי, עם מידות טובות.	יושר, נאמנות, קביעת עיתים לתורה ובניית בית.	{}	0	\N	candidate	\N	f	הרב דייטש	050-1111111	נחמן קליין	052-2222222	חבר קרוב	054-3333333	דוד ישראל	058-4444444	הרה"ג ברגר	02-5556666	משפחת גולדשטיין	03-7778888	בית שמש, רחוב הורדים 75	22	32	\N	154	179	average	very_handsome,very_handsome	\N	single	haredi	\N	t	80000	t	studying,working,both,fixed_times	\N	f	\N	\N	t	ashkenazi	\N	\N	\N	\N	0	t	\N	\N	f	f
250	0583229028	gony112244@gmail.com	$2b$10$sVVJcdW99LqJLhIWDcMz2u3P6.pp4.1aQFhrOOgremJM25xd8Ml9q	שלמה	גולדברג	32	1985-04-26	male	165.00	אשדוד	f	t	t	f	\N	2026-03-14 23:53:58.072	2026-03-15 18:11:32.706149	single	f	0	israel	parent	שרה מזרחי	056-7437279	051-6185490	\N	teimani	אברך כולל	מורה	sephardi	sephardi	דוד כץ	יעקב קנייבסקי	5	1	אח בכור נשוי, אחות לומדת בסמינר...	very_thin	dark	good	yes (620000)	620000	studying	חברון (קטנה: סלבודקה)	סלבודקה		\N	גמרא בעיון	עובד במשרד גדול.	ירושלים	הלכה	בחור רציני, אוהב ללמוד, בעל מידות טובות ושמחת חיים.	תורני מודרני	בחורה יראת שמיים, בעלת מידות טובות.	יושר, נאמנות וקביעת עיתים לתורה.	{/uploads/profileImage-1773590928848-244041428.png}	1	/uploads/idCard-1773532538384-238432631.png	candidate	2026-03-14 23:55:38.613	f	הרב אדלר	050-1234567	מר שפירא	052-7654321	חבר קרוב	054-0000000	בן דוד	058-1111111	הרב שפירא	02-1234567	משפחת גולדשטיין	03-9876543	בני ברק, רחוב השומר 62	20	28	\N	150	200	average,very_thin,thin,average_thin	fair,stunning,ok,good,handsome,very_handsome	very_light,dark,light,light_average,medium,tan	single	haredi,baal_teshuva,dati_leumi	\N	t	50000	t	studying,working	study_only,study_and_work	f	\N	\N	t	ashkenazi,sephardi	\N	\N	\N	\N	0	t	\N	\N	f	f
258	0588888888	gony112244@gmail.com	$2b$10$pDQvDtwqUneC2MamjdkSDe34K6PF9QzPm.7ulj4fv5dB4RQjFG8qu	לאה	כהן	39	1987-01-01	female	184.00	נתניה	f	t	t	f	\N	2026-03-15 20:00:53.671456	2026-03-16 20:37:20.890391	single	f	0	israel	parent	חנה פרידמן	050-7544982	053-6318461	haredi	ashkenazi	אברך כולל	מורה	sephardi	sephardi	שרה וייס	אהרון פרידמן	3	4	אח בכור נשוי, אחות לומדת בסמינר...	thin	very_light	stunning	yes (680000)	\N	working	\N	\N	עבודה סוציאלית	\N	גמרא בעיון	עובד במשרד גדול.	ירושלים	הלכה	בחור רציני, אוהב ללמוד, בעל מידות טובות ושמחת חיים.	תורני מודרני	בחורה יראת שמיים, בעלת מידות טובות.	יושר, נאמנות וקביעת עיתים לתורה.	{/uploads/profileImage-1773597819926-747512368.png}	1	/uploads/idCard-1773597811425-136861416.png	candidate	2026-03-15 18:03:31.666	f	הרב לוי	050-1234567	מר וייס	052-7654321	חבר קרוב	054-0000000	בן דוד	058-1111111	הרב שפירא	02-1234567	משפחת גולדשטיין	03-9876543	ירושלים, רחוב השומר 65	10	456	\N	150	200	average,full,average_full,very_thin,thin,average_thin	fair,stunning,ok,good,handsome,very_handsome	very_light,dark,light,light_average,medium,tan	single	haredi,dati_leumi	\N	t	50000	t	studying,working	study_only,study_and_work	f	\N	\N	t	ashkenazi,sephardi	\N	\N	222222	\N	0	f	685538	\N	t	f
252	0556827861	gony112244@gmail.com	$2b$10$hsFqTvim.nLkAEYqKJIBWutXG4mHYM3QjFBYo7hrFOwWPmQXK5YMi	שמואל	כץ	21	\N	female	187.00	בית שמש	f	t	t	f	\N	2026-03-15 12:37:45.824727	2026-03-15 12:37:45.824727	single	f	0	\N	parent	שרה וייס	052-2368913	052-4980253	\N	sephardi	אברך כולל	מורה	ashkenazi	sephardi	מרים גולדברג	שלמה לוי	6	1	אח בכור נשוי, אחות לומדת בסמינר...	average_thin	tan	stunning	yes (700000)	\N	working		\N	שיווק	\N	גמרא בעיון	עובד במשרד גדול.	ירושלים	הלכה	בחור רציני, אוהב ללמוד, בעל מידות טובות ושמחת חיים.	תורני מודרני	בחורה יראת שמיים, בעלת מידות טובות.	יושר, נאמנות וקביעת עיתים לתורה.	{/uploads/profileImage-1773571352170-299826667.png}	1	/uploads/idCard-1773571343763-618483168.png	candidate	2026-03-15 12:42:24.14362	f	הרב מזרחי	050-1234567	מר שטרן	052-7654321	חבר קרוב	054-0000000	בן דוד	058-1111111	הרב שפירא	02-1234567	משפחת גולדשטיין	03-9876543	אשדוד, רחוב השומר 83	20	26	\N	150	200	average,very_thin,thin,average_thin,full,average_full	fair,ok,good,stunning,handsome,very_handsome	\N	single	haredi,baal_teshuva	\N	t	50000	t	studying,working	study_only,study_and_work	f	\N	\N	t	ashkenazi,sephardi	\N	\N	\N	\N	0	f	727042	\N	f	f
257	059999999	gony112244@gmail.com	$2b$10$DqeJqkBUHiTCGt5pkIKEY.dE/lzhxp1gRGDKd2UFeuNs7FeynD3Ke	גוני	כץ	20	\N	male	157.00	אשדוד	f	t	t	f	\N	2026-03-15 19:54:07.627653	2026-03-16 20:36:07.1172	single	f	0	\N	parent	רחל שפירא	052-3859785	054-7861767	haredi	sephardi	אברך כולל	מורה	sephardi	ashkenazi	שלמה שפירא	אהרון כץ	7	5	אח בכור נשוי, אחות לומדת בסמינר...	average	medium	ok	yes (3500000)	\N	working	אור ברוך (קטנה: סלבודקה)	\N	חשבונאות	\N	גמרא בעיון	עובד במשרד גדול.	ירושלים	הלכה	בחור רציני, אוהב ללמוד, בעל מידות טובות ושמחת חיים.	תורני מודרני	בחורה יראת שמיים, בעלת מידות טובות.	יושר, נאמנות וקביעת עיתים לתורה.	{/uploads/profileImage-1773597499389-257749327.png,/uploads/profileImage-1773600111299-650043409.png}	2	/uploads/idCard-1773597489439-888225666.png	candidate	2026-03-15 17:58:09.863	f	הרב אדלר	050-1234567	מר מזרחי	052-7654321	חבר קרוב	054-0000000	בן דוד	058-1111111	הרב שפירא	02-1234567	משפחת גולדשטיין	03-9876543	מודיעין עילית, רחוב השומר 88	19	263	\N	150	200	average,very_thin,thin,average_thin,full,average_full	fair,stunning,ok,good,handsome,very_handsome	very_light,dark,light,light_average,medium,tan	single	haredi,baal_teshuva,dati_leumi	\N	t	50000	t	studying,working	study_only,study_and_work,fixed_times,work_only	f	\N	\N	t	ashkenazi,sephardi	\N	\N	\N	\N	0	f	480516	\N	t	f
202	0600000002	fullseed_2@hapinkas.co.il	$2b$10$KXPgYs.fB61sH5Vdfs8U4.ECV3roXG8v5Ufqw5BohjjgHvrTuBsxu	רבקה	קנייבסקי	31	1992-04-11	male	178.00	אשדוד	f	t	t	f	\N	2026-03-14 23:24:47.354	2026-03-15 00:38:51.341	single	f	0	israel	parent	שרה שפירא	054-8336517	052-8968657	\N	ashkenazi	אברך כולל	מורה	sephardi	ashkenazi	אהרון שפירא	לאה פרידמן	5	2	אח בכור נשוי, אחות לומדת בסמינר...	athletic	olive	לבוש ישיבתי/חסידי שמור ומכובד.	yes (760000)	760000	studying	בית מתתיהו (קטנה: סלבודקה)	סלבודקה		\N	גמרא בעיון	עובד במשרד גדול.	ירושלים	הלכה	בחור רציני, אוהב ללמוד, בעל מידות טובות ושמחת חיים.	תורני מודרני	בחורה יראת שמיים, בעלת מידות טובות.	יושר, נאמנות וקביעת עיתים לתורה.	{}	0	/uploads/idCard-1773535200226-884560295.png	candidate	2026-03-15 02:40:00.412533	f	הרב מזרחי	050-1234567	מר שפירא	052-7654321	חבר קרוב	054-0000000	בן דוד	058-1111111	הרב שפירא	02-1234567	משפחת גולדשטיין	03-9876543	ביתר עילית, רחוב השומר 52	19	29	\N	150	200	average	\N	\N	single	\N	\N	t	50000	t	studying,working	\N	f	\N	\N	t	ashkenazi,sephardi	\N	\N	\N	\N	0	t	\N	\N	f	f
\.


--
-- Name: connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.connections_id_seq', 27, true);


--
-- Name: hidden_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.hidden_profiles_id_seq', 5, true);


--
-- Name: matches_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.matches_id_seq', 1, false);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.messages_id_seq', 143, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: photo_approvals_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.photo_approvals_id_seq', 3, true);


--
-- Name: shadchaniot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.shadchaniot_id_seq', 2, true);


--
-- Name: user_images_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_images_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 274, true);


--
-- Name: connections connections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_pkey PRIMARY KEY (id);


--
-- Name: hidden_profiles hidden_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hidden_profiles
    ADD CONSTRAINT hidden_profiles_pkey PRIMARY KEY (id);


--
-- Name: hidden_profiles hidden_profiles_user_id_hidden_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hidden_profiles
    ADD CONSTRAINT hidden_profiles_user_id_hidden_user_id_key UNIQUE (user_id, hidden_user_id);


--
-- Name: matches matches_boy_id_girl_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_boy_id_girl_id_key UNIQUE (boy_id, girl_id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: photo_approvals photo_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photo_approvals
    ADD CONSTRAINT photo_approvals_pkey PRIMARY KEY (id);


--
-- Name: photo_approvals photo_approvals_requester_id_target_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photo_approvals
    ADD CONSTRAINT photo_approvals_requester_id_target_id_key UNIQUE (requester_id, target_id);


--
-- Name: shadchaniot shadchaniot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shadchaniot
    ADD CONSTRAINT shadchaniot_pkey PRIMARY KEY (id);


--
-- Name: user_images user_images_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_images
    ADD CONSTRAINT user_images_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_connections_receiver; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_connections_receiver ON public.connections USING btree (receiver_id);


--
-- Name: idx_connections_sender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_connections_sender ON public.connections USING btree (sender_id);


--
-- Name: idx_connections_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_connections_status ON public.connections USING btree (status);


--
-- Name: idx_messages_from_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_from_user ON public.messages USING btree (from_user_id);


--
-- Name: idx_messages_is_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_is_read ON public.messages USING btree (is_read);


--
-- Name: idx_messages_to_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_to_user ON public.messages USING btree (to_user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_gender; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_gender ON public.users USING btree (gender);


--
-- Name: idx_users_is_approved; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_approved ON public.users USING btree (is_approved);


--
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- Name: connections connections_last_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_last_action_by_fkey FOREIGN KEY (last_action_by) REFERENCES public.users(id);


--
-- Name: connections connections_receiver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: connections connections_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: connections connections_shadchanit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_shadchanit_id_fkey FOREIGN KEY (shadchanit_id) REFERENCES public.shadchaniot(id);


--
-- Name: hidden_profiles hidden_profiles_hidden_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hidden_profiles
    ADD CONSTRAINT hidden_profiles_hidden_user_id_fkey FOREIGN KEY (hidden_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: hidden_profiles hidden_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.hidden_profiles
    ADD CONSTRAINT hidden_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_boy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_boy_id_fkey FOREIGN KEY (boy_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_girl_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_girl_id_fkey FOREIGN KEY (girl_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_from_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_from_user_id_fkey FOREIGN KEY (from_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_to_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_to_user_id_fkey FOREIGN KEY (to_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: photo_approvals photo_approvals_requester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photo_approvals
    ADD CONSTRAINT photo_approvals_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: photo_approvals photo_approvals_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.photo_approvals
    ADD CONSTRAINT photo_approvals_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_images user_images_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_images
    ADD CONSTRAINT user_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict KaVaB0oyTOlQDKrEbT4Ja9UjyNo9fCWX6Y9X76WtcM7h3Vidkr5C1DDXM2CcMK4

