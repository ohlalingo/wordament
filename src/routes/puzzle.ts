import { Router } from "express";
import { db } from "../db.js";
import { z } from "zod";
import { adminAuth } from "../middleware/adminAuth.js";

const router = Router();

const uploadSchema = z.object({
  puzzleDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.string().min(1),
  language: z.string().min(2).max(5).optional(),
  id: z.string().min(1).optional(),
  content: z.any(),
});

const stripReservedFields = (content: any) => {
  if (content && typeof content === "object") {
    const clone = Array.isArray(content) ? [...content] : { ...content };
    delete (clone as any).id;
    delete (clone as any).date;
    delete (clone as any).language;
    return clone;
  }
  return content;
};

const normalizeLang = (lang?: string) => {
  if (!lang) return "en";
  const l = lang.toLowerCase();
  if (l === "japanese" || l === "jp") return "ja";
  if (l === "english") return "en";
  return l;
};

function todayLocalISO(): string {
  return new Date().toLocaleDateString("en-CA");
}

// GET /puzzle/today - returns today's puzzles grouped by type
router.get("/today", async (req, res) => {
  const today = todayLocalISO(); // YYYY-MM-DD in server local TZ
  const lang = normalizeLang(req.query.lang as string);

  try {
    const { rows } = await db.query(
      `SELECT pc.id AS puzzle_content_id,
              pt.type_name,
              pc.language,
              pc.content
       FROM puzzle_content pc
       JOIN puzzles p ON p.id = pc.puzzle_id
       JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
       WHERE p.puzzle_date = $1 AND pc.language = $2`,
      [today, lang]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "No puzzles found for today" });
    }

    const grouped: Record<string, unknown> = {};
    for (const row of rows) {
      grouped[row.type_name] = {
        puzzleContentId: row.puzzle_content_id,
        language: row.language,
        ...row.content,
      };
    }

    return res.json(grouped);
  } catch (err) {
    console.error("Error fetching today's puzzles", err);
    return res.status(500).json({ error: "Failed to load puzzles" });
  }
});

// POST /puzzle/upload - create or replace puzzle content for a given date and type
router.post("/upload", adminAuth, async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { puzzleDate, type, content, id } = parsed.data;
  let language = normalizeLang(parsed.data.language);
  const cleanContent = stripReservedFields(content);

  try {
    // ensure puzzle day exists
    const puzzleDay = await db.query(
      `INSERT INTO puzzles (puzzle_date) VALUES ($1)
       ON CONFLICT (puzzle_date) DO UPDATE SET puzzle_date = EXCLUDED.puzzle_date
       RETURNING id`,
      [puzzleDate]
    );
    const puzzleId = puzzleDay.rows[0].id as number;

    // ensure puzzle type exists (reuse existing if present)
    const typeRow = await db.query(
      `INSERT INTO puzzle_types (type_name) VALUES ($1)
       ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name
       RETURNING id`,
      [type]
    );
    const puzzleTypeId = typeRow.rows[0].id as number;

    // replace existing content for this date/type
    await db.query(
      `DELETE FROM puzzle_content WHERE puzzle_id = $1 AND puzzle_type_id = $2 AND language = $3`,
      [puzzleId, puzzleTypeId, language]
    );

    const inserted = await db.query(
      `INSERT INTO puzzle_content (puzzle_id, puzzle_type_id, language, external_id, content)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id`,
      [puzzleId, puzzleTypeId, language, id || null, cleanContent]
    );

    return res.status(201).json({
      puzzleContentId: inserted.rows[0].id,
      puzzleId,
      puzzleTypeId,
    });
  } catch (err) {
    console.error("Error uploading puzzle", err);
    return res.status(500).json({ error: "Failed to upload puzzle" });
  }
});

// Legacy/demo endpoint to return seeded JSON files if DB is empty.
// Strategy:
// 1) Find the latest puzzle_date <= today that has any content (any language).
// 2) For that date, fetch requested language rows; if none, fetch any language.
// 3) If some types are still missing, fill them from any language on that date.
// 4) If nothing is found, fall back to bundled JSON.
router.get("/demo", async (req, res) => {
  try {
    const today = todayLocalISO();
    const lang = normalizeLang(req.query.lang as string);

    const fetchDay = async (date: string | null, language?: string) => {
      if (!date) return [];
      const params: any[] = [date];
      let whereLang = "";
      if (language) {
        whereLang = "AND LOWER(pc.language) = LOWER($2)";
        params.push(language);
      }
      const { rows } = await db.query(
        `SELECT pc.id AS puzzle_content_id,
                pt.type_name,
                pc.language,
                pc.content
         FROM puzzle_content pc
         JOIN puzzles p ON p.id = pc.puzzle_id
         JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
         WHERE p.puzzle_date = $1 ${whereLang}`,
        params
      );
      return rows;
    };

    // Find latest date with any content <= today
    const latestAny = await db.query(
      `SELECT p.puzzle_date
       FROM puzzles p
       JOIN puzzle_content pc ON pc.puzzle_id = p.id
       WHERE p.puzzle_date <= $1
       ORDER BY p.puzzle_date DESC
       LIMIT 1`,
      [today]
    );
    const targetDate: string | null = latestAny.rows?.[0]?.puzzle_date || null;

    // Step 2: fetch requested lang; if none, fetch any lang
    let rows = await fetchDay(targetDate, lang);
    if (!rows.length) {
      rows = await fetchDay(targetDate);
    }

    // Step 3: fill missing types from same date in any language
    if (rows.length) {
      const haveTypes = new Set(rows.map((r: any) => r.type_name));
      const missingTypes = ["crossword", "wordsearch", "unjumble"].filter((t) => !haveTypes.has(t));
      if (missingTypes.length) {
        const anyLangRows = await fetchDay(targetDate);
        for (const r of anyLangRows) {
          if (missingTypes.includes(r.type_name)) rows.push(r);
        }
      }
    }

    if (rows.length) {
      const grouped: Record<string, unknown> = {};
      for (const row of rows) {
        grouped[row.type_name] = {
          puzzleContentId: row.puzzle_content_id,
          language: row.language,
          ...row.content,
        };
      }

      // If crossword missing, fall back to bundled demo crossword
      if (!grouped.crossword) {
        try {
          const crossword = require("../../puzzles/crossword/demo.json");
          grouped.crossword = crossword;
        } catch (err) {
          console.warn("Failed to load bundled crossword fallback", err);
        }
      }
      return res.json(grouped);
    }
  } catch (err) {
    console.warn("Falling back to local JSON for demo", err);
  }

  // Fallback to JSON files if DB not populated
  try {
    const crossword = require("../../puzzles/crossword/demo.json");
    const wordsearch = require("../../puzzles/wordsearch/demo.json");
    const unjumble = require("../../puzzles/unjumble/demo.json");

    return res.json({ crossword, wordsearch, unjumble });
  } catch (err) {
    console.error("Error loading demo puzzles", err);
    return res.status(500).json({ error: "Failed to load demo puzzles" });
  }
});

// GET /puzzle/:date - fetch puzzles for a specific date (YYYY-MM-DD)
router.get("/:date", async (req, res) => {
  const { date } = req.params;
  const lang = (req.query.lang as string) || "en";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "Invalid date format" });
  }
  try {
    const { rows } = await db.query(
      `SELECT pc.id AS puzzle_content_id,
              pt.type_name,
              pc.language,
              pc.content
       FROM puzzle_content pc
       JOIN puzzles p ON p.id = pc.puzzle_id
       JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
       WHERE p.puzzle_date = $1 AND pc.language = $2`,
      [date, lang]
    );
    if (!rows.length) return res.status(404).json({ error: "No puzzles for date" });
    const grouped: Record<string, unknown> = {};
    for (const row of rows) {
      grouped[row.type_name] = { puzzleContentId: row.puzzle_content_id, language: row.language, ...row.content };
    }
    return res.json(grouped);
  } catch (err) {
    console.error("Error fetching puzzles by date", err);
    return res.status(500).json({ error: "Failed to load puzzles" });
  }
});

// Export puzzles for a given date (or all)
router.get("/export", async (req, res) => {
  const { date, lang } = req.query as { date?: string; lang?: string };
  try {
    const params: unknown[] = [];
    const conditions: string[] = [];
    let idx = 1;
    if (lang) {
      conditions.push(`pc.language = $${idx++}`);
      params.push(lang);
    }
    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: "Invalid date" });
      conditions.push(`p.puzzle_date = $${idx++}`);
      params.push(date);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await db.query(
      `SELECT p.puzzle_date, pt.type_name, pc.language, pc.content
       FROM puzzle_content pc
       JOIN puzzles p ON p.id = pc.puzzle_id
       JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
       ${where}
       ORDER BY p.puzzle_date, pt.type_name`,
      params
    );
    if (!rows.length) return res.status(404).json({ error: "No puzzles found" });

    // group by date
    const grouped: Record<string, Record<string, any>> = {};
    for (const row of rows) {
      if (!grouped[row.puzzle_date]) grouped[row.puzzle_date] = {};
      const typeBucket = grouped[row.puzzle_date][row.type_name] || {};
      typeBucket[row.language] = row.content;
      grouped[row.puzzle_date][row.type_name] = typeBucket;
    }
    return res.json(grouped);
  } catch (err) {
    console.error("Error exporting puzzles", err);
    return res.status(500).json({ error: "Failed to export puzzles" });
  }
});

export default router;
