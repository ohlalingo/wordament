import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../db.js", () => ({
  db: { query: vi.fn() },
  query: vi.fn(),
}));

import { db } from "../db.js";
import attemptRouter from "../routes/attempt.js";

const dbQuery = db.query as ReturnType<typeof vi.fn>;

const app = express();
app.use(express.json());
app.use("/attempt", attemptRouter);

beforeEach(() => {
  dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ════════════════════════════════════════════════════════════════════════════
describe("POST /attempt", () => {
  it("saves a valid attempt and returns attemptId + score", async () => {
    const content = JSON.stringify({ timeLimit: 600 });

    // 1. SELECT puzzle_content WHERE id = ?
    dbQuery.mockResolvedValueOnce({ rows: [{ puzzle_id: 1, content }], rowCount: 1 });
    // 2. SELECT existing attempt (none)
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    // 3. INSERT … OUTPUT INSERTED.id
    dbQuery.mockResolvedValueOnce({ rows: [{ id: 42 }], rowCount: 1 });

    const res = await request(app)
      .post("/attempt")
      .send({ userId: 1, puzzleContentId: 1, correctWords: 5, timeTaken: 300 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ attemptId: 42, score: 5 });
  });

  it("returns 409 when puzzle already attempted", async () => {
    const content = JSON.stringify({});
    dbQuery.mockResolvedValueOnce({ rows: [{ puzzle_id: 1, content }], rowCount: 1 });
    // existing attempt found
    dbQuery.mockResolvedValueOnce({ rows: [{ one: 1 }], rowCount: 1 });

    const res = await request(app)
      .post("/attempt")
      .send({ userId: 1, puzzleContentId: 1, correctWords: 3, timeTaken: 100 });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Puzzle already attempted");
  });

  it("returns 400 when puzzleContentId is invalid", async () => {
    // SELECT returns no rows
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app)
      .post("/attempt")
      .send({ userId: 1, puzzleContentId: 99999, correctWords: 3, timeTaken: 100 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid puzzleContentId");
  });

  it("returns 400 when time limit is exceeded", async () => {
    const content = JSON.stringify({ timeLimit: 300 });
    dbQuery.mockResolvedValueOnce({ rows: [{ puzzle_id: 1, content }], rowCount: 1 });
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // no existing attempt

    const res = await request(app)
      .post("/attempt")
      .send({ userId: 1, puzzleContentId: 1, correctWords: 3, timeTaken: 400 }); // over limit

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Time limit exceeded");
  });

  it("returns 400 for invalid body (userId missing)", async () => {
    const res = await request(app)
      .post("/attempt")
      .send({ puzzleContentId: 1, correctWords: 3, timeTaken: 100 });

    expect(res.status).toBe(400);
  });

  it("returns 400 for negative correctWords", async () => {
    const res = await request(app)
      .post("/attempt")
      .send({ userId: 1, puzzleContentId: 1, correctWords: -1, timeTaken: 100 });

    expect(res.status).toBe(400);
  });
});
