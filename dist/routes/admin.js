import { Router } from "express";
import { db } from "../db.js";
import { adminAuth } from "../middleware/adminAuth.js";
const router = Router();
// apply admin auth for all routes
router.use(adminAuth);
const stripReservedFields = (content) => {
    if (content && typeof content === "object") {
        const clone = Array.isArray(content) ? [...content] : { ...content };
        delete clone.id;
        delete clone.date;
        delete clone.language;
        return clone;
    }
    return content;
};
// Helpers for pagination
function getPagination(req) {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}
// GET /admin/users?page=&limit=
router.get("/users", async (req, res) => {
    const { limit, offset } = getPagination(req);
    try {
        const { rows } = await db.query(`SELECT id, name, email, region, language, role, created_at
       FROM users
       ORDER BY id
       LIMIT $1 OFFSET $2`, [limit, offset]);
        return res.json(rows);
    }
    catch (err) {
        console.error("Admin users list error", err);
        return res.status(500).json({ error: "Failed to list users" });
    }
});
// DELETE /admin/users/:id
router.delete("/users/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (!id)
        return res.status(400).json({ error: "Invalid id" });
    try {
        const result = await db.query("DELETE FROM users WHERE id = $1", [id]);
        return res.json({ deleted: result.rowCount });
    }
    catch (err) {
        console.error("Admin delete user error", err);
        return res.status(500).json({ error: "Failed to delete user" });
    }
});
// GET /admin/puzzles : list puzzle days and available types
router.get("/puzzles", async (_req, res) => {
    try {
        const { rows } = await db.query(`SELECT p.puzzle_date, array_agg(DISTINCT pt.type_name) AS types
       FROM puzzle_content pc
       JOIN puzzles p ON p.id = pc.puzzle_id
       JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
       GROUP BY p.puzzle_date
       ORDER BY p.puzzle_date DESC`);
        return res.json(rows);
    }
    catch (err) {
        console.error("Admin list puzzles error", err);
        return res.status(500).json({ error: "Failed to list puzzles" });
    }
});
// PATCH /admin/puzzle/:contentId
router.patch("/puzzle/:contentId", async (req, res) => {
    const contentId = Number(req.params.contentId);
    if (!contentId)
        return res.status(400).json({ error: "Invalid content id" });
    const { content, puzzleDate, type, externalId, slot } = req.body;
    let { language } = req.body;
    console.log("[PATCH /admin/puzzle/:id] id=%s body=%j", contentId, req.body);
    try {
        const existing = await db.query("SELECT * FROM puzzle_content WHERE id = $1", [contentId]);
        if (!existing.rowCount)
            return res.status(404).json({ error: "Puzzle content not found" });
        const row = existing.rows[0];
        // normalize language
        language = (language || row.language || "en").toLowerCase();
        if (language === "japanese" || language === "jp")
            language = "ja";
        if (language === "english")
            language = "en";
        // normalize slot
        const normalizedSlot = Number(slot ?? row.slot ?? 1) || 1;
        // normalize puzzle date (YYYY-MM-DD)
        const rawPuzzleDate = puzzleDate ?? row.puzzle_date;
        const puzzleDateStr = rawPuzzleDate ? String(rawPuzzleDate).slice(0, 10) : null;
        if (!puzzleDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(puzzleDateStr)) {
            return res.status(400).json({ error: "Invalid puzzle_date format. Expected YYYY-MM-DD" });
        }
        // ensure puzzle date -> puzzle_id
        let puzzleId = row.puzzle_id;
        if (puzzleDateStr) {
            const puzzleDay = await db.query(`INSERT INTO puzzles (puzzle_date) VALUES ($1)
         ON CONFLICT (puzzle_date) DO UPDATE SET puzzle_date = EXCLUDED.puzzle_date
         RETURNING id`, [puzzleDateStr]);
            puzzleId = puzzleDay.rows[0].id;
        }
        // ensure puzzle type -> puzzle_type_id
        let puzzleTypeId = row.puzzle_type_id;
        if (type) {
            const typeRow = await db.query(`INSERT INTO puzzle_types (type_name) VALUES ($1)
         ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name
         RETURNING id`, [type]);
            puzzleTypeId = typeRow.rows[0].id;
        }
        // avoid unique conflicts when moving slot
        await db.query(`DELETE FROM puzzle_content
       WHERE puzzle_id = $1 AND puzzle_type_id = $2 AND language = $3 AND slot = $4 AND id <> $5`, [puzzleId, puzzleTypeId, language, normalizedSlot, contentId]);
        const updated = await db.query(`UPDATE puzzle_content
         SET content = $1,
             language = $2,
             external_id = $3,
             puzzle_id = $4,
             puzzle_type_id = $5,
             slot = $6
       WHERE id = $7`, [content ?? row.content, language, externalId ?? row.external_id, puzzleId, puzzleTypeId, normalizedSlot, contentId]);
        if (!updated.rowCount)
            return res.status(404).json({ error: "Puzzle content not found" });
        return res.json({
            updated: updated.rowCount,
            content: content ?? row.content,
            language,
            externalId: externalId ?? row.external_id,
            puzzleId,
            puzzleTypeId,
            slot: normalizedSlot,
            puzzleDate: puzzleDateStr,
        });
    }
    catch (err) {
        console.error("Admin update puzzle error", err);
        return res.status(500).json({ error: "Failed to update puzzle" });
    }
});
// GET /admin/puzzle/:contentId - fetch full puzzle content with date/type names for editing
router.get("/puzzle/:contentId", async (req, res) => {
    const contentId = Number(req.params.contentId);
    if (!contentId)
        return res.status(400).json({ error: "Invalid content id" });
    try {
        const { rows } = await db.query(`SELECT pc.id,
              pc.language,
              pc.external_id,
              pc.slot,
              pc.content,
              p.puzzle_date,
              pt.type_name
       FROM puzzle_content pc
       JOIN puzzles p ON p.id = pc.puzzle_id
       JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
       WHERE pc.id = $1`, [contentId]);
        if (!rows.length)
            return res.status(404).json({ error: "Puzzle content not found" });
        return res.json(rows[0]);
    }
    catch (err) {
        console.error("Admin get puzzle error", err);
        return res.status(500).json({ error: "Failed to fetch puzzle" });
    }
});
// DELETE /admin/puzzle/:contentId
router.delete("/puzzle/:contentId", async (req, res) => {
    const contentId = Number(req.params.contentId);
    if (!contentId)
        return res.status(400).json({ error: "Invalid content id" });
    try {
        const { rowCount } = await db.query("DELETE FROM puzzle_content WHERE id = $1", [contentId]);
        return res.json({ deleted: rowCount });
    }
    catch (err) {
        console.error("Admin delete puzzle error", err);
        return res.status(500).json({ error: "Failed to delete puzzle" });
    }
});
// GET /admin/attempts?page=&limit=
router.get("/attempts", async (req, res) => {
    const { limit, offset } = getPagination(req);
    try {
        const { rows } = await db.query(`SELECT pa.id,
              u.name AS user,
              pt.type_name AS puzzle_type,
              pa.score,
              pa.correct_words,
              pa.time_taken,
              pa.created_at
       FROM puzzle_attempts pa
       JOIN users u ON u.id = pa.user_id
       JOIN puzzle_content pc ON pc.id = pa.puzzle_content_id
       JOIN puzzle_types pt ON pt.id = pc.puzzle_type_id
       ORDER BY pa.created_at DESC
       LIMIT $1 OFFSET $2`, [limit, offset]);
        return res.json(rows);
    }
    catch (err) {
        console.error("Admin attempts list error", err);
        return res.status(500).json({ error: "Failed to list attempts" });
    }
});
// POST /admin/api/import-puzzle
router.post("/import-puzzle", async (req, res) => {
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];
    try {
        let imported = 0;
        for (const item of items) {
            const date = String(item.date || "").slice(0, 10);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
                return res.status(400).json({ error: "Invalid date format. Expected YYYY-MM-DD" });
            }
            const type = item.type;
            let language = (item.language || "en").toLowerCase();
            if (language === "japanese" || language === "jp")
                language = "ja";
            if (language === "english")
                language = "en";
            const slot = Number(item.slot ?? 1) || 1;
            const content = stripReservedFields(item.content ?? item);
            const externalId = item.id || item.externalId || null;
            if (!date || !type) {
                return res.status(400).json({ error: "Each puzzle needs 'date' and 'type'" });
            }
            const puzzleResult = await db.query(`INSERT INTO puzzles (puzzle_date)
         VALUES ($1)
         ON CONFLICT (puzzle_date) DO UPDATE SET puzzle_date = EXCLUDED.puzzle_date
         RETURNING id`, [date]);
            const puzzleId = puzzleResult.rows[0].id;
            const typeResult = await db.query(`INSERT INTO puzzle_types (type_name)
         VALUES ($1)
         ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name
         RETURNING id`, [type]);
            const puzzleTypeId = typeResult.rows[0].id;
            await db.query(`INSERT INTO puzzle_content (puzzle_id, puzzle_type_id, language, slot, external_id, content)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (puzzle_id, puzzle_type_id, language, slot)
         DO UPDATE SET content = EXCLUDED.content, external_id = EXCLUDED.external_id`, [puzzleId, puzzleTypeId, language, slot, externalId, content]);
            imported += 1;
        }
        return res.json({ imported });
    }
    catch (err) {
        console.error("Import puzzle error", err);
        return res.status(500).json({ error: "Failed to import puzzles" });
    }
});
export default router;
