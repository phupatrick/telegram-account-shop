import { isAdmin } from "../lib/db.js";
import { formatBankPayment, formatBinancePayment, formatCatalog, formatLocalizedMoney, t, vietQrUrl, withUsdQuote } from "../lib/i18n.js";
import {
  addProduct,
  approveSmartImportDraft,
  cancelSmartImportDraft,
  confirmAndDeliver,
  createOrder,
  createSmartImportDraft,
  createTicket,
  ensureUser,
  getUserPendingOrder,
  formatSmartImportDraft,
  hasActiveSmartImportSession,
  importAccounts,
  importAccountsFromSheet,
  listPendingOrders,
  listProducts,
  listUserOrders,
  reportPayment,
  setUserLanguage,
  startSmartImportSession,
  stockSummary,
  syncCatalog,
  stopSmartImportSession
} from "../lib/services.js";
import { adminMenu, languageMenu, mainMenu, telegram, warehouseUrl } from "../lib/telegram.js";
import { shopConfig } from "../lib/shop-config.js";

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
  // Channel posts are handled by the dedicated price publisher. The shop bot
  // never starts a conversation or creates topic replies inside a channel.
  if (update.channel_post || update.edited_channel_post) {
    return;
  }

  if (update.message) {
    await handleMessage(update.message);
  }

  if (update.callback_query) {
    await handleCallback(update.callback_query);
  }
}

async function handleMessage(message) {
  const chatType = String(message?.chat?.type || "");
  if (chatType !== "private") {
    return;
  }

  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  const command = normalizeTelegramCommand(text);
  const user = await ensureUser(message.from);

  if (["/start", "/heybot", "/language", "/lang"].includes(command)) {
    if (command === "/heybot") {
      await sendHome(chatId, user);
      return;
    }

    if (!user.language || command === "/language" || command === "/lang") {
      await telegram("sendMessage", {
        chat_id: chatId,
        text: t(user, "chooseLanguage"),
        reply_markup: languageMenu()
      });
      return;
    }

    await sendHome(chatId, user);
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

  if (text === "/nhapkho" || text === "/intake") {
    await adminOnly(message, user, async () => {
      await startSmartImportSession(message.from.id);
      await telegram("sendMessage", {
        chat_id: chatId,
        text: [
          "Trợ lý nhập kho đã bật.",
          "",
          "Bạn cứ dán nội dung hàng theo kiểu tự nhiên, không cần đúng mẫu.",
          "",
          "Bot sẽ phân loại, tạo nháp và hỏi bạn duyệt trước khi nhập kho."
        ].join("\n"),
        reply_markup: {
          inline_keyboard: [[{ text: "Mở kho web", url: warehouseUrl() }]]
        }
      });
    });
    return;
  }

  if (text.startsWith("/nhapkho ") || text.startsWith("/nhapkho\n") || text.startsWith("/intake ") || text.startsWith("/intake\n")) {
    await adminOnly(message, user, async () => {
      const raw = text.replace(/^\/(nhapkho|intake)(@\w+)?\s*/i, "").trim();
      if (!raw) {
        await startSmartImportSession(message.from.id);
        await telegram("sendMessage", {
          chat_id: chatId,
          text: "Bạn dán nội dung hàng vào tin nhắn tiếp theo, bot sẽ tự phân loại."
        });
        return;
      }

      const draft = await createSmartImportDraft(message.from.id, raw);
      await stopSmartImportSession(message.from.id);
      await sendImportDraft(chatId, draft);
    });
    return;
  }

  if (text.startsWith("/confirm ")) {
    await adminOnly(message, user, async () => {
      const code = text.replace("/confirm ", "").trim().toUpperCase();
      const { order, account } = await confirmAndDeliver(code);
      await telegram("sendMessage", {
        chat_id: order.telegram_id,
        text: t(order.language || "vi", "orderPaid", order, account)
      });
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "delivered", order.code) });
    });
    return;
  }

  if (["Đặt mua sản phẩm", "Buy products", "🛍 Đặt mua sản phẩm", "🛍 Buy products"].includes(text)) {
    await sendCategories(chatId, user);
    return;
  }
  if (["Đơn hàng của tôi", "My orders", "📦 Đơn hàng của tôi", "📦 My orders"].includes(text)) {
    await sendMyOrders(chatId, user);
    return;
  }
  if (["Bảo hành / Hỗ trợ", "Warranty / Support", "💬 Hỗ trợ", "💬 Support"].includes(text)) {
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "supportUsage"), reply_markup: mainMenu(user) });
    return;
  }
  if (["🌐 Ngôn ngữ", "🌐 Language"].includes(text)) {
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "chooseLanguage"), reply_markup: languageMenu() });
    return;
  }

  if (text === "/synccatalog" || text === "/sync") {
    await adminOnly(message, user, async () => {
      const result = await syncCatalog();
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "syncDone", result.synced, result.total) });
    });
    return;
  }

  if (text.startsWith("/ticket ")) {
    const ticket = await createTicket(user.id, text.replace("/ticket ", "").trim());
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "ticketCreated", ticket.id) });
    return;
  }

  if (isAdmin(message.from.id) && text && !text.startsWith("/")) {
    const active = await hasActiveSmartImportSession(message.from.id);
    if (active) {
      await adminOnly(message, user, async () => {
        const draft = await createSmartImportDraft(message.from.id, text);
        await stopSmartImportSession(message.from.id);
        await sendImportDraft(chatId, draft);
      });
      return;
    }
  }

  await telegram("sendMessage", {
    chat_id: chatId,
    text: t(user, "unknownCommand"),
    reply_markup: mainMenu(user)
  });
}

async function handleCallback(query) {
  const callbackChatType = String(query?.message?.chat?.type || "");
  if (callbackChatType !== "private") {
    return;
  }

  const chatId = query.message.chat.id;
  let user = await ensureUser(query.from);
  const data = query.data;

  await telegram("answerCallbackQuery", { callback_query_id: query.id });

  if (data.startsWith("set_lang:")) {
    const language = data.split(":")[1] === "en" ? "en" : "vi";
    user = await setUserLanguage(user.id, language);
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "languageSaved") });
    await sendHome(chatId, user);
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

  if (data.startsWith("intake_approve:") || data.startsWith("intake_cancel:")) {
    if (!isAdmin(query.from.id)) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noAdmin") });
      return;
    }

    const draftId = Number(data.split(":")[1]);
    try {
      if (data.startsWith("intake_approve:")) {
        const result = await approveSmartImportDraft(draftId, query.from.id);
        await telegram("sendMessage", {
          chat_id: chatId,
          text: `Đã duyệt và nhập ${result.count} tài khoản từ nháp #${draftId}. Ví dụ này đã được lưu làm dữ liệu training.`
        });
      } else {
        await cancelSmartImportDraft(draftId, query.from.id);
        await telegram("sendMessage", {
          chat_id: chatId,
          text: `Đã huỷ nháp nhập kho #${draftId}.`
        });
      }
    } catch (error) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "error", error.message) });
    }
    return;
  }

  if (data === "products") {
    await sendCategories(chatId, user);
    return;
  }

  if (data.startsWith("category:")) {
    const categoryKey = data.slice("category:".length);
    const products = await listProducts();
    const matching = products.filter((product) => categoryKeyFor(product) === categoryKey);
    if (!matching.length) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noProducts"), reply_markup: mainMenu(user) });
      return;
    }
    const keyboard = matching.slice(0, 60).map((product) => {
      const name = user.language === "en" ? product.name_en || product.name : product.name;
      const stock = Number(product.stock || 0) > 0 ? `${t(user, "inStock")} ${product.stock}` : t(user, "catalogItem");
      return [{ text: `${name} | ${formatLocalizedMoney(product.sale_price ?? product.price, user.language)} | ${stock}`, callback_data: `buy:${product.id}` }];
    });
    keyboard.push([{ text: user.language === "en" ? "⬅ Categories" : "⬅ Danh mục", callback_data: "products" }]);
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "chooseProduct"), reply_markup: { inline_keyboard: keyboard } });
    return;
  }

  if (data.startsWith("buy:")) {
    const productId = Number(data.split(":")[1]);
    try {
      const { order, product } = await createOrder(user.id, productId);
      const quotedOrder = await withUsdQuote(order);
      const method = product.image_url ? "sendPhoto" : "sendMessage";
      const paymentButton = user.language === "en"
        ? { text: "Binance Pay / USDT", callback_data: `pay_binance:${order.code}` }
        : { text: "ACB / VietQR", callback_data: `pay_bank:${order.code}` };
      const contactButton = {
        text: user.language === "en" ? "Send order to shop" : "Gửi đơn cho shop",
        url: orderContactUrl(order, product, user.language)
      };
      await telegram(method, {
        chat_id: chatId,
        ...(product.image_url
          ? { photo: product.image_url, caption: t(user, "orderCreated", quotedOrder, product) }
          : { text: t(user, "orderCreated", quotedOrder, product) }),
        reply_markup: {
          inline_keyboard: [[paymentButton], [contactButton]]
        }
      });
    } catch (error) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "outOfStock") });
    }
    return;
  }

  if (data.startsWith("pay_bank:") || data.startsWith("pay_binance:")) {
    const orderCode = data.split(":")[1];
    const order = await getUserPendingOrder(orderCode, user.id);
    if (!order) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noOrders") });
      return;
    }
    const quotedOrder = await withUsdQuote(order);
    if (data.startsWith("pay_bank:")) {
      if (user.language === "en") return;
      await telegram("sendPhoto", {
        chat_id: chatId,
        photo: vietQrUrl(quotedOrder),
        caption: formatBankPayment(user, quotedOrder),
        reply_markup: { inline_keyboard: [[{ text: "Tôi đã thanh toán", callback_data: `paid:bank:${order.code}` }]] }
      });
    } else {
      if (user.language !== "en") return;
      await telegram("sendMessage", {
        chat_id: chatId,
        text: formatBinancePayment(user, quotedOrder),
        reply_markup: { inline_keyboard: [[{ text: "I have paid", callback_data: `paid:binance:${order.code}` }]] }
      });
    }
    return;
  }

  if (data.startsWith("paid:")) {
    const [, method, orderCode] = data.split(":");
    const order = await reportPayment(orderCode, user.id, method);
    if (!order) {
      await telegram("sendMessage", { chat_id: chatId, text: t(user, "noOrders") });
      return;
    }
    await telegram("sendMessage", {
      chat_id: chatId,
      text: t(user, "paymentReported", order),
      reply_markup: { inline_keyboard: [[{ text: t(user, "contactSupport"), url: orderContactUrl(order, null, user.language) }]] }
    });
    return;
  }

  if (data === "my_orders") {
    await sendMyOrders(chatId, user);
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

async function sendHome(chatId, user) {
  await telegram("sendMessage", { chat_id: chatId, text: t(user, "welcome"), reply_markup: mainMenu(user) });
}

async function sendMyOrders(chatId, user) {
  const orders = await listUserOrders(user.id);
  const text = orders.length ? orders.map((order) => formatOrderHistory(user, order)).join("\n\n") : t(user, "noOrders");
  await telegram("sendMessage", { chat_id: chatId, text, reply_markup: mainMenu(user) });
}

async function sendCategories(chatId, user) {
  const products = await listProducts();
  const available = products.filter((product) => Number(product.stock || 0) > 0 || product.source === "zalo" || shopConfig().mode === "reseller");
  if (!available.length) {
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "noProductsInStock"), reply_markup: mainMenu(user) });
    return;
  }
  const categories = new Map();
  for (const product of available) {
    const key = categoryKeyFor(product);
    const name = user.language === "en" ? product.category_en || product.category || (user.language === "en" ? "Products" : "Sản phẩm") : product.category || "Sản phẩm";
    if (!categories.has(key)) categories.set(key, name);
  }
  const keyboard = [...categories].map(([key, name]) => [{ text: name, callback_data: `category:${key}` }]);
  if (categories.size === 1) {
    const [key] = categories.keys();
    const matching = available.filter((product) => categoryKeyFor(product) === key);
    const productKeyboard = matching.slice(0, 60).map((product) => {
      const name = user.language === "en" ? product.name_en || product.name : product.name;
      const stock = Number(product.stock || 0) > 0 ? `${t(user, "inStock")} ${product.stock}` : t(user, "catalogItem");
      return [{ text: `${name} | ${formatLocalizedMoney(product.sale_price ?? product.price, user.language)} | ${stock}`, callback_data: `buy:${product.id}` }];
    });
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "chooseProduct"), reply_markup: { inline_keyboard: productKeyboard } });
    return;
  }
  await telegram("sendMessage", { chat_id: chatId, text: user.language === "en" ? "Choose a category:" : "Vui lòng chọn danh mục sản phẩm:", reply_markup: { inline_keyboard: keyboard } });
}

function categoryKeyFor(product) {
  const category = String(product.category || product.category_en || "products").trim().toLowerCase();
  return encodeURIComponent(category).slice(0, 50);
}

function normalizeTelegramCommand(text) {
  const match = String(text || "").match(/^\/([a-z0-9_]+)(?:@[a-z0-9_]+)?(?:\s|$)/i);
  return match ? `/${match[1].toLowerCase()}` : String(text || "").trim().toLowerCase();
}

function orderContactUrl(order, product, language) {
  const english = language === "en";
  const productName = english
    ? product?.name_en || order.product_name_en || product?.name || order.product_name
    : product?.name || order.product_name;
  const amount = english
    ? `$${Number(order.usdAmountRounded || Number(order.amount || 0) / 26000).toFixed(2)}`
    : `${Number(order.amount || 0).toLocaleString("vi-VN")} VND`;
  const text = english
    ? `Hello, I want to order.\nOrder: ${order.code}\nProduct: ${productName}\nAmount: ${amount}`
    : `Xin chào, tôi muốn đặt hàng.\nMã đơn: ${order.code}\nSản phẩm: ${productName}\nSố tiền: ${amount}`;
  return `https://t.me/Patrick_Tech_Fullapp?text=${encodeURIComponent(text)}`;
}

async function sendCatalog(chatId, user, products, replyMarkup) {
  const batchSize = shopConfig().mode === "reseller" ? 3 : products.length || 1;
  const batches = [];
  for (let index = 0; index < products.length; index += batchSize) {
    batches.push(products.slice(index, index + batchSize));
  }
  if (batches.length === 0) batches.push([]);

  for (const [index, batch] of batches.entries()) {
    await telegram("sendMessage", {
      chat_id: chatId,
      text: formatCatalog(user, batch),
      ...(index === 0 && replyMarkup ? { reply_markup: replyMarkup } : {})
    });
  }
}

async function handleAdminCallback(chatId, data, user) {
  if (data === "admin_sync_catalog") {
    const result = await syncCatalog();
    await telegram("sendMessage", { chat_id: chatId, text: t(user, "syncDone", result.synced, result.total) });
    return;
  }

  if (data === "admin_products") {
    const products = await listProducts();
    const text = products.length
      ? products.map((p) => `#${p.id} ${p.name} | ${formatMoney(p.price)} | ${t(user, "inStock")} ${p.stock}`).join("\n")
      : t(user, "noProductsAdmin");
    await telegram("sendMessage", { chat_id: chatId, text });
    return;
  }

  if (data === "admin_intake") {
    await startSmartImportSession(user.telegram_id);
    await telegram("sendMessage", {
      chat_id: chatId,
      text: [
        "Trợ lý nhập kho đã bật.",
        "",
        "Bạn dán nội dung hàng tự do vào tin nhắn tiếp theo. Không cần theo mẫu cố định.",
        "",
        "Bot sẽ tự phân loại theo sản phẩm/biến thể trong kho, tạo nháp và đưa nút duyệt. Khi bạn duyệt, hệ thống cũng lưu ví dụ đó làm dữ liệu training."
      ].join("\n"),
      reply_markup: {
        inline_keyboard: [[{ text: "Mở kho web", url: warehouseUrl() }]]
      }
    });
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

async function sendImportDraft(chatId, draft) {
  await telegram("sendMessage", {
    chat_id: chatId,
    text: formatSmartImportDraft(draft),
    reply_markup: {
      inline_keyboard: [
        [{ text: "Duyệt nhập kho", callback_data: `intake_approve:${draft.id}` }],
        [{ text: "Huỷ nháp", callback_data: `intake_cancel:${draft.id}` }]
      ]
    }
  });
}

function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " VND";
}

function formatOrderHistory(user, order) {
  const en = user.language === "en";
  const created = new Date(order.created_at).toLocaleString(en ? "en-US" : "vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
  const statusMap = en
    ? { pending: "Pending", payment_reported: "Payment reported", delivered: "Delivered", failed: "Failed" }
    : { pending: "Chờ thanh toán", payment_reported: "Đã báo thanh toán", delivered: "Đã giao", failed: "Thất bại" };
  const name = en ? order.product_name_en || order.product_name : order.product_name;
  const price = formatLocalizedMoney(order.amount, user.language);
  const lines = [
    `${en ? "Order" : "Đơn"}: ${order.code}`,
    `${en ? "Product" : "Sản phẩm"}: ${name}`,
    `${en ? "Amount" : "Số tiền"}: ${price}`,
    `${en ? "Created" : "Ngày tạo"}: ${created}`,
    `${en ? "Status" : "Trạng thái"}: ${statusMap[order.status] || order.status}`
  ];
  if (order.warranty_text) lines.push(`${en ? "Warranty" : "Bảo hành"}: ${order.warranty_text}`);
  if (order.payment_method) lines.push(`${en ? "Payment" : "Thanh toán"}: ${order.payment_method}`);
  return lines.join("\n");
}
