import { t } from "./i18n.js";

export async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!data.ok) {
    throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

export function languageMenu() {
  return {
    inline_keyboard: [
      [{ text: "Tiếng Việt", callback_data: "set_lang:vi" }],
      [{ text: "English", callback_data: "set_lang:en" }]
    ]
  };
}

export function mainMenu(user) {
  return {
    inline_keyboard: [
      [{ text: t(user, "buyAccounts"), callback_data: "products" }],
      [{ text: t(user, "myOrders"), callback_data: "my_orders" }],
      [{ text: t(user, "support"), callback_data: "support" }]
    ]
  };
}

export function adminMenu(user) {
  return {
    inline_keyboard: [
      [{ text: t(user, "adminProducts"), callback_data: "admin_products" }],
      [{ text: t(user, "adminPendingOrders"), callback_data: "admin_pending_orders" }],
      [{ text: t(user, "adminStock"), callback_data: "admin_stock" }]
    ]
  };
}
