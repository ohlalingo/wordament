import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

console.log("DB CONFIG USED:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
});

export const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: Number(process.env.DB_PORT),
});
