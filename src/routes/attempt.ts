import { Router } from "express";
import { db } from "../db.js";
import { z } from "zod";

const router = Router();

const attemptSchema = z.object({
  userId: z.number().int().positive(),
  puzzleContentId: z.number().int().positive(),
  correctWords: z.number().int().min(0),
  timeTaken: z.number().int().min(0),
});

// POST /attempt
// Body: { userId, puzzleContentId, correctWords, timeTaken }
router.post("/", async (req, res) => {
  const parsed = attemptSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { userId, puzzleContentId, correctWords, timeTaken } = parsed.data;

  const score = correctWords ?? 0; // 1 point per correct word

  try {
    // Load puzzle info (to enforce per-content uniqueness and time limit)
    const puzzleRow = await db.query(
      `SELECT pc.puzzle_id, pc.content
       FROM puzzle_content pc
       WHERE pc.id = $1`,
      [puzzleContentId]
    );
    if (!puzzleRow.rows.length) {
      return res.status(400).json({ error: "Invalid puzzleContentId" });
    }
    const { content } = puzzleRow.rows[0];

    // Enforce single attempt per (user, puzzle_content)
    const existing = await db.query(
      `SELECT 1
         FROM puzzle_attempts pa
        WHERE pa.user_id = $1 AND pa.puzzle_content_id = $2
        LIMIT 1`,
      [userId, puzzleContentId]
    );
    if (existing.rows.length) {
      return res.status(409).json({ error: "Puzzle already attempted" });
    }

    // Enforce time limit if present in puzzle content JSON
    let timeLimit: number | null = null;
    try {
      const parsedContent = typeof content === "string" ? JSON.parse(content) : content;
      if (parsedContent && typeof parsedContent.timeLimit === "number") {
        timeLimit = parsedContent.timeLimit;
      }
    } catch (e) {
      console.warn("Attempt submission: failed to parse content for timeLimit", e);
    }
    if (timeLimit != null && timeTaken > timeLimit) {
      return res.status(400).json({ error: "Time limit exceeded" });
    }

    const result = await db.query(
      `INSERT INTO puzzle_attempts (user_id, puzzle_content_id, correct_words, score, time_taken, completed)
       VALUES ($1,$2,$3,$4,$5,true)
       RETURNING id`,
      [userId, puzzleContentId, correctWords, score, timeTaken]
    );

    return res.status(201).json({ attemptId: result.rows[0].id, score });
  } catch (err) {
    console.error("Error saving puzzle attempt", err);
    return res.status(500).json({ error: "Failed to save attempt" });
  }
});

export default router;
