import postgres from "postgres";

let client;

export function db() {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("Missing DATABASE_URL");
    }

    client = postgres(process.env.DATABASE_URL, {
      ssl: "require",
      max: 1,
      idle_timeout: 20
    });
  }

  return client;
}

export function adminIds() {
  return new Set(
    (process.env.ADMIN_TELEGRAM_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function isAdmin(telegramId) {
  return adminIds().has(String(telegramId));
}
