import "reflect-metadata";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import puzzleRoutes from "./routes/puzzle.js";
import authRoutes from "./routes/auth.js";
import attemptRoutes from "./routes/attempt.js";
import leaderboardRoutes from "./routes/leaderboard.js";
import adminRoutes from "./routes/admin.js";
import { buildAdminRouter } from "./admin/admin.js";
import { adminAuth } from "./middleware/adminAuth.js";
import { db } from "./db.js";

dotenv.config();

const app = express();

// rate limit auth and attempt
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const attemptLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(cors());
app.use(express.json());
// Respect X-Forwarded-* headers when behind a proxy/load balancer
app.set("trust proxy", 1);

// Block text/plain requests from hitting AdminJS/formidable to avoid log spam
app.use("/admin", (req, res, next) => {
  const ct = req.headers["content-type"] || "";
  if (ct.startsWith("text/plain")) {
    return res.status(415).json({ error: "Unsupported content-type" });
  }
  next();
});

app.get("/", (_req, res) => {
  res.json({ message: "CyberWordament backend is running" });
});

// Primary API routes (with /api prefix)
app.use("/api/puzzle", puzzleRoutes);
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/attempt", attemptLimiter, attemptRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
// Compatibility: allow /api/regional-champions and other legacy paths
app.use("/api", leaderboardRoutes);

// Legacy routes (backward compatibility)
app.use("/puzzle", puzzleRoutes);
app.use("/auth", authLimiter, authRoutes);
app.use("/attempt", attemptLimiter, attemptRoutes);
app.use("/leaderboard", leaderboardRoutes);

// Remove reserved metadata keys from stored JSON content
function stripReservedFields(content: any) {
  if (content && typeof content === "object") {
    const clone = Array.isArray(content) ? [...content] : { ...content };
    delete (clone as any).id;
    delete (clone as any).date;
    delete (clone as any).language;
    return clone;
  }
  return content;
}

// Normalize incoming date values to YYYY-MM-DD
function normalizeDateString(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString("en-CA");
  } catch {
    return null;
  }
}

// ── Shared MERGE helpers (also used in routes/puzzle.ts and routes/admin.ts) ─

async function upsertPuzzleDay(puzzleDate: string): Promise<number> {
  const { rows } = await db.query(
    `MERGE puzzles WITH (HOLDLOCK) AS T
     USING (VALUES ($1)) AS S(puzzle_date)
     ON T.puzzle_date = S.puzzle_date
     WHEN NOT MATCHED THEN INSERT (puzzle_date) VALUES (S.puzzle_date)
     WHEN MATCHED    THEN UPDATE SET puzzle_date = S.puzzle_date
     OUTPUT INSERTED.id;`,
    [puzzleDate]
  );
  return rows[0].id as number;
}

async function upsertPuzzleType(typeName: string): Promise<number> {
  const { rows } = await db.query(
    `MERGE puzzle_types WITH (HOLDLOCK) AS T
     USING (VALUES ($1)) AS S(type_name)
     ON T.type_name = S.type_name
     WHEN NOT MATCHED THEN INSERT (type_name) VALUES (S.type_name)
     WHEN MATCHED    THEN UPDATE SET type_name = S.type_name
     OUTPUT INSERTED.id;`,
    [typeName]
  );
  return rows[0].id as number;
}

async function upsertPuzzleContent(
  puzzleId: number,
  puzzleTypeId: number,
  language: string,
  slot: number,
  externalId: string | null,
  content: string
): Promise<void> {
  await db.query(
    `MERGE puzzle_content WITH (HOLDLOCK) AS T
     USING (VALUES ($1,$2,$3,$4,$5,$6))
       AS S(puzzle_id, puzzle_type_id, language, slot, external_id, content)
     ON  T.puzzle_id      = S.puzzle_id
     AND T.puzzle_type_id = S.puzzle_type_id
     AND T.language       = S.language
     AND T.slot           = S.slot
     WHEN NOT MATCHED THEN
       INSERT (puzzle_id, puzzle_type_id, language, slot, external_id, content)
       VALUES (S.puzzle_id, S.puzzle_type_id, S.language, S.slot, S.external_id, S.content)
     WHEN MATCHED THEN
       UPDATE SET content = S.content, external_id = S.external_id;`,
    [puzzleId, puzzleTypeId, language, slot, externalId, content]
  );
}

// Admin import endpoint (used by AdminJS Import page)
app.post("/api/import-puzzle", adminAuth, async (req, res) => {
  const payload = req.body;
  const items = Array.isArray(payload) ? payload : [payload];

  try {
    let imported = 0;
    for (const item of items) {
      const date = normalizeDateString(item.date);
      const type = item.type;
      const slot = Number(item.slot) || 1;
      const externalId = item.id || item.externalId || null;
      let language = (item.language || "en").toLowerCase();
      if (language === "japanese" || language === "jp") language = "ja";
      if (language === "english") language = "en";
      const raw = stripReservedFields(item.content ?? item);
      const contentStr = typeof raw === "string" ? raw : JSON.stringify(raw);

      if (!date || !type) {
        return res.status(400).json({ error: "Each puzzle needs 'date' and 'type'" });
      }

      const puzzleId = await upsertPuzzleDay(date);
      const puzzleTypeId = await upsertPuzzleType(type);
      await upsertPuzzleContent(puzzleId, puzzleTypeId, language, slot, externalId, contentStr);

      imported += 1;
    }

    return res.json({ imported });
  } catch (err) {
    console.error("Import puzzle error", err);
    return res.status(500).json({ error: "Failed to import puzzles" });
  }
});

// AdminJS panel and admin API
async function initAdmin() {
  try {
    const { admin, router } = await buildAdminRouter({
      host: process.env.DB_HOST || "localhost",
      port: Number(process.env.DB_PORT) || 1433,   // MSSQL default port
      user: process.env.DB_USER || "sa",
      password: process.env.DB_PASS || "",
      database: process.env.DB_NAME || "cyberwordament",
    });

    app.use("/admin/api", adminAuth, adminRoutes);
    app.use(admin.options.rootPath, router);

    console.log(`AdminJS ready at ${admin.options.rootPath}`);
  } catch (err) {
    console.error("AdminJS failed to start but server continues:", err);
  }
}

async function start() {
  await initAdmin();

  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
