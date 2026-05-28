import { isAdmin } from "../lib/db.js";
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
      text: "Chào mừng bạn đến với Patrick Tech Shop. Chọn tác vụ bên dưới:",
      reply_markup: mainMenu()
    });
    return;
  }

  if (text === "/admin") {
    if (!isAdmin(message.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: "Bạn không có quyền admin." });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Bảng điều khiển admin:",
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
        await telegram("sendMessage", { chat_id: chatId, text: "Dùng: /addproduct Tên gói | 100000 | Mô tả" });
        return;
      }

      const product = await addProduct(name, price, description);
      await telegram("sendMessage", { chat_id: chatId, text: `Đã tạo sản phẩm #${product.id}: ${product.name}` });
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
          text: "Dùng:\n/import 1\nuser1|pass1\nuser2|pass2"
        });
        return;
      }

      const count = await importAccounts(productId, lines);
      await telegram("sendMessage", { chat_id: chatId, text: `Đã nạp ${count} tài khoản vào sản phẩm #${productId}.` });
    });
    return;
  }

  if (text.startsWith("/importsheet ")) {
    await adminOnly(message, async () => {
      const raw = text.replace("/importsheet ", "").trim();
      const firstSpace = raw.indexOf(" ");
      if (firstSpace < 0) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: "Dùng: /importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0"
        });
        return;
      }

      const productId = Number(raw.slice(0, firstSpace).trim());
      const sheetUrl = raw.slice(firstSpace + 1).trim();

      if (!Number.isInteger(productId) || !sheetUrl.startsWith("https://")) {
        await telegram("sendMessage", {
          chat_id: chatId,
          text: [
            "Dùng:",
            "/importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0",
            "",
            "Sheet nên có cột đầu tiên là tài khoản, hoặc cột tên data/account/tài khoản."
          ].join("\n")
        });
        return;
      }

      const count = await importAccountsFromSheet(productId, sheetUrl);
      await telegram("sendMessage", {
        chat_id: chatId,
        text: `Đã nhập ${count} tài khoản từ Google Sheet vào sản phẩm #${productId}.`
      });
    });
    return;
  }

  if (text.startsWith("/confirm ")) {
    await adminOnly(message, async () => {
      const code = text.replace("/confirm ", "").trim().toUpperCase();
      const { order, account } = await confirmAndDeliver(code);
      await telegram("sendMessage", {
        chat_id: order.telegram_id,
        text: `Đơn ${order.code} đã thanh toán.\n\nTài khoản của bạn:\n${account.data}`
      });
      await telegram("sendMessage", { chat_id: chatId, text: `Đã cấp tài khoản cho đơn ${order.code}.` });
    });
    return;
  }

  if (text.startsWith("/ticket ")) {
    const ticket = await createTicket(user.id, text.replace("/ticket ", "").trim());
    await telegram("sendMessage", { chat_id: chatId, text: `Đã tạo ticket #${ticket.id}. Admin sẽ phản hồi sớm.` });
    return;
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: "Mình chưa hiểu lệnh này. Bấm /start để mở menu."
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
      await telegram("sendMessage", { chat_id: chatId, text: "Hiện chưa có sản phẩm nào." });
      return;
    }

    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Chọn gói bạn muốn mua:",
      reply_markup: {
        inline_keyboard: products.map((product) => [
          {
            text: `${product.name} - ${formatMoney(product.price)} - còn ${product.stock}`,
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
        `Đơn hàng: ${order.code}`,
        `Sản phẩm: ${product.name}`,
        `Số tiền: ${formatMoney(order.amount)}`,
        "",
        "Thông tin thanh toán:",
        `Ngân hàng: ${process.env.SHOP_BANK_NAME || "Chưa cấu hình"}`,
        `Số tài khoản: ${process.env.SHOP_BANK_ACCOUNT || "Chưa cấu hình"}`,
        `Chủ tài khoản: ${process.env.SHOP_BANK_OWNER || "Chưa cấu hình"}`,
        `Nội dung: ${order.code}`,
        "",
        "Sau khi thanh toán, admin dùng lệnh:",
        `/confirm ${order.code}`
      ].join("\n")
    });
    return;
  }

  if (data === "my_orders") {
    const orders = await listUserOrders(user.id);
    const text = orders.length
      ? orders.map((order) => `${order.code} | ${order.product_name} | ${formatMoney(order.amount)} | ${order.status}`).join("\n")
      : "Bạn chưa có đơn hàng nào.";
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "support") {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: "Gửi ticket bằng lệnh:\n/ticket Nội dung cần hỗ trợ"
    });
    return;
  }

  if (data.startsWith("admin_")) {
    if (!isAdmin(query.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: "Bạn không có quyền admin." });
      return;
    }
    await handleAdminCallback(chatId, data);
  }
}

async function handleAdminCallback(chatId, data) {
  if (data === "admin_products") {
    const products = await listProducts();
    const text = products.length
      ? products.map((p) => `#${p.id} ${p.name} | ${formatMoney(p.price)} | còn ${p.stock}`).join("\n")
      : "Chưa có sản phẩm.\nDùng: /addproduct Tên gói | 100000 | Mô tả";
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_pending_orders") {
    const orders = await listPendingOrders();
    const text = orders.length
      ? orders.map((o) => `${o.code} | @${o.username || o.telegram_id} | ${o.product_name} | ${formatMoney(o.amount)}\n/confirm ${o.code}`).join("\n\n")
      : "Không có đơn chờ thanh toán.";
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_stock") {
    const rows = await stockSummary();
    const text = rows.length
      ? rows.map((row) => `#${row.id} ${row.name} | còn ${row.available} | đã bán ${row.sold}`).join("\n")
      : "Chưa có dữ liệu kho.";
    await telegram("sendMessage", { chat_id: chatId, text });
  }
}

async function adminOnly(message, action) {
  if (!isAdmin(message.from.id)) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: "Bạn không có quyền admin." });
    return;
  }

  try {
    await action();
  } catch (error) {
    await telegram("sendMessage", { chat_id: message.chat.id, text: `Lỗi: ${error.message}` });
  }
}

function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " VND";
}
