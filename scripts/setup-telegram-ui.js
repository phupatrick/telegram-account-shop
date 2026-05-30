import { loadDotEnv } from "./load-env.js";

await loadDotEnv();

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN");
}

const commands = [
  { command: "start", description: "Mở shop / Open shop" },
  { command: "language", description: "Đổi ngôn ngữ / Change language" },
  { command: "ticket", description: "Tạo ticket hỗ trợ / Create support ticket" },
  { command: "admin", description: "Bảng admin / Admin panel" },
  { command: "addproduct", description: "Admin: thêm sản phẩm" },
  { command: "import", description: "Admin: nạp kho thủ công" },
  { command: "importsheet", description: "Admin: nhập kho từ Google Sheet" },
  { command: "nhapkho", description: "Admin: trợ lý phân loại và nhập kho" },
  { command: "intake", description: "Admin: smart inventory intake" },
  { command: "confirm", description: "Admin: xác nhận đơn đã thanh toán" }
];

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
  commands,
  scope: { type: "all_private_chats" },
  language_code: "vi"
});

await telegram("setMyCommands", {
  commands,
  scope: { type: "all_private_chats" }
});

await telegram("setChatMenuButton", {
  menu_button: { type: "commands" }
});

console.log("Telegram command menu configured.");
