import "reflect-metadata";
import { DataSource } from "typeorm";

export const dataSource = new DataSource({
  type: "postgres",
  host: "postgres",
  port: 5432,
  username: "wordament",
  password: "wordament",
  database: "wordament",
  entities: [__dirname + "/**/*.entity.{ts,js}"],
  synchronize: false,
});
