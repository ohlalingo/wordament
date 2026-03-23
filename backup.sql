--
-- PostgreSQL database dump
--

\restrict FufdGKsUSdVpjzgy9vkbFf0sqQnQne5Dgk5hdBKRyg9oTsnDa1Z4m3UTtCy7V6g

-- Dumped from database version 15.17 (Debian 15.17-1.pgdg13+1)
-- Dumped by pg_dump version 15.17 (Debian 15.17-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
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
-- Name: import_requests; Type: TABLE; Schema: public; Owner: wordament
--

CREATE TABLE public.import_requests (
    id integer NOT NULL,
    date character varying,
    crossword_json text,
    wordsearch_json text,
    unjumble_json text
);


ALTER TABLE public.import_requests OWNER TO wordament;

--
-- Name: import_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: wordament
--

CREATE SEQUENCE public.import_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.import_requests_id_seq OWNER TO wordament;

--
-- Name: import_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wordament
--

ALTER SEQUENCE public.import_requests_id_seq OWNED BY public.import_requests.id;


--
-- Name: puzzle_attempts; Type: TABLE; Schema: public; Owner: wordament
--

CREATE TABLE public.puzzle_attempts (
    id integer NOT NULL,
    user_id integer,
    puzzle_content_id integer,
    correct_words integer,
    score integer,
    time_taken integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.puzzle_attempts OWNER TO wordament;

--
-- Name: puzzle_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: wordament
--

CREATE SEQUENCE public.puzzle_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.puzzle_attempts_id_seq OWNER TO wordament;

--
-- Name: puzzle_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wordament
--

ALTER SEQUENCE public.puzzle_attempts_id_seq OWNED BY public.puzzle_attempts.id;


--
-- Name: puzzle_content; Type: TABLE; Schema: public; Owner: wordament
--

CREATE TABLE public.puzzle_content (
    id integer NOT NULL,
    puzzle_id integer,
    content text,
    language character varying DEFAULT 'en'::character varying,
    puzzle_type_id integer,
    external_id character varying
);


ALTER TABLE public.puzzle_content OWNER TO wordament;

--
-- Name: puzzle_content_id_seq; Type: SEQUENCE; Schema: public; Owner: wordament
--

CREATE SEQUENCE public.puzzle_content_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.puzzle_content_id_seq OWNER TO wordament;

--
-- Name: puzzle_content_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wordament
--

ALTER SEQUENCE public.puzzle_content_id_seq OWNED BY public.puzzle_content.id;


--
-- Name: puzzle_types; Type: TABLE; Schema: public; Owner: wordament
--

CREATE TABLE public.puzzle_types (
    id integer NOT NULL,
    type_name text
);


ALTER TABLE public.puzzle_types OWNER TO wordament;

--
-- Name: puzzle_types_id_seq; Type: SEQUENCE; Schema: public; Owner: wordament
--

CREATE SEQUENCE public.puzzle_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.puzzle_types_id_seq OWNER TO wordament;

--
-- Name: puzzle_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wordament
--

ALTER SEQUENCE public.puzzle_types_id_seq OWNED BY public.puzzle_types.id;


--
-- Name: puzzles; Type: TABLE; Schema: public; Owner: wordament
--

CREATE TABLE public.puzzles (
    id integer NOT NULL,
    puzzle_date date,
    difficulty text
);


ALTER TABLE public.puzzles OWNER TO wordament;

--
-- Name: puzzles_id_seq; Type: SEQUENCE; Schema: public; Owner: wordament
--

CREATE SEQUENCE public.puzzles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.puzzles_id_seq OWNER TO wordament;

--
-- Name: puzzles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wordament
--

ALTER SEQUENCE public.puzzles_id_seq OWNED BY public.puzzles.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: wordament
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name text,
    email text,
    password text,
    region text,
    language text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO wordament;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: wordament
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO wordament;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: wordament
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: import_requests id; Type: DEFAULT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.import_requests ALTER COLUMN id SET DEFAULT nextval('public.import_requests_id_seq'::regclass);


--
-- Name: puzzle_attempts id; Type: DEFAULT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_attempts ALTER COLUMN id SET DEFAULT nextval('public.puzzle_attempts_id_seq'::regclass);


--
-- Name: puzzle_content id; Type: DEFAULT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_content ALTER COLUMN id SET DEFAULT nextval('public.puzzle_content_id_seq'::regclass);


--
-- Name: puzzle_types id; Type: DEFAULT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_types ALTER COLUMN id SET DEFAULT nextval('public.puzzle_types_id_seq'::regclass);


--
-- Name: puzzles id; Type: DEFAULT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzles ALTER COLUMN id SET DEFAULT nextval('public.puzzles_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: import_requests; Type: TABLE DATA; Schema: public; Owner: wordament
--

COPY public.import_requests (id, date, crossword_json, wordsearch_json, unjumble_json) FROM stdin;
\.


--
-- Data for Name: puzzle_attempts; Type: TABLE DATA; Schema: public; Owner: wordament
--

COPY public.puzzle_attempts (id, user_id, puzzle_content_id, correct_words, score, time_taken, created_at) FROM stdin;
6	2	1	4	4	120	2026-03-19 17:04:15.181464
7	3	1	3	3	140	2026-03-19 17:04:15.181464
8	4	1	2	2	110	2026-03-19 17:04:15.181464
9	5	1	3	3	150	2026-03-19 17:04:15.181464
10	6	1	1	1	160	2026-03-19 17:04:15.181464
\.


--
-- Data for Name: puzzle_content; Type: TABLE DATA; Schema: public; Owner: wordament
--

COPY public.puzzle_content (id, puzzle_id, content, language, puzzle_type_id, external_id) FROM stdin;
3	12	{"gridSize":12,"timeLimit":600,"difficulty":"easy","words":[{"number":1,"word":"フィッシング","row":0,"col":0,"direction":"across","hint":"偽のメールで個人情報を盗む詐欺攻撃。"},{"number":2,"word":"SMS詐欺","row":2,"col":1,"direction":"across","hint":"SMSメッセージを使ったフィッシング攻撃。"},{"number":3,"word":"電話詐欺","row":4,"col":3,"direction":"down","hint":"電話を利用して情報を盗む詐欺手口。"},{"number":4,"word":"経営詐欺","row":6,"col":0,"direction":"across","hint":"企業幹部を狙ったフィッシング攻撃。"},{"number":5,"word":"誘導詐欺","row":8,"col":4,"direction":"down","hint":"偽の報酬やリンクで被害者を誘導する攻撃。"}]}	ja	1	CA2
8	20	{"questions":[{"scrambled":"ンサムウェアラ","answer":"ランサムウェア","clue":"ファイルを暗号化し身代金を要求するマルウェア"},{"scrambled":"ッシングフィ","answer":"フィッシング","clue":"偽メールで情報を盗む攻撃"},{"scrambled":"ウォールファイア","answer":"ファイアウォール","clue":"ネットワークを保護するセキュリティシステム"},{"scrambled":"ウェアルマ","answer":"マルウェア","clue":"悪意あるソフトウェア"},{"scrambled":"ネットボット","answer":"ボットネット","clue":"遠隔操作される感染コンピュータのネットワーク"}]}	ja	9	CA6
9	12	{"id":"1","date":"2026-10-01","type":"crossword","gridSize":12,"timeLimit":600,"difficulty":"easy","words":[{"number":1,"word":"PHISHING","row":2,"col":1,"direction":"across","clue":"Fraud emails that trick users into revealing sensitive information."},{"number":2,"word":"SMISHING","row":4,"col":1,"direction":"across","clue":"Phishing attacks sent through SMS text messages."},{"number":3,"word":"WHALING","row":6,"col":1,"direction":"across","clue":"Phishing attacks targeting senior executives."},{"number":4,"word":"VISHING","row":1,"col":9,"direction":"down","clue":"Phone calls used to trick victims into sharing information."},{"number":5,"word":"BAITING","row":3,"col":10,"direction":"down","clue":"Luring victims with fake rewards or downloads."}]}	en	1	CA1
1	19	{"gridSize":12,"grid":[["P","H","I","S","H","I","N","G","A","B","C","D"],["M","A","L","W","A","R","E","X","Y","Z","L","M"],["S","P","Y","W","A","R","E","T","R","O","J","A"],["B","O","T","N","E","T","R","A","N","S","O","M"],["R","A","N","S","O","M","W","A","R","E","P","Q"],["F","I","R","E","W","A","L","L","D","E","F","G"],["A","N","T","I","V","I","R","U","S","H","I","J"],["P","A","T","C","H","I","N","G","K","L","M","N"],["B","A","C","K","U","P","O","P","Q","R","S","T"],["E","N","C","R","Y","P","T","I","O","N","U","V"],["S","P","E","A","R","P","H","I","S","H","W","X"],["P","H","A","R","M","I","N","G","Y","Z","A","B"]],"words":[{"word":"PHISHING","hint":"Fraud emails that trick users into revealing sensitive information."},{"word":"MALWARE","hint":"Software designed to harm systems."},{"word":"SPYWARE","hint":"Software that secretly collects user information."},{"word":"BOTNET","hint":"A network of infected computers controlled by attackers."},{"word":"RANSOMWARE","hint":"Malware that locks files and demands payment."}]}	en	5	CA3
6	19	{"gridSize":12,"grid":[["フ","ィ","ッ","シ","ン","グ","A","B","C","D","E","F"],["マ","ル","ウ","ェ","ア","G","H","I","J","K","L","M"],["ス","パ","イ","ウ","ェ","ア","N","O","P","Q","R","S"],["ボ","ッ","ト","ネ","ッ","ト","T","U","V","W","X","Y"],["ラ","ン","サ","ム","ウ","ェ","ア","Z","A","B","C","D"],["フ","ァ","イ","ア","ウ","ォ","ー","ル","E","F","G","H"],["ア","ン","チ","ウ","イ","ル","ス","I","J","K","L","M"],["パ","ッ","チ","N","O","P","Q","R","S","T","U","V"],["バ","ッ","ク","ア","ッ","プ","W","X","Y","Z","A","B"],["エ","ン","ク","リ","プ","ト","C","D","E","F","G","H"],["ス","ピ","ア","フ","ィ","ッ","シ","ン","グ","I","J","K"],["フ","ァ","ー","ミ","ン","グ","L","M","N","O","P","Q"]],"words":[{"word":"フィッシング","hint":"個人情報を盗むことを目的とした詐欺メール攻撃。"},{"word":"マルウェア","hint":"システムに被害を与える悪意あるソフトウェア。"},{"word":"スパイウェア","hint":"ユーザー情報を密かに収集するソフトウェア。"},{"word":"ボットネット","hint":"攻撃者が遠隔操作する感染コンピュータのネットワーク。"},{"word":"ランサムウェア","hint":"ファイルをロックして身代金を要求するマルウェア。"}]}	ja	5	CA4
5	20	{"questions":[{"scrambled":"SOMANWERAR","answer":"RANSOMWARE","clue":"Encrypts files for payment"},{"scrambled":"NIHPISGH","answer":"PHISHING","clue":"Fraudulent email attack"},{"scrambled":"LFRWLAIE","answer":"FIREWALL","clue":"Network security barrier"},{"scrambled":"RLWAEMA","answer":"MALWARE","clue":"Malicious software"},{"scrambled":"TTNOBE","answer":"BOTNET","clue":"Network of compromised computers"}]}	en	9	CA5
\.


--
-- Data for Name: puzzle_types; Type: TABLE DATA; Schema: public; Owner: wordament
--

COPY public.puzzle_types (id, type_name) FROM stdin;
5	wordsearch
9	unjumble
1	crossword
\.


--
-- Data for Name: puzzles; Type: TABLE DATA; Schema: public; Owner: wordament
--

COPY public.puzzles (id, puzzle_date, difficulty) FROM stdin;
1	2026-03-18	\N
20	2026-03-23	\N
19	2026-03-20	\N
12	2026-03-19	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: wordament
--

COPY public.users (id, name, email, password, region, language, created_at) FROM stdin;
1	Shashank Dubey	shashankd129@gmail.com	\N	India	en	2026-03-18 16:44:38.582165
2	Tanaka Yuki	tanaka@demo.com	\N	Japan	\N	2026-03-19 17:01:09.634354
3	Maria Schmidt	maria@demo.com	\N	EMEA	\N	2026-03-19 17:01:09.634354
4	Sarah Chen	sarah@demo.com	\N	AEJ	\N	2026-03-19 17:01:09.634354
5	James Wilson	james@demo.com	\N	Americas	\N	2026-03-19 17:01:09.634354
6	Raj Patel	raj@demo.com	\N	India	\N	2026-03-19 17:01:09.634354
\.


--
-- Name: import_requests_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wordament
--

SELECT pg_catalog.setval('public.import_requests_id_seq', 1, false);


--
-- Name: puzzle_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wordament
--

SELECT pg_catalog.setval('public.puzzle_attempts_id_seq', 10, true);


--
-- Name: puzzle_content_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wordament
--

SELECT pg_catalog.setval('public.puzzle_content_id_seq', 9, true);


--
-- Name: puzzle_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wordament
--

SELECT pg_catalog.setval('public.puzzle_types_id_seq', 42, true);


--
-- Name: puzzles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wordament
--

SELECT pg_catalog.setval('public.puzzles_id_seq', 42, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: wordament
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- Name: import_requests import_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.import_requests
    ADD CONSTRAINT import_requests_pkey PRIMARY KEY (id);


--
-- Name: puzzle_attempts puzzle_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_pkey PRIMARY KEY (id);


--
-- Name: puzzle_content puzzle_content_pkey; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_content
    ADD CONSTRAINT puzzle_content_pkey PRIMARY KEY (id);


--
-- Name: puzzle_types puzzle_types_pkey; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_types
    ADD CONSTRAINT puzzle_types_pkey PRIMARY KEY (id);


--
-- Name: puzzles puzzles_pkey; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzles
    ADD CONSTRAINT puzzles_pkey PRIMARY KEY (id);


--
-- Name: puzzles puzzles_puzzle_date_key; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzles
    ADD CONSTRAINT puzzles_puzzle_date_key UNIQUE (puzzle_date);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ux_puzzle_content_day_type_lang; Type: INDEX; Schema: public; Owner: wordament
--

CREATE UNIQUE INDEX ux_puzzle_content_day_type_lang ON public.puzzle_content USING btree (puzzle_id, puzzle_type_id, language);


--
-- Name: ux_puzzle_types_type_name; Type: INDEX; Schema: public; Owner: wordament
--

CREATE UNIQUE INDEX ux_puzzle_types_type_name ON public.puzzle_types USING btree (type_name);


--
-- Name: ux_puzzles_date; Type: INDEX; Schema: public; Owner: wordament
--

CREATE UNIQUE INDEX ux_puzzles_date ON public.puzzles USING btree (puzzle_date);


--
-- Name: puzzle_attempts puzzle_attempts_puzzle_content_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_puzzle_content_id_fkey FOREIGN KEY (puzzle_content_id) REFERENCES public.puzzle_content(id);


--
-- Name: puzzle_attempts puzzle_attempts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_attempts
    ADD CONSTRAINT puzzle_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: puzzle_content puzzle_content_puzzle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_content
    ADD CONSTRAINT puzzle_content_puzzle_id_fkey FOREIGN KEY (puzzle_id) REFERENCES public.puzzles(id) ON DELETE CASCADE;


--
-- Name: puzzle_content puzzle_content_puzzle_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: wordament
--

ALTER TABLE ONLY public.puzzle_content
    ADD CONSTRAINT puzzle_content_puzzle_type_id_fkey FOREIGN KEY (puzzle_type_id) REFERENCES public.puzzle_types(id);


--
-- PostgreSQL database dump complete
--

\unrestrict FufdGKsUSdVpjzgy9vkbFf0sqQnQne5Dgk5hdBKRyg9oTsnDa1Z4m3UTtCy7V6g

