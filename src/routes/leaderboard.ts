import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// Match puzzle "today" logic: use UTC date in YYYY-MM-DD
const todayLocalISO = (): string => new Date().toISOString().slice(0, 10);

router.get("/", async (_req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT TOP 20
              u.name,
              u.region,
              SUM(pa.correct_words) AS score,
              SUM(pa.time_taken)    AS time,
              ROW_NUMBER() OVER (ORDER BY SUM(pa.correct_words) DESC, SUM(pa.time_taken) ASC) AS rank
       FROM puzzle_attempts pa
       JOIN users u ON u.id = pa.user_id
       GROUP BY u.id, u.name, u.region
       ORDER BY score DESC, time ASC`
    );
    return res.json(rows);
  } catch (err) {
    console.error("Error fetching leaderboard", err);
    return res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.get("/regional-champions", async (_req, res) => {
  try {
    const fetchBucket = async (extraWhere: string, params: any[]) => {
      const { rows } = await db.query(
        `WITH ranked AS (
           SELECT
             LOWER(LTRIM(RTRIM(u.region))) AS region,
             u.name,
             SUM(pa.correct_words) AS score,
             SUM(pa.time_taken)    AS time,
             ROW_NUMBER() OVER (
               PARTITION BY LOWER(LTRIM(RTRIM(u.region)))
               ORDER BY SUM(pa.correct_words) DESC, SUM(pa.time_taken) ASC
             ) AS rnk
           FROM puzzle_attempts pa
           JOIN users u ON u.id = pa.user_id
           JOIN puzzle_content pc ON pc.id = pa.puzzle_content_id
           JOIN puzzles p ON p.id = pc.puzzle_id
           WHERE u.region IS NOT NULL AND LTRIM(RTRIM(u.region)) <> '' ${extraWhere}
           GROUP BY LOWER(LTRIM(RTRIM(u.region))), u.name, u.id
         )
         SELECT region, name, score, time, rnk AS rank
         FROM ranked
         WHERE rnk = 1`,
        params
      );
      return rows;
    };

    const today = todayLocalISO();

    // Today – match both puzzle_date and attempt created_at to avoid stale data
    const todayRows = await fetchBucket(
      `AND p.puzzle_date = CAST($1 AS DATE)
       AND CAST(pa.created_at AS DATE) = CAST($1 AS DATE)`,
      [today]
    );

    // This week – last 7 days including today
    const weekRows = await fetchBucket(
      `AND p.puzzle_date >= DATEADD(day, -6, CAST($1 AS DATE))
       AND CAST(pa.created_at AS DATE) >= DATEADD(day, -6, CAST($1 AS DATE))`,
      [today]
    );

    // All time – no filter
    const allRows = await fetchBucket("", []);

    return res.json({
      today: todayRows,
      week: weekRows,
      allTime: allRows,
    });
  } catch (err) {
    console.error("Error fetching regional champions", err);
    return res.status(500).json({ error: "Failed to fetch regional champions" });
  }
});

// GET /leaderboard/user-stats/:userId
router.get("/user-stats/:userId", async (req, res) => {
  const userId = Number(req.params.userId);
  if (!userId) return res.status(400).json({ error: "Invalid user id" });

  try {
    const [{ rows: summaryRows }, { rows: dateRows }] = await Promise.all([
      db.query(
        `SELECT
           CAST(COUNT(*) AS INT) AS puzzles_completed,
           CAST(MIN(time_taken) AS INT) AS best_time_seconds
         FROM puzzle_attempts
         WHERE user_id = $1`,
        [userId]
      ),
      db.query(
        `SELECT DISTINCT p.puzzle_date AS date
           FROM puzzle_attempts pa
           JOIN puzzle_content pc ON pc.id = pa.puzzle_content_id
           JOIN puzzles p ON p.id = pc.puzzle_id
          WHERE pa.user_id = $1
          ORDER BY p.puzzle_date DESC`,
        [userId]
      ),
    ]);

    const completed = summaryRows[0]?.puzzles_completed ?? 0;
    const bestTime = summaryRows[0]?.best_time_seconds ?? null;

    // Compute current streak of consecutive days with attempts, ending today
    const today = todayLocalISO();
    let streak = 0;
    let cursor = today;
    for (const row of dateRows) {
      // MSSQL DATE columns come back as JS Date objects
      const d =
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10);
      if (d === cursor) {
        streak += 1;
        const next = new Date(cursor);
        next.setDate(next.getDate() - 1);
        cursor = next.toISOString().slice(0, 10);
      } else if (d < cursor) {
        break;
      }
    }

    return res.json({
      puzzlesCompleted: completed,
      bestTimeSeconds: bestTime,
      currentStreak: streak,
    });
  } catch (err) {
    console.error("Error fetching user stats", err);
    return res.status(500).json({ error: "Failed to fetch user stats" });
  }
});

export default router;
