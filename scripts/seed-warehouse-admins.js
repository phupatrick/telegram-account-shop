import postgres from "postgres";
import { loadDotEnv } from "./load-env.js";

await loadDotEnv();

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const admins = [
  "hphumail@gmail.com",
  "phupunpin@gmail.com",
  "hoangphupatrick@gmail.com"
];

const sql = postgres(process.env.DATABASE_URL, {
  ssl: "require",
  max: 1
});

for (const email of admins) {
  await sql`
    insert into warehouse_admins (email, role)
    values (${email}, 'admin')
    on conflict (email)
    do update set role = 'admin', is_active = true
  `;
}

await sql.end();
console.log(`Seeded ${admins.length} warehouse admins.`);
