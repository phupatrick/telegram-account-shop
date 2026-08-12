import { shopConfig, usdFromVnd, VND_PER_USD } from "./shop-config.js";

const copy = {
  vi: {
    welcome: "Chào mừng bạn đến Patrick Tech Shop. Chọn tác vụ bên dưới:",
    chooseLanguage: "Vui lòng chọn ngôn ngữ:",
    languageSaved: "Đã lưu ngôn ngữ Tiếng Việt.",
    buyAccounts: "Đặt mua sản phẩm",
    myOrders: "Đơn hàng của tôi",
    support: "Bảo hành / Hỗ trợ",
    adminProducts: "Sản phẩm",
    adminPendingOrders: "Đơn chờ thanh toán",
    adminStock: "Tồn kho",
    noAdmin: "Bạn không có quyền admin.",
    adminPanel: "Bảng điều khiển admin:",
    addProductUsage: "Dùng: /addproduct Tên gói | 100000 | Mô tả",
    productCreated: (product) => `Đã tạo sản phẩm #${product.id}: ${product.name}`,
    importUsage: "Dùng:\n/import 1\nuser1|pass1",
    imported: (count, productId) => `Đã nạp ${count} tài khoản vào sản phẩm #${productId}.`,
    importSheetShortUsage: "Dùng: /importsheet 1 https://docs.google.com/.../export?format=csv",
    importSheetUsage: "Dùng: /importsheet 1 <link-csv>",
    importedSheet: (count, productId) => `Đã nhập ${count} tài khoản vào sản phẩm #${productId}.`,
    orderPaid: (order, account) => `Đơn ${order.code} đã được xác minh và giao.\n\nThông tin sản phẩm/tài khoản:\n${account.data}`,
    delivered: (code) => `Đã cấp tài khoản cho đơn ${code}.`,
    paymentReported: (order) => `Đã ghi nhận yêu cầu kiểm tra thanh toán cho đơn ${order.code}. Vui lòng nhắn hỗ trợ để shop xác minh và giao hàng.`,
    contactSupport: "Nhắn hỗ trợ",
    ticketCreated: (id) => `Đã tạo ticket #${id}. Admin sẽ phản hồi sớm.`,
    unknownCommand: "Mình chưa hiểu lệnh này. Bấm /start để mở menu.",
    noProducts: "Hiện chưa có sản phẩm nào.",
    noProductsInStock: "Hiện chưa có sản phẩm còn hàng.",
    outOfStock: "Sản phẩm này đã hết hàng. Vui lòng chọn gói khác.",
    chooseProduct: "Chọn sản phẩm bạn muốn mua:",
    inStock: "còn",
    orderCreated: (order, product) => [`Đơn hàng: ${order.code}`, `Sản phẩm: ${product.name}`, `Số tiền: ${formatMoney(order.amount)}`, "", "Vui lòng chọn phương thức thanh toán bên dưới."].join("\n"),
    noOrders: "Bạn chưa có đơn hàng nào.",
    supportUsage: "Gửi ticket bằng lệnh: /ticket Nội dung cần hỗ trợ",
    noProductsAdmin: "Chưa có sản phẩm. Dùng /addproduct Tên gói | 100000 | Mô tả",
    noPendingOrders: "Không có đơn chờ thanh toán.",
    stockLine: (row) => `#${row.id} ${row.name} | còn ${row.available} | đã bán ${row.sold}`,
    noStock: "Chưa có dữ liệu kho.",
    error: (message) => `Lỗi: ${message}`,
    catalogEmpty: "Chưa có sản phẩm trong Catalog hoặc kho đang trống.",
    catalogFooter: "Chọn sản phẩm để tạo đơn. Thanh toán đúng số tiền và mã đơn.",
    syncDone: (synced, total) => `Đã đồng bộ ${synced}/${total} sản phẩm từ Catalog.`
  },
  en: {
    welcome: "Welcome to Patrick Tech Shop. Choose an action below:",
    chooseLanguage: "Please choose your language:",
    languageSaved: "Language saved: English.",
    buyAccounts: "Buy products",
    myOrders: "My orders",
    support: "Warranty / Support",
    adminProducts: "Products",
    adminPendingOrders: "Pending orders",
    adminStock: "Stock",
    noAdmin: "You do not have admin permission.",
    adminPanel: "Admin panel:",
    addProductUsage: "Use: /addproduct Package name | 100000 | Description",
    productCreated: (product) => `Created product #${product.id}: ${product.name}`,
    importUsage: "Use:\n/import 1\nuser1|pass1",
    imported: (count, productId) => `Imported ${count} accounts into product #${productId}.`,
    importSheetShortUsage: "Use: /importsheet 1 <csv-link>",
    importSheetUsage: "Use: /importsheet 1 <csv-link>",
    importedSheet: (count, productId) => `Imported ${count} accounts into product #${productId}.`,
    orderPaid: (order, account) => `Order ${order.code} was verified and delivered.\n\nProduct/account details:\n${account.data}`,
    delivered: (code) => `Delivered account for order ${code}.`,
    paymentReported: (order) => `Payment review requested for order ${order.code}. Please contact support so the shop can verify and deliver it.`,
    contactSupport: "Contact support",
    ticketCreated: (id) => `Created ticket #${id}. Admin will reply soon.`,
    unknownCommand: "I do not understand this command. Press /start to open the menu.",
    noProducts: "No products are available yet.",
    noProductsInStock: "No products are currently in stock.",
    outOfStock: "This product is out of stock. Please choose another package.",
    chooseProduct: "Choose the product you want to buy:",
    inStock: "available",
    orderCreated: (order, product) => [`Order: ${order.code}`, `Product: ${product.name_en || product.name}`, `Amount: $${usdFromVnd(order.amount).toFixed(2)}`, "", "Choose the payment method below."].join("\n"),
    noOrders: "You do not have any orders yet.",
    supportUsage: "Create a ticket with: /ticket Your support request",
    noProductsAdmin: "No products yet. Use /addproduct Package name | 100000 | Description",
    noPendingOrders: "No pending orders.",
    stockLine: (row) => `#${row.id} ${row.name} | available ${row.available} | sold ${row.sold}`,
    noStock: "No stock data yet.",
    error: (message) => `Error: ${message}`,
    catalogEmpty: "No products are currently available in the catalog or stock.",
    catalogFooter: "Choose a product to create an order. Pay the exact amount and order code.",
    syncDone: (synced, total) => `Synced ${synced}/${total} catalog products.`
  }
};

export function langOf(user) { return user?.language === "en" ? "en" : "vi"; }
export function t(userOrLang, key, ...args) {
  const lang = typeof userOrLang === "string" ? userOrLang : langOf(userOrLang);
  const value = copy[lang][key] || copy.vi[key];
  return typeof value === "function" ? value(...args) : value;
}

export function formatCatalog(user, products) {
  const lang = langOf(user);
  if (!products.length) return t(lang, "catalogEmpty");
  const lines = [t(lang, "welcome"), "", lang === "en" ? "CATALOG" : "CATALOG SẢN PHẨM", ""];
  for (const [index, product] of products.entries()) {
    const name = lang === "en" ? product.name_en || product.name : product.name;
    const description = lang === "en" ? product.description_en || product.description : product.description;
    const stock = Number(product.stock || 0) > 0
      ? `${product.stock} ${t(lang, "inStock")}`
      : shopConfig().mode === "reseller"
        ? (lang === "en" ? "Catalog item" : "Sản phẩm Catalog")
        : (lang === "en" ? "Out of stock" : "Hết hàng");
    const price = lang === "en" ? `$${usdFromVnd(product.sale_price ?? product.price).toFixed(2)}` : formatMoney(product.sale_price ?? product.price);
    const priceStockLine = lang === "en"
      ? `Price: ${price} | Stock: ${stock}`
      : `Giá: ${price} | Kho: ${stock}`;
    lines.push(`${index + 1}. ${productIcon(name)} ${name}`, priceStockLine);
    if (description) lines.push(description);
    if (product.warranty_text) {
      const warranty = lang === "en" ? translateCatalogCopy(product.warranty_text) : product.warranty_text;
      lines.push(`${lang === "en" ? "Warranty" : "Bảo hành"}: ${warranty}`);
    }
    lines.push("");
  }
  lines.push(t(lang, "catalogFooter"));
  return lines.join("\n");
}

function translateCatalogCopy(value) {
  return String(value || "")
    .replace(/bảo hành\s+full/gi, "full warranty")
    .replace(/bảo hành/gi, "warranty")
    .replace(/(\d+)\s*giờ/gi, "$1 hours")
    .replace(/(\d+)\s*ngày/gi, "$1 days")
    .replace(/(\d+)\s*tháng/gi, "$1 months")
    .replace(/(\d+)\s*năm/gi, "$1 years")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function productIcon(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("netflix")) return "📺";
  if (value.includes("spotify")) return "🎵";
  if (value.includes("youtube")) return "▶️";
  if (value.includes("vpn")) return "🛡️";
  if (value.includes("google") || value.includes("gmail")) return "📧";
  if (value.includes("chatgpt") || value.includes("openai")) return "🤖";
  return "🛒";
}

export function formatMoney(value) { return Number(value || 0).toLocaleString("vi-VN") + "đ"; }
export function formatLocalizedMoney(value, lang) { return lang === "en" ? `$${usdFromVnd(value).toFixed(2)}` : formatMoney(value); }

export function paymentConfig() { return { ...shopConfig(), fallbackUsdVndRate: VND_PER_USD }; }
export async function withUsdQuote(order) { return { ...order, usdVndRate: VND_PER_USD, usdAmountRounded: usdFromVnd(order.amount) }; }

export function vietQrUrl(order) {
  const config = paymentConfig();
  if (config.bankQrUrl) return config.bankQrUrl;
  const query = new URLSearchParams({ amount: String(Math.round(Number(order.amount || 0))), addInfo: order.code, accountName: config.bankOwner });
  return `https://img.vietqr.io/image/${config.bankBin}-${config.bankAccount}-compact2.png?${query.toString()}`;
}

export function formatBankPayment(userOrLang, order) {
  const config = paymentConfig();
  if (langOf(userOrLang) === "en") return [
    `Order: ${order.code}`, `Amount: $${usdFromVnd(order.amount).toFixed(2)}`, "", "Bank transfer / VietQR:",
    `Bank: ${config.bankName}`, `Account number: ${config.bankAccount}`, `Account owner: ${config.bankOwner}`, `Transfer note: ${order.code}`, "",
    "Transfer the exact amount and order code."
  ].join("\n");
  return [`Đơn hàng: ${order.code}`, `Số tiền: ${formatMoney(order.amount)}`, "", "Chuyển khoản ngân hàng / VietQR:",
    `Ngân hàng: ${config.bankName}`, `Số tài khoản: ${config.bankAccount}`, `Chủ tài khoản: ${config.bankOwner}`, `Nội dung: ${order.code}`, "",
    "Chuyển đúng số tiền và mã đơn."].join("\n");
}

export function formatBinancePayment(userOrLang, order) {
  const config = paymentConfig();
  if (langOf(userOrLang) !== "en") return "Binance chỉ dành cho đơn hàng tiếng Anh.";
  return [`Order: ${order.code}`, `Amount: $${usdFromVnd(order.amount).toFixed(2)}`, "", "Binance Pay:",
    `ID: ${config.binancePayId}`, `Name: ${config.binanceOwner}`, `Note: ${order.code}`, "",
    "Send the exact USD/USDT amount and order code."].join("\n");
}

export function formatUsdQuote(order) { return `$${usdFromVnd(order.amount).toFixed(2)} (1 USD = ${VND_PER_USD.toLocaleString("vi-VN")} VND)`; }
