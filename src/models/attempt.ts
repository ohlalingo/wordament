export interface PuzzleAttempt {
  id: number;
  user_id: number;
  puzzle_content_id: number;
  correct_words: number;
  score: number;
  time_taken: number;
  completed: boolean;
  created_at: string;
}
