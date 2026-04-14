import "reflect-metadata";
import { DataSource } from "typeorm";

export const dataSource = new DataSource({
  type: "mssql",
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 1433,
  username: process.env.DB_USER || "wordament",
  password: process.env.DB_PASS  || "wordament",
  database: process.env.DB_NAME  || "wordament",
  entities: [__dirname + "/**/*.entity.{ts,js}"],
  synchronize: false,
  options: {
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_CERT !== "false",
  },
});
