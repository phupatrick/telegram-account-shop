import { isAdmin } from "../lib/db.js";
import { t } from "../lib/i18n.js";
import {
  addProduct,
  confirmAndDeliver,
  createOrder,
  createTicket,
  ensureUser,
  importAccounts,
  importAccountsFromSheet,
  listPendingOrders,
  listProducts,
  listUserOrders,
  setUserLanguage,
  stockSummary
} from "../lib/services.js";
import { adminMenu, languageMenu, mainMenu, telegram } from "../lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers["x-telegram-bot-api-secret-token"] !== secret) {
    return res.status(401).json({ ok: false });
  }

  try {
    await handleUpdate(req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ ok: true });
  }
}

async function handleUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const user = await ensureUser(message.from);

  if (text === "/start" || text === "/language" || text === "/lang") {
    if (!user.language || text === "/language" || text === "/lang") {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: t(user, "chooseLanguage"),
        reply_markup: languageMenu()
      });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "welcome"),
      reply_markup: mainMenu(user)
    });
    return;
  }

  if (!user.language) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "chooseLanguage"),
      reply_markup: languageMenu()
    });
    return;
  }

  if (text === "/admin") {
    if (!isAdmin(message.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noAdmin") });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "adminPanel"),
      reply_markup: adminMenu(user)
    });
    return;
  }

  if (text.startsWith("/addproduct ")) {
    await adminOnly(message, user, async () => {
      const raw = text.replace("/addproduct ", "");
      const [name, priceText, description = ""] = raw.split("|").map((part) => part.trim());
      const price = Number(priceText);
      if (!name || !Number.isFinite(price)) {
        await telegram("sendMessage", { chat_id: chatId, text: t(user, "addProductUsage") });
        return;
      }

      const product = await addProduct(name, price, description);
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "productCreated", product) });
    });
    return;
  }

  if (text.startsWith("/import ")) {
    await adminOnly(message, user, async () => {
      const lines = text.split("\n");
      const firstLine = lines.shift();
      const productId = Number(firstLine.replace("/import ", "").trim());
      if (!Number.isInteger(productId) || lines.length === 0) {
        await telegram("sendMessage", { chat_id: chatId, text: t(user, "importUsage") });
        return;
      }

      const count = await importAccounts(productId, lines);
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "imported", count, productId) });
    });
    return;
  }

  if (text.startsWith("/importsheet ")) {
    await adminOnly(message, user, async () => {
      const raw = text.replace("/importsheet ", "").trim();
      const firstSpace = raw.indexOf(" ");
      if (firstSpace < 0) {
        await telegram("sendMessage", { chat_id: chatId, text: t(user, "importSheetShortUsage") });
        return;
      }

      const productId = Number(raw.slice(0, firstSpace).trim());
      const sheetUrl = raw.slice(firstSpace + 1).trim();

      if (!Number.isInteger(productId) || !sheetUrl.startsWith("https://")) {
        await telegram("sendMessage", { chat_id: chatId, text: t(user, "importSheetUsage") });
        return;
      }

      const count = await importAccountsFromSheet(productId, sheetUrl);
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "importedSheet", count, productId) });
    });
    return;
  }

  if (text.startsWith("/confirm ")) {
    await adminOnly(message, user, async () => {
      const code = text.replace("/confirm ", "").trim().toUpperCase();
      const { order, account } = await confirmAndDeliver(code);
      await telegram("sendMessage", {
        chat_id: order.telegram_id,
        text: t(user, "orderPaid", order, account)
      });
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "delivered", order.code) });
    });
    return;
  }

  if (text.startsWith("/ticket ")) {
    const ticket = await createTicket(user.id, text.replace("/ticket ", "").trim());
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "ticketCreated", ticket.id) });
    return;
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: t(user, "unknownCommand")
  });
}

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  let user = await ensureUser(query.from);
  const data = query.data;

  await telegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data.startsWith("set_lang:")) {
    const language = data.split(":")[1] === "en" ? "en" : "vi";
    user = await setUserLanguage(user.id, language);
    await telegram("sendMessage", {
      chat_id: chatId,
      text: `${t(user, "languageSaved")}\n\n${t(user, "welcome")}`,
      reply_markup: mainMenu(user)
    });
    return;
  }

  if (!user.language) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "chooseLanguage"),
      reply_markup: languageMenu()
    });
    return;
  }

  if (data === "products") {
    const products = await listProducts();
    if (products.length === 0) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noProducts") });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "chooseProduct"),
      reply_markup: {
        inline_keyboard: products.map((product) => [
          {
            text: `${product.name} - ${formatMoney(product.price)} - ${t(user, "inStock")} ${product.stock}`,
            callback_data: `buy:${product.id}`
          }
        ])
      }
    });
    return;
  }

  if (data.startsWith("buy:")) {
    const productId = Number(data.split(":")[1]);
    const { order, product } = await createOrder(user.id, productId);
    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "orderCreated", order, product)
    });
    return;
  }

  if (data === "my_orders") {
    const orders = await listUserOrders(user.id);
    const text = orders.length
      ? orders.map((order) => `${order.code} | ${order.product_name} | ${formatMoney(order.amount)} | ${order.status}`).join("\n")
      : t(user, "noOrders");
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "support") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "supportUsage")
    });
    return;
  }

  if (data.startsWith("admin_")) {
    if (!isAdmin(query.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noAdmin") });
      return;
    }
    await handleAdminCallback(chatId, data, user);
  }
}

async function handleAdminCallback(chatId, data, user) {
  if (data === "admin_products") {
    const products = await listProducts();
    const text = products.length
      ? products.map((p) => `#${p.id} ${p.name} | ${formatMoney(p.price)} | ${t(user, "inStock")} ${p.stock}`).join("\n")
      : t(user, "noProductsAdmin");
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_pending_orders") {
    const orders = await listPendingOrders();
    const text = orders.length
      ? orders.map((o) => `${o.code} | @${o.username || o.telegram_id} | ${o.product_name} | ${formatMoney(o.amount)}\n/confirm ${o.code}`).join("\n\n")
      : t(user, "noPendingOrders");
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_stock") {
    const rows = await stockSummary();
    const text = rows.length ? rows.map((row) => t(user, "stockLine", row)).join("\n") : t(user, "noStock");
    await telegram("sendMessage", { chat_id: chatId, text });
  }
}

async function adminOnly(message, user, action) {
  if (!isAdmin(message.from.id)) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: t(user, "noAdmin") });
    return;
  }

  try {
    await action();
  } catch (error) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: t(user, "error", error.message) });
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " VND";
}
