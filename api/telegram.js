import { isAdmin } from "../lib/db.js";
import {
  addProduct,
  confirmAndDeliver,
  createOrder,
  createTicket,
  ensureUser,
  importAccounts,
  listPendingOrders,
  listProducts,
  listUserOrders,
  stockSummary
} from "../lib/services.js";
import { adminMenu, mainMenu, telegram } from "../lib/telegram.js";

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

  if (text === "/start") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Chao mung ban den shop. Chon tac vu ben duoi:",
      reply_markup: mainMenu()
    });
    return;
  }

  if (text === "/admin") {
    if (!isAdmin(message.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: "Ban khong co quyen admin." });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Bang dieu khien admin:",
      reply_markup: adminMenu()
    });
    return;
  }

  if (text.startsWith("/addproduct ")) {
    await adminOnly(message, async () => {
      const raw = text.replace("/addproduct ", "");
      const [name, priceText, description = ""] = raw.split("|").map((part) => part.trim());
      const price = Number(priceText);
      if (!name || !Number.isFinite(price)) {
        await telegram("sendMessage", { chat_id: chatId, text: "Dung: /addproduct Ten goi | 100000 | Mo ta" });
        return;
      }

      const product = await addProduct(name, price, description);
      await telegram("sendMessage", { chat_id: chatId, text: `Da tao san pham #${product.id}: ${product.name}` });
    });
    return;
  }

  if (text.startsWith("/import ")) {
    await adminOnly(message, async () => {
      const lines = text.split("\n");
      const firstLine = lines.shift();
      const productId = Number(firstLine.replace("/import ", "").trim());
      if (!Number.isInteger(productId) || lines.length === 0) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: "Dung:\n/import 1\nuser1|pass1\nuser2|pass2"
        });
        return;
      }

      const count = await importAccounts(productId, lines);
      await telegram("sendMessage", { chat_id: chatId, text: `Da nap ${count} tai khoan vao san pham #${productId}.` });
    });
    return;
  }

  if (text.startsWith("/confirm ")) {
    await adminOnly(message, async () => {
      const code = text.replace("/confirm ", "").trim().toUpperCase();
      const { order, account } = await confirmAndDeliver(code);
      await telegram("sendMessage", {
        chat_id: order.telegram_id,
        text: `Don ${order.code} da thanh toan.\n\nTai khoan cua ban:\n${account.data}`
      });
      await telegram("sendMessage", { chat_id: chatId, text: `Da cap tai khoan cho don ${order.code}.` });
    });
    return;
  }

  if (text.startsWith("/ticket ")) {
    const ticket = await createTicket(user.id, text.replace("/ticket ", "").trim());
    await telegram("sendMessage", { chat_id: chatId, text: `Da tao ticket #${ticket.id}. Admin se phan hoi som.` });
    return;
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: "Minh chua hieu lenh nay. Bam /start de mo menu."
  });
}

async function handleCallback(query) {
  const chatId = query.message.chat.id;
  const user = await ensureUser(query.from);
  const data = query.data;

  await telegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data === "products") {
    const products = await listProducts();
    if (products.length === 0) {
      await telegram("sendMessage", { chat_id: chatId, text: "Hien chua co san pham nao." });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Chon goi ban muon mua:",
      reply_markup: {
        inline_keyboard: products.map((product) => [
          {
            text: `${product.name} - ${formatMoney(product.price)} - ton ${product.stock}`,
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
      text: [
        `Don hang: ${order.code}`,
        `San pham: ${product.name}`,
        `So tien: ${formatMoney(order.amount)}`,
        "",
        "Thong tin thanh toan:",
        `Ngan hang: ${process.env.SHOP_BANK_NAME || "Chua cau hinh"}`,
        `So tai khoan: ${process.env.SHOP_BANK_ACCOUNT || "Chua cau hinh"}`,
        `Chu tai khoan: ${process.env.SHOP_BANK_OWNER || "Chua cau hinh"}`,
        `Noi dung: ${order.code}`,
        "",
        "Sau khi thanh toan, admin dung lenh:",
        `/confirm ${order.code}`
      ].join("\n")
    });
    return;
  }

  if (data === "my_orders") {
    const orders = await listUserOrders(user.id);
    const text = orders.length
      ? orders.map((order) => `${order.code} | ${order.product_name} | ${formatMoney(order.amount)} | ${order.status}`).join("\n")
      : "Ban chua co don hang nao.";
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "support") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Gui ticket bang lenh:\n/ticket Noi dung can ho tro"
    });
    return;
  }

  if (data.startsWith("admin_")) {
    if (!isAdmin(query.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: "Ban khong co quyen admin." });
      return;
    }
    await handleAdminCallback(chatId, data);
  }
}

async function handleAdminCallback(chatId, data) {
  if (data === "admin_products") {
    const products = await listProducts();
    const text = products.length
      ? products.map((p) => `#${p.id} ${p.name} | ${formatMoney(p.price)} | ton ${p.stock}`).join("\n")
      : "Chua co san pham.\nDung: /addproduct Ten goi | 100000 | Mo ta";
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_pending_orders") {
    const orders = await listPendingOrders();
    const text = orders.length
      ? orders.map((o) => `${o.code} | @${o.username || o.telegram_id} | ${o.product_name} | ${formatMoney(o.amount)}\n/confirm ${o.code}`).join("\n\n")
      : "Khong co don pending.";
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_stock") {
    const rows = await stockSummary();
    const text = rows.length
      ? rows.map((row) => `#${row.id} ${row.name} | available ${row.available} | sold ${row.sold}`).join("\n")
      : "Chua co du lieu kho.";
    await telegram("sendMessage", { chat_id: chatId, text });
  }
}

async function adminOnly(message, action) {
  if (!isAdmin(message.from.id)) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: "Ban khong co quyen admin." });
    return;
  }

  try {
    await action();
  } catch (error) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: `Loi: ${error.message}` });
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " VND";
}
