import { loadDotEnv } from "./load-env.js";

await loadDotEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const customerCommands = [
  { command: "start", description: "Mo shop / Open shop" },
  { command: "language", description: "Doi ngon ngu / Change language" },
  { command: "ticket", description: "Tao ticket ho tro / Create support ticket" }
];

const adminCommands = [
  ...customerCommands,
  { command: "admin", description: "Bang admin / Admin panel" },
  { command: "addproduct", description: "Admin: them san pham" },
  { command: "import", description: "Admin: nap kho thu cong" },
  { command: "importsheet", description: "Admin: nhap kho tu Google Sheet" },
  { command: "nhapkho", description: "Admin: tro ly phan loai va nhap kho" },
  { command: "intake", description: "Admin: smart inventory intake" },
  { command: "confirm", description: "Admin: xac nhan don da thanh toan" }
];

const adminTelegramIds = (process.env.ADMIN_TELEGRAM_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

async function telegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

await telegram("setMyCommands", {
  commands: customerCommands,
  scope: { type: "all_private_chats" },
  language_code: "vi"
});

await telegram("setMyCommands", {
  commands: customerCommands,
  scope: { type: "all_private_chats" }
});

for (const chatId of adminTelegramIds) {
  await telegram("setMyCommands", {
    commands: adminCommands,
    scope: { type: "chat", chat_id: chatId },
    language_code: "vi"
  });

  await telegram("setMyCommands", {
    commands: adminCommands,
    scope: { type: "chat", chat_id: chatId }
  });
}

await telegram("setChatMenuButton", {
  menu_button: { type: "commands" }
});

console.log(`Telegram command menu configured. Admin chats: ${adminTelegramIds.length}.`);
