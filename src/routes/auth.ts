import { Router } from "express";
import { db } from "../db.js";
import { z } from "zod";

const router = Router();

const signupSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  region: z.string().optional(),
  language: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
});

router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { name, email, region, language } = parsed.data;

  try {
    const result = await db.query(
      `INSERT INTO users (name,email,region,language)
       VALUES ($1,$2,$3,$4)
       RETURNING id`,
      [name, email, region, language]
    );

    res.json({ userId: result.rows[0].id });
  } catch (err) {
    console.error("Error signing up user", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// POST /auth/signin - idempotent: find by email, else create minimal user
router.post("/signin", async (req, res) => {
  const parsed = signinSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { email, name, region, language } = parsed.data;
  try {
    const existing = await db.query(
      `SELECT id, name, email, region, language FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    if (existing.rows.length) {
      return res.json(existing.rows[0]);
    }
    const result = await db.query(
      `INSERT INTO users (name, email, region, language)
       VALUES ($1,$2,$3,$4)
       RETURNING id, name, email, region, language`,
      [name || email.split("@")[0], email, region, language]
    );
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error signing in user", err);
    return res.status(500).json({ error: "Failed to sign in" });
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
    const result = await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${idx} RETURNING id, name, email, region, language`,
      values
    );
    if (!result.rowCount) return res.status(404).json({ error: "User not found" });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating profile", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

export default router;
