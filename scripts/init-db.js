import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { loadDotEnv } from "./load-env.js";

await loadDotEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1
});

const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
await sql.unsafe(schema);
await sql.end();

console.log("Database schema initialized.");
