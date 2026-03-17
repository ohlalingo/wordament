import { Router } from "express";
import { db } from "../db.js";
const router = Router();
router.get("/", async (_req, res) => {
    try {
        const { rows } = await db.query(`SELECT u.name,
              SUM(pa.score) AS total_score,
              MIN(pa.time_taken) AS best_time,
              COUNT(*) AS attempts
       FROM puzzle_attempts pa
       JOIN users u ON u.id = pa.user_id
       GROUP BY u.id
       ORDER BY total_score DESC, best_time ASC
       LIMIT 20`);
        return res.json(rows);
    }
    catch (err) {
        console.error("Error fetching leaderboard", err);
        return res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
});
export default router;
