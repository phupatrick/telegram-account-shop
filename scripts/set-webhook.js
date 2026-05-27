import { loadDotEnv } from "./load-env.js";

await loadDotEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
const appUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.APP_URL;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

if (!appUrl) {
  throw new Error("Missing APP_URL or VERCEL_PROJECT_PRODUCTION_URL");
}

if (!secret) {
  throw new Error("Missing TELEGRAM_WEBHOOK_SECRET");
}

const normalizedUrl = appUrl.startsWith("http") ? appUrl : `https://${appUrl}`;
const webhookUrl = `${normalizedUrl.replace(/\/$/, "")}/api/telegram`;

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: webhookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"]
  })
});

const data = await response.json();
if (!data.ok) {
  throw new Error(JSON.stringify(data));
}

console.log(`Webhook set to ${webhookUrl}`);
