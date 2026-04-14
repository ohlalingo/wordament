import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";

vi.mock("../db.js", () => ({
  db: { query: vi.fn() },
  query: vi.fn(),
}));

import { db } from "../db.js";
import leaderboardRouter from "../routes/leaderboard.js";

const dbQuery = db.query as ReturnType<typeof vi.fn>;

const app = express();
app.use(express.json());
app.use("/leaderboard", leaderboardRouter);

beforeEach(() => {
  dbQuery.mockResolvedValue({ rows: [], rowCount: 0 });
});

// ════════════════════════════════════════════════════════════════════════════
describe("GET /leaderboard", () => {
  it("returns top 20 rows sorted by score", async () => {
    const rows = [
      { name: "Alice", region: "IN", score: "10", time: "200", rank: "1" },
      { name: "Bob",   region: "US", score: "8",  time: "300", rank: "2" },
    ];
    dbQuery.mockResolvedValueOnce({ rows, rowCount: 2 });

    const res = await request(app).get("/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].name).toBe("Alice");
  });

  it("returns empty array when no attempts exist", async () => {
    dbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const res = await request(app).get("/leaderboard");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("GET /leaderboard/regional-champions", () => {
  it("returns today, week, and allTime buckets", async () => {
    const champion = [{ region: "india", name: "Alice", score: "5", time: "100", rank: "1" }];
    // today / week / allTime — three fetchBucket calls each running one query
    dbQuery
      .mockResolvedValueOnce({ rows: champion, rowCount: 1 }) // today
      .mockResolvedValueOnce({ rows: champion, rowCount: 1 }) // week
      .mockResolvedValueOnce({ rows: champion, rowCount: 1 }); // allTime

    const res = await request(app).get("/leaderboard/regional-champions");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("today");
    expect(res.body).toHaveProperty("week");
    expect(res.body).toHaveProperty("allTime");
    expect(res.body.today[0].region).toBe("india");
  });
});

// ════════════════════════════════════════════════════════════════════════════
describe("GET /leaderboard/user-stats/:userId", () => {
  it("returns puzzlesCompleted, bestTimeSeconds, and currentStreak", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const summary = [{ puzzles_completed: 3, best_time_seconds: 120 }];
    // dates for streak: today and yesterday
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const dateRows = [
      { date: new Date(today) },
      { date: new Date(yesterday) },
    ];

    dbQuery
      .mockResolvedValueOnce({ rows: summary, rowCount: 1 })    // summary
      .mockResolvedValueOnce({ rows: dateRows, rowCount: 2 });  // dates

    const res = await request(app).get("/leaderboard/user-stats/1");

    expect(res.status).toBe(200);
    expect(res.body.puzzlesCompleted).toBe(3);
    expect(res.body.bestTimeSeconds).toBe(120);
    expect(res.body.currentStreak).toBeGreaterThanOrEqual(2);
  });

  it("returns streak = 0 when no attempts today", async () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
    dbQuery
      .mockResolvedValueOnce({ rows: [{ puzzles_completed: 1, best_time_seconds: 200 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ date: new Date(twoWeeksAgo) }], rowCount: 1 });

    const res = await request(app).get("/leaderboard/user-stats/1");

    expect(res.status).toBe(200);
    expect(res.body.currentStreak).toBe(0);
  });

  it("returns 400 for invalid userId", async () => {
    const res = await request(app).get("/leaderboard/user-stats/abc");
    expect(res.status).toBe(400);
  });
});
