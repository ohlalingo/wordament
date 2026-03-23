-- Set score = correct_words where score is NULL; set score to 0 if both are NULL.
UPDATE puzzle_attempts
SET score = COALESCE(score, correct_words, 0)
WHERE score IS NULL OR correct_words IS NULL;
