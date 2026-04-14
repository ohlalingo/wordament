-- ============================================================
-- CyberWordament – MSSQL Schema
-- Run this once on a fresh database before starting the server.
-- All sequences replaced with IDENTITY; Postgres-only types
-- mapped to their MSSQL equivalents.
-- ============================================================

-- ── users ────────────────────────────────────────────────────
CREATE TABLE users (
  id            INT            IDENTITY(1,1) PRIMARY KEY,
  name          NVARCHAR(MAX),
  email         NVARCHAR(320),      -- bounded so it can be indexed (RFC 5321 max)
  password      NVARCHAR(MAX),      -- legacy plain-text field (kept for compat)
  password_hash NVARCHAR(MAX),      -- scrypt hash (added at runtime in Postgres)
  region        NVARCHAR(MAX),
  language      NVARCHAR(MAX),
  role          NVARCHAR(MAX),
  created_at    DATETIME2      DEFAULT GETUTCDATE()
);
CREATE UNIQUE INDEX ux_users_email ON users (email);

-- ── puzzles ──────────────────────────────────────────────────
CREATE TABLE puzzles (
  id           INT   IDENTITY(1,1) PRIMARY KEY,
  puzzle_date  DATE,
  difficulty   NVARCHAR(MAX)
);
CREATE UNIQUE INDEX ux_puzzles_date ON puzzles (puzzle_date);

-- ── puzzle_types ─────────────────────────────────────────────
CREATE TABLE puzzle_types (
  id        INT           IDENTITY(1,1) PRIMARY KEY,
  type_name NVARCHAR(100)               -- bounded so it can be indexed
);
CREATE UNIQUE INDEX ux_puzzle_types_type_name ON puzzle_types (type_name);

-- ── puzzle_content ───────────────────────────────────────────
CREATE TABLE puzzle_content (
  id              INT            IDENTITY(1,1) PRIMARY KEY,
  puzzle_id       INT,
  puzzle_type_id  INT,
  language        NVARCHAR(10)   DEFAULT 'en',
  slot            INT            DEFAULT 1,
  external_id     NVARCHAR(MAX),
  content         NVARCHAR(MAX)  -- stored as a JSON string
);
-- Matches the original ON CONFLICT (puzzle_id, puzzle_type_id, language, slot)
CREATE UNIQUE INDEX ux_puzzle_content_day_type_lang_slot
  ON puzzle_content (puzzle_id, puzzle_type_id, language, slot);

-- ── puzzle_attempts ──────────────────────────────────────────
CREATE TABLE puzzle_attempts (
  id                INT       IDENTITY(1,1) PRIMARY KEY,
  user_id           INT,
  puzzle_content_id INT,
  correct_words     INT,
  score             INT,
  time_taken        INT,
  completed         BIT       DEFAULT 1,
  created_at        DATETIME2 DEFAULT GETUTCDATE()
);

-- ── import_requests ──────────────────────────────────────────
CREATE TABLE import_requests (
  id              INT          IDENTITY(1,1) PRIMARY KEY,
  date            NVARCHAR(MAX),
  crossword_json  NVARCHAR(MAX),
  wordsearch_json NVARCHAR(MAX),
  unjumble_json   NVARCHAR(MAX)
);

-- ── Foreign keys (optional – enable if you want referential integrity) ──
-- ALTER TABLE puzzle_content  ADD CONSTRAINT fk_pc_puzzle      FOREIGN KEY (puzzle_id)      REFERENCES puzzles(id);
-- ALTER TABLE puzzle_content  ADD CONSTRAINT fk_pc_type        FOREIGN KEY (puzzle_type_id) REFERENCES puzzle_types(id);
-- ALTER TABLE puzzle_attempts ADD CONSTRAINT fk_pa_user        FOREIGN KEY (user_id)        REFERENCES users(id);
-- ALTER TABLE puzzle_attempts ADD CONSTRAINT fk_pa_content     FOREIGN KEY (puzzle_content_id) REFERENCES puzzle_content(id);

-- ── Seed puzzle_types (required for AdminJS create-puzzle form) ───────────
INSERT INTO puzzle_types (type_name) VALUES ('crossword');
INSERT INTO puzzle_types (type_name) VALUES ('wordsearch');
INSERT INTO puzzle_types (type_name) VALUES ('unjumble');
