import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../db.js", () => ({
  db: { query: vi.fn() },
  query: vi.fn(),
}));

// adminAuth always passes in tests
vi.mock("../middleware/adminAuth.js", () => ({
  adminAuth: (_req: any, _res: any, next: any) => next(),
}));

import { db } from "../db.js";
import puzzleRouter from "../routes/puzzle.js";

const dbQuery = db.query as ReturnType<typeof vi.fn>;

const app = express();
app.use(express.json());
app.use("/puzzle", puzzleRouter);

beforeEach(() => {
  dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ════════════════════════════════════════════════════════════════════════════
describe("GET /puzzle/today", () => {
  it("returns grouped crossword/wordsearch/unjumble", async () => {
    const rows = [
      {
        puzzle_content_id: 1,
        puzzle_id: 10,
        type_name: "crossword",
        language: "en",
        slot: 1,
        content: JSON.stringify({ gridSize: 12, words: [] }),
      },
      {
        puzzle_content_id: 2,
        puzzle_id: 10,
        type_name: "wordsearch",
        language: "en",
        slot: 1,
        content: JSON.stringify({ grid: [] }),
      },
    ];
    dbQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

    const res = await request(app).get("/puzzle/today?lang=en");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("crossword");
    expect(res.body).toHaveProperty("wordsearch");
    expect(res.body).toHaveProperty("unjumble");
    expect(res.body.crossword).toHaveLength(1);
    expect(res.body.unjumble).toHaveLength(0);
  });

  it("returns empty arrays when no puzzles for today", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get("/puzzle/today");

    expect(res.status).toBe(200);
    expect(res.body.crossword).toEqual([]);
    expect(res.body.wordsearch).toEqual([]);
    expect(res.body.unjumble).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("POST /puzzle/upload", () => {
  it("creates puzzle content and returns 201", async () => {
    // upsertPuzzleDay MERGE → { id: 10 }
    dbQuery.mockResolvedValueOnce({ rows: [{ id: 10 }], rowCount: 1 });
    // upsertPuzzleType MERGE → { id: 1 }
    dbQuery.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    // upsertPuzzleContent MERGE → no rows needed
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    const res = await request(app)
      .post("/puzzle/upload")
      .send({
        puzzleDate: "2026-05-01",
        type: "crossword",
        language: "en",
        slot: 1,
        content: { gridSize: 12, words: [] },
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ puzzleId: 10, puzzleTypeId: 1 });
  });

  it("returns 400 for invalid date format", async () => {
    const res = await request(app)
      .post("/puzzle/upload")
      .send({ puzzleDate: "01-05-2026", type: "crossword", content: {} });

    expect(res.status).toBe(400);
  });

  it("returns 400 when puzzleDate is missing", async () => {
    const res = await request(app)
      .post("/puzzle/upload")
      .send({ type: "crossword", content: {} });

    expect(res.status).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("GET /puzzle/:date", () => {
  it("returns puzzles for a valid date", async () => {
    const rows = [
      {
        puzzle_content_id: 3,
        puzzle_id: 10,
        type_name: "unjumble",
        language: "en",
        content: JSON.stringify({ questions: [] }),
      },
    ];
    dbQuery.mockResolvedValueOnce({ rows, rowCount: 1 });

    const res = await request(app).get("/puzzle/2026-05-01?lang=en");

    expect(res.status).toBe(200);
    expect(res.body.unjumble).toMatchObject({ puzzleContentId: 3 });
  });

  it("returns 400 for invalid date format", async () => {
    const res = await request(app).get("/puzzle/not-a-date");
    expect(res.status).toBe(400);
  });

  it("returns nulls for types that have no content on that date", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get("/puzzle/2026-01-01?lang=en");

    expect(res.status).toBe(200);
    expect(res.body.crossword).toBeNull();
    expect(res.body.wordsearch).toBeNull();
    expect(res.body.unjumble).toBeNull();
  });
});
