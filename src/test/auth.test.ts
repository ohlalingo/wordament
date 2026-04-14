import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

// ── Mock db before importing routes ──────────────────────────────────────────
vi.mock("../db.js", () => ({
  db: { query: vi.fn() },
  query: vi.fn(),
}));

import { db } from "../db.js";
import authRouter from "../routes/auth.js";

const dbQuery = db.query as ReturnType<typeof vi.fn>;

// ── App fixture ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/auth", authRouter);

// ── Helpers ──────────────────────────────────────────────────────────────────
const mockEmpty = () => dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
const mockRows = (rows: any[], rowCount = rows.length) =>
  dbQuery.mockResolvedValue({ rows, rowCount });

beforeEach(() => {
  // ensurePasswordColumn resolves immediately by default
  dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ════════════════════════════════════════════════════════════════════════════
describe("POST /auth/signup", () => {
  it("creates a new user and returns their profile", async () => {
    const newUser = { id: 1, name: "Alice", email: "alice@test.com", region: "IN", language: "en" };

    // INSERT … OUTPUT INSERTED.* → new user row
    // (ensurePasswordColumn is a module-level settled promise — no extra mock needed)
    dbQuery.mockResolvedValueOnce({ rows: [newUser], rowCount: 1 });

    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Alice", email: "alice@test.com", password: "password123", region: "IN", language: "en" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 1, name: "Alice", email: "alice@test.com" });
  });

  it("returns 400 for invalid input (short password)", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Alice", email: "alice@test.com", password: "short" });

    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Alice", email: "not-an-email", password: "password123" });

    expect(res.status).toBe(400);
  });

  it("returns 409 when email is already registered (MSSQL unique violation 2627)", async () => {
    const err: any = new Error("Unique constraint");
    err.number = 2627;
    dbQuery.mockRejectedValueOnce(err);

    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Alice", email: "alice@test.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Email already registered");
  });

  it("returns 409 on unique index violation 2601 as well", async () => {
    const err: any = new Error("Unique constraint");
    err.number = 2601;
    dbQuery.mockRejectedValueOnce(err);

    const res = await request(app)
      .post("/auth/signup")
      .send({ name: "Alice", email: "alice@test.com", password: "password123" });

    expect(res.status).toBe(409);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("POST /auth/signin", () => {
  it("returns 401 when account does not exist", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT TOP 1 … WHERE email = ?

    const res = await request(app)
      .post("/auth/signin")
      .send({ email: "nobody@test.com", password: "password123" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/not found/i);
  });

  it("returns 401 for wrong password", async () => {
    // Return a user with a hash for a *different* password
    const storedHash = "scrypt$16384$8$1$aGFzaA==$bm90YXJlYWxoYXNo"; // garbage hash
    dbQuery.mockResolvedValueOnce({
      rows: [{ id: 1, name: "Alice", email: "alice@test.com", region: null, language: null, password_hash: storedHash }],
      rowCount: 1,
    });

    const res = await request(app)
      .post("/auth/signin")
      .send({ email: "alice@test.com", password: "wrongpassword" });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Invalid credentials");
  });

  it("returns 400 for missing password field", async () => {
    const res = await request(app)
      .post("/auth/signin")
      .send({ email: "alice@test.com" });

    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("POST /auth/set-password", () => {
  it("returns 404 when account does not exist", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT TOP 1

    const res = await request(app)
      .post("/auth/set-password")
      .send({ email: "nobody@test.com", password: "password123" });

    expect(res.status).toBe(404);
  });

  it("returns 409 when password is already set", async () => {
    dbQuery.mockResolvedValueOnce({
      rows: [{ id: 1, password_hash: "scrypt$already_set" }],
      rowCount: 1,
    });

    const res = await request(app)
      .post("/auth/set-password")
      .send({ email: "alice@test.com", password: "password123" });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Password already set");
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("PATCH /auth/profile/:id", () => {
  it("updates name and returns the updated row", async () => {
    const updated = { id: 1, name: "Alice Updated", email: "alice@test.com", region: "IN", language: "en" };
    dbQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 });

    const res = await request(app)
      .patch("/auth/profile/1")
      .send({ name: "Alice Updated" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alice Updated");
  });

  it("returns 400 when no fields are provided", async () => {
    const res = await request(app).patch("/auth/profile/1").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no fields/i);
  });

  it("returns 404 when user not found (OUTPUT returns no rows)", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .patch("/auth/profile/1")
      .send({ name: "Ghost" });

    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid (non-numeric) user id", async () => {
    const res = await request(app)
      .patch("/auth/profile/abc")
      .send({ name: "Alice" });

    expect(res.status).toBe(400);
  });
});
