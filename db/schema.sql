-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  region TEXT,
  language TEXT,
  role TEXT DEFAULT 'player',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Puzzle days
CREATE TABLE IF NOT EXISTS puzzles (
  id SERIAL PRIMARY KEY,
  puzzle_date DATE UNIQUE
);

-- Puzzle types (crossword, wordsearch, unjumble)
CREATE TABLE IF NOT EXISTS puzzle_types (
  id SERIAL PRIMARY KEY,
  type_name TEXT
);

-- Ensure uniqueness on type_name
CREATE UNIQUE INDEX IF NOT EXISTS ux_puzzle_types_type_name ON puzzle_types (type_name);

-- Puzzle content (JSON)
CREATE TABLE IF NOT EXISTS puzzle_content (
  id SERIAL PRIMARY KEY,
  puzzle_id INTEGER REFERENCES puzzles(id),
  puzzle_type_id INTEGER REFERENCES puzzle_types(id),
  language VARCHAR DEFAULT 'en',
  external_id VARCHAR NULL,
  content JSONB
);

-- Attempts (score = correct_words)
CREATE TABLE IF NOT EXISTS puzzle_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  puzzle_content_id INTEGER REFERENCES puzzle_content(id),
  correct_words INTEGER,
  score INTEGER,
  time_taken INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
