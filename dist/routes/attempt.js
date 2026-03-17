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
        const result = await db.query(`INSERT INTO puzzle_attempts (user_id, puzzle_content_id, correct_words, score, time_taken, completed)
       VALUES ($1,$2,$3,$4,$5,true)
       RETURNING id`, [userId, puzzleContentId, correctWords, score, timeTaken]);
        return res.status(201).json({ attemptId: result.rows[0].id, score });
    }
    catch (err) {
        console.error("Error saving puzzle attempt", err);
        return res.status(500).json({ error: "Failed to save attempt" });
    }
});
export default router;
