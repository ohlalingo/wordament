import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config: sql.config = {
  user:     process.env.DB_USER     || "wordament",
  password: process.env.DB_PASS     || "wordament",
  server:   process.env.DB_HOST     || "localhost",
  database: process.env.DB_NAME     || "wordament",
  port:     Number(process.env.DB_PORT) || 1433,
  options: {
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

console.log("DB CONFIG USED:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 1433,
});

let _pool: sql.ConnectionPool | null = null;

async function getPool(): Promise<sql.ConnectionPool> {
  if (!_pool) {
    _pool = await new sql.ConnectionPool(config).connect();
    _pool.on("error", (err) => {
      console.error("MSSQL pool error:", err);
      _pool = null;
    });
  }
  return _pool;
}

/**
 * Execute a parameterised SQL query.
 *
 * Positional Postgres-style placeholders ($1, $2 …) are automatically
 * converted to MSSQL named parameters (@p1, @p2 …) before execution.
 *
 * Returns { rows, rowCount } to match the old `pg` Pool API so that
 * existing route code requires only SQL-level changes (not API changes).
 */
export async function query<T = any>(
  sqlText: string,
  params: any[] = []
): Promise<{ rows: T[]; rowCount: number }> {
  const pool = await getPool();
  const request = pool.request();

  // Convert $1 … $N  →  @p1 … @pN and bind each value
  const converted = sqlText.replace(/\$(\d+)/g, (_m, n) => `@p${n}`);
  params.forEach((val, i) => {
    // JSON-serialize objects so NVARCHAR(MAX) columns receive a string
    const bound = val !== null && typeof val === "object" ? JSON.stringify(val) : val;
    request.input(`p${i + 1}`, bound);
  });

  const result = await request.query<T>(converted);

  // rowsAffected is an array; sum them for DML, fall back to recordset length for SELECT
  const affected = result.rowsAffected.reduce((a, b) => a + b, 0);
  return {
    rows: result.recordset ?? [],
    rowCount: affected,
  };
}

// Backward-compatible db object — drop-in replacement for the old `pg` Pool
export const db = { query };
