import { Router } from "express";
import { db } from "../db.js";
import { z } from "zod";
import { randomBytes, scrypt as _scrypt } from "crypto";
import { promisify } from "util";

const router = Router();
const scrypt = promisify(_scrypt);

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  region: z.string().optional(),
  language: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

// Ensure password_hash column exists (idempotent, runs once at startup)
const ensurePasswordColumn = db.query(`
  IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID(N'users') AND name = N'password_hash'
  )
  BEGIN
    ALTER TABLE users ADD password_hash NVARCHAR(MAX)
  END
`);

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$16384$8$1$${salt.toString("base64")}$${derived.toString("base64")}`;
}

async function verifyPassword(password: string, stored?: string | null) {
  if (!stored || !stored.startsWith("scrypt$")) return false;
  const [, nStr, rStr, pStr, saltB64, hashB64] = stored.split("$");
  const salt = Buffer.from(saltB64, "base64");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return derived.toString("base64") === hashB64;
}

const setPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email, password, region, language } = parsed.data;

  try {
    await ensurePasswordColumn;
    const passwordHash = await hashPassword(password);

    const result = await db.query(
      `INSERT INTO users (name, email, region, language, password_hash, created_at)
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.region, INSERTED.language
       VALUES ($1, $2, $3, $4, $5, GETUTCDATE())`,
      [name, email, region ?? null, language ?? null, passwordHash]
    );

    res.json(result.rows[0]);
  } catch (err: any) {
    // MSSQL unique-constraint violation numbers: 2627 (PRIMARY KEY) and 2601 (unique index)
    if (err?.number === 2627 || err?.number === 2601) {
      return res.status(409).json({ error: "Email already registered" });
    }
    console.error("Error signing up user", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// POST /auth/signin - require existing account + correct password
router.post("/signin", async (req, res) => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;
  try {
    await ensurePasswordColumn;
    const existing = await db.query(
      `SELECT TOP 1 id, name, email, region, language, password_hash FROM users WHERE email = $1`,
      [email]
    );
    if (!existing.rows.length) {
      return res.status(401).json({ error: "Account not found. Please sign up first." });
    }
    const user = existing.rows[0];
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });
    delete user.password_hash;
    return res.json(user);
  } catch (err) {
    console.error("Error signing in user", err);
    return res.status(500).json({ error: "Failed to sign in" });
  }
});

// POST /auth/set-password - one-time password set for legacy accounts without a hash
router.post("/set-password", async (req, res) => {
  const parsed = setPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, password } = parsed.data;

  try {
    await ensurePasswordColumn;
    const existing = await db.query(
      `SELECT TOP 1 id, password_hash FROM users WHERE email = $1`,
      [email]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ error: "Account not found" });
    }
    const user = existing.rows[0];
    if (user.password_hash) {
      return res.status(409).json({ error: "Password already set" });
    }
    const passwordHash = await hashPassword(password);
    await db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [passwordHash, user.id]);
    return res.json({ ok: true });
  } catch (err) {
    console.error("Error setting password", err);
    return res.status(500).json({ error: "Failed to set password" });
  }
});

// PATCH /auth/profile/:id - update user profile fields
router.patch("/profile/:id", async (req, res) => {
  const userId = Number(req.params.id);
  const { name, region, language } = req.body as {
    name?: string;
    region?: string;
    language?: string;
  };

  if (!userId) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (name) {
    updates.push(`name = $${idx++}`);
    values.push(name);
  }
  if (region) {
    updates.push(`region = $${idx++}`);
    values.push(region);
  }
  if (language) {
    updates.push(`language = $${idx++}`);
    values.push(language);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "No fields to update" });
  }

  values.push(userId);

  try {
    // In MSSQL the OUTPUT clause must appear before WHERE
    const result = await db.query(
      `UPDATE users
         SET ${updates.join(", ")}
       OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.region, INSERTED.language
       WHERE id = $${idx}`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating profile", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
