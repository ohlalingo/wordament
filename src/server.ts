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

app.use("/puzzle", puzzleRoutes);
app.use("/auth", authLimiter, authRoutes);
app.use("/attempt", attemptLimiter, attemptRoutes);
// Expose leaderboard endpoints under /api to match frontend calls
app.use("/api", leaderboardRoutes);
// Legacy prefix kept for old clients
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

// Normalize incoming date values to YYYY-MM-DD (server-local) to avoid TZ shifts
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
      const content = stripReservedFields(item.content ?? item);

      if (!date || !type) {
        return res.status(400).json({ error: "Each puzzle needs 'date' and 'type'" });
      }

      const puzzleResult = await db.query(
        `INSERT INTO puzzles (puzzle_date)
         VALUES ($1)
         ON CONFLICT (puzzle_date) DO UPDATE SET puzzle_date = EXCLUDED.puzzle_date
         RETURNING id`,
        [date]
      );
      const puzzleId = puzzleResult.rows[0].id;

      const typeResult = await db.query(
        `INSERT INTO puzzle_types (type_name)
         VALUES ($1)
         ON CONFLICT (type_name) DO UPDATE SET type_name = EXCLUDED.type_name
         RETURNING id`,
        [type]
      );
      const puzzleTypeId = typeResult.rows[0].id;

      await db.query(
        `INSERT INTO puzzle_content (puzzle_id, puzzle_type_id, language, slot, external_id, content)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (puzzle_id, puzzle_type_id, language, slot)
         DO UPDATE SET content = EXCLUDED.content, external_id = EXCLUDED.external_id`,
        [puzzleId, puzzleTypeId, language, slot, externalId, content]
      );

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
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || "postgres",
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

  const PORT = 4000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start();
