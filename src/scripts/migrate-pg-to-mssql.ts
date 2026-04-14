/**
 * migrate-pg-to-mssql.ts
 *
 * One-shot script: reads ALL data from the live Postgres DB and inserts it
 * into MSSQL, preserving original IDs via IDENTITY_INSERT ON/OFF.
 *
 * IMPORTANT: All statements for each table are batched into a SINGLE query()
 * call so that IDENTITY_INSERT stays in scope for the entire batch.
 *
 * Run AFTER schema.mssql.sql has been applied to the MSSQL database.
 *
 * Usage:
 *   npm install pg          # re-add pg temporarily
 *   npx tsx src/scripts/migrate-pg-to-mssql.ts
 *   npm uninstall pg        # remove when done
 *
 * Environment variables:
 *   PG_HOST, PG_PORT, PG_USER, PG_PASS, PG_DB   ← source Postgres
 *   DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME  ← target MSSQL
 */

import dotenv from "dotenv";
dotenv.config();

// ── Dynamic import of pg ──────────────────────────────────────────────────────
const { Pool } = await import("pg" as any).catch(() => {
  console.error("pg package not found. Run: npm install pg");
  process.exit(1);
}) as any;

import sql from "mssql";

// ── Postgres connection ───────────────────────────────────────────────────────
const pg = new Pool({
  host:     process.env.PG_HOST || "localhost",
  port:     Number(process.env.PG_PORT || 5432),
  user:     process.env.PG_USER || "wordament",
  password: process.env.PG_PASS || "wordament",
  database: process.env.PG_DB  || "wordament",
});

// ── MSSQL connection ──────────────────────────────────────────────────────────
const mssqlPool = await new sql.ConnectionPool({
  server:   process.env.DB_HOST  || "localhost",
  port:     Number(process.env.DB_PORT) || 1433,
  user:     process.env.DB_USER  || "wordament",
  password: process.env.DB_PASS  || "wordament@123",
  database: process.env.DB_NAME  || "wordament",
  options: {
    encrypt:                process.env.DB_ENCRYPT    !== "false",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
  },
}).connect();

// ── Execute a batch of SQL as ONE query (keeps IDENTITY_INSERT in scope) ─────
async function execBatch(sqlBatch: string) {
  await mssqlPool.request().query(sqlBatch);
}

// ── Escape a value for raw SQL embedding ─────────────────────────────────────
function esc(v: any): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString().slice(0, 23).replace("T", " ")}'`;
  return `N'${String(v).replace(/'/g, "''")}'`;
}

console.log("=== CyberWordament: Postgres → MSSQL data migration ===\n");

// ════════════════════════════════════════════════════════════════════════════
// 1. puzzle_types
// ════════════════════════════════════════════════════════════════════════════
{
  const { rows } = await pg.query("SELECT id, type_name FROM puzzle_types ORDER BY id");
  console.log(`puzzle_types: ${rows.length} rows`);

  const stmts = rows.map((r: any) =>
    `IF NOT EXISTS (SELECT 1 FROM puzzle_types WHERE id = ${r.id})
       INSERT INTO puzzle_types (id, type_name) VALUES (${r.id}, ${esc(r.type_name)});`
  ).join("\n");

  await execBatch(`
    SET IDENTITY_INSERT puzzle_types ON;
    ${stmts}
    SET IDENTITY_INSERT puzzle_types OFF;
  `);
}

// ════════════════════════════════════════════════════════════════════════════
// 2. puzzles
// ════════════════════════════════════════════════════════════════════════════
{
  const { rows } = await pg.query("SELECT id, puzzle_date, difficulty FROM puzzles ORDER BY id");
  console.log(`puzzles: ${rows.length} rows`);

  const stmts = rows.map((r: any) => {
    const dateStr = r.puzzle_date instanceof Date
      ? r.puzzle_date.toISOString().slice(0, 10)
      : String(r.puzzle_date).slice(0, 10);
    return `IF NOT EXISTS (SELECT 1 FROM puzzles WHERE id = ${r.id})
       INSERT INTO puzzles (id, puzzle_date, difficulty)
       VALUES (${r.id}, '${dateStr}', ${esc(r.difficulty)});`;
  }).join("\n");

  await execBatch(`
    SET IDENTITY_INSERT puzzles ON;
    ${stmts}
    SET IDENTITY_INSERT puzzles OFF;
  `);
}

// ════════════════════════════════════════════════════════════════════════════
// 3. users
// ════════════════════════════════════════════════════════════════════════════
{
  const { rows } = await pg.query(
    "SELECT id, name, email, password, password_hash, region, language, created_at FROM users ORDER BY id"
  );
  console.log(`users: ${rows.length} rows`);

  const stmts = rows.map((r: any) =>
    `IF NOT EXISTS (SELECT 1 FROM users WHERE id = ${r.id})
       INSERT INTO users (id, name, email, password, password_hash, region, language, created_at)
       VALUES (${r.id}, ${esc(r.name)}, ${esc(r.email)}, ${esc(r.password)}, ${esc(r.password_hash)}, ${esc(r.region)}, ${esc(r.language)}, ${esc(r.created_at)});`
  ).join("\n");

  await execBatch(`
    SET IDENTITY_INSERT users ON;
    ${stmts}
    SET IDENTITY_INSERT users OFF;
  `);
}

// ════════════════════════════════════════════════════════════════════════════
// 4. puzzle_content
// ════════════════════════════════════════════════════════════════════════════
{
  const { rows } = await pg.query(
    `SELECT id, puzzle_id, puzzle_type_id, language,
            COALESCE(slot, 1) AS slot, external_id, content
     FROM puzzle_content ORDER BY id`
  );
  console.log(`puzzle_content: ${rows.length} rows`);

  const stmts = rows.map((r: any) => {
    const contentStr = typeof r.content === "string" ? r.content : JSON.stringify(r.content);
    return `IF NOT EXISTS (SELECT 1 FROM puzzle_content WHERE id = ${r.id})
       INSERT INTO puzzle_content (id, puzzle_id, puzzle_type_id, language, slot, external_id, content)
       VALUES (${r.id}, ${r.puzzle_id}, ${r.puzzle_type_id}, ${esc(r.language || "en")}, ${r.slot || 1}, ${esc(r.external_id)}, ${esc(contentStr)});`;
  }).join("\n");

  await execBatch(`
    SET IDENTITY_INSERT puzzle_content ON;
    ${stmts}
    SET IDENTITY_INSERT puzzle_content OFF;
  `);
}

// ════════════════════════════════════════════════════════════════════════════
// 5. puzzle_attempts
// ════════════════════════════════════════════════════════════════════════════
{
  const { rows } = await pg.query(
    `SELECT id, user_id, puzzle_content_id, correct_words, score,
            time_taken, COALESCE(completed, true) AS completed, created_at
     FROM puzzle_attempts ORDER BY id`
  );
  console.log(`puzzle_attempts: ${rows.length} rows`);

  const stmts = rows.map((r: any) =>
    `IF NOT EXISTS (SELECT 1 FROM puzzle_attempts WHERE id = ${r.id})
       INSERT INTO puzzle_attempts (id, user_id, puzzle_content_id, correct_words, score, time_taken, completed, created_at)
       VALUES (${r.id}, ${r.user_id}, ${r.puzzle_content_id}, ${r.correct_words}, ${r.score}, ${r.time_taken}, ${r.completed ? 1 : 0}, ${esc(r.created_at)});`
  ).join("\n");

  await execBatch(`
    SET IDENTITY_INSERT puzzle_attempts ON;
    ${stmts}
    SET IDENTITY_INSERT puzzle_attempts OFF;
  `);
}

// ════════════════════════════════════════════════════════════════════════════
// 6. import_requests
// ════════════════════════════════════════════════════════════════════════════
{
  const { rows } = await pg.query(
    "SELECT id, date, crossword_json, wordsearch_json, unjumble_json FROM import_requests ORDER BY id"
  );
  console.log(`import_requests: ${rows.length} rows`);

  if (rows.length > 0) {
    const stmts = rows.map((r: any) =>
      `IF NOT EXISTS (SELECT 1 FROM import_requests WHERE id = ${r.id})
         INSERT INTO import_requests (id, date, crossword_json, wordsearch_json, unjumble_json)
         VALUES (${r.id}, ${esc(r.date)}, ${esc(r.crossword_json)}, ${esc(r.wordsearch_json)}, ${esc(r.unjumble_json)});`
    ).join("\n");

    await execBatch(`
      SET IDENTITY_INSERT import_requests ON;
      ${stmts}
      SET IDENTITY_INSERT import_requests OFF;
    `);
  }
}

// ── Done ─────────────────────────────────────────────────────────────────────
console.log("\n✅ Migration complete.");
await pg.end();
await mssqlPool.close();
