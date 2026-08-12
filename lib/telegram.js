import { t } from "./i18n.js";
import { shopConfig } from "./shop-config.js";

export async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram ${method} failed: ${JSON.stringify(data)}`);
  return data.result;
}

export function warehouseUrl() {
  if (process.env.WAREHOUSE_URL) return process.env.WAREHOUSE_URL;
  if (process.env.APP_URL) return `${process.env.APP_URL.replace(/\/$/, "")}/warehouse.html`;
  return "https://telegram-account-shop.vercel.app/warehouse.html";
}

export function languageMenu() {
  if (shopConfig().mode === "reseller") {
    return { inline_keyboard: [[{ text: "🇺🇸 English", callback_data: "set_lang:en" }]] };
  }
  return {
    inline_keyboard: [
      [{ text: "🇻🇳 Tiếng Việt", callback_data: "set_lang:vi" }],
      [{ text: "🇺🇸 English", callback_data: "set_lang:en" }]
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
      [{ text: "Mở kho web", url: warehouseUrl() }],
      [{ text: t(user, "adminProducts"), callback_data: "admin_products" }],
      [{ text: "Trợ lý nhập kho", callback_data: "admin_intake" }],
      [{ text: "Đồng bộ Catalog", callback_data: "admin_sync_catalog" }],
      [{ text: t(user, "adminPendingOrders"), callback_data: "admin_pending_orders" }],
      [{ text: t(user, "adminStock"), callback_data: "admin_stock" }]
    ]
  };
}
