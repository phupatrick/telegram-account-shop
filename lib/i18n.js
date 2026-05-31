const copy = {
  vi: {
    welcome: "Chào mừng bạn đến với Patrick Tech Shop. Chọn tác vụ bên dưới:",
    chooseLanguage: "Vui lòng chọn ngôn ngữ / Please choose your language:",
    languageSaved: "Đã lưu ngôn ngữ Tiếng Việt.",
    buyAccounts: "Đặt mua tài khoản",
    myOrders: "Đơn hàng của tôi",
    support: "Bảo hành / Hỗ trợ",
    adminProducts: "Sản phẩm",
    adminPendingOrders: "Đơn chờ thanh toán",
    adminStock: "Tồn kho",
    noAdmin: "Bạn không có quyền admin.",
    adminPanel: "Bảng điều khiển admin:",
    addProductUsage: "Dùng: /addproduct Tên gói | 100000 | Mô tả",
    productCreated: (product) => `Đã tạo sản phẩm #${product.id}: ${product.name}`,
    importUsage: "Dùng:\n/import 1\nuser1|pass1\nuser2|pass2",
    imported: (count, productId) => `Đã nạp ${count} tài khoản vào sản phẩm #${productId}.`,
    importSheetShortUsage: "Dùng: /importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0",
    importSheetUsage: [
      "Dùng:",
      "/importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0",
      "",
      "Sheet nên có cột đầu tiên là tài khoản, hoặc cột tên data/account/tài khoản."
    ].join("\n"),
    importedSheet: (count, productId) => `Đã nhập ${count} tài khoản từ Google Sheet vào sản phẩm #${productId}.`,
    orderPaid: (order, account) => `Đơn ${order.code} đã thanh toán.\n\nTài khoản của bạn:\n${account.data}`,
    delivered: (code) => `Đã cấp tài khoản cho đơn ${code}.`,
    ticketCreated: (id) => `Đã tạo ticket #${id}. Admin sẽ phản hồi sớm.`,
    unknownCommand: "Mình chưa hiểu lệnh này. Bấm /start để mở menu.",
    noProducts: "Hiện chưa có sản phẩm nào.",
    noProductsInStock: "Hiện chưa có sản phẩm còn hàng.",
    outOfStock: "Sản phẩm này đã hết hàng. Vui lòng chọn gói khác hoặc quay lại sau.",
    chooseProduct: "Chọn gói bạn muốn mua:",
    inStock: "còn",
    orderCreated: (order, product) => [
      `Đơn hàng: ${order.code}`,
      `Sản phẩm: ${product.name}`,
      `Số tiền: ${formatMoney(order.amount)}`,
      "",
      "Vui lòng chọn phương thức thanh toán bên dưới."
    ].join("\n"),
    noOrders: "Bạn chưa có đơn hàng nào.",
    supportUsage: "Gửi ticket bằng lệnh:\n/ticket Nội dung cần hỗ trợ",
    noProductsAdmin: "Chưa có sản phẩm.\nDùng: /addproduct Tên gói | 100000 | Mô tả",
    noPendingOrders: "Không có đơn chờ thanh toán.",
    stockLine: (row) => `#${row.id} ${row.name} | còn ${row.available} | đã bán ${row.sold}`,
    noStock: "Chưa có dữ liệu kho.",
    error: (message) => `Lỗi: ${message}`,
    catalogEmpty: [
      "🌟 HỆ THỐNG BÁN TÀI KHOẢN SỐ TỰ ĐỘNG 🌟",
      "----------------------------------------",
      "Chào mừng bạn đến với hệ thống cung cấp tài khoản số tự động.",
      "An toàn - Nhanh chóng - Giao hàng lập tức!",
      "",
      "📋 BẢNG GIÁ & KHO HÀNG HIỆN TẠI:",
      "",
      "Hiện chưa có sản phẩm nào.",
      "",
      "👉 Vui lòng quay lại sau hoặc liên hệ hỗ trợ."
    ].join("\n"),
    catalogFooter: "👉 Vui lòng nhấn vào các nút bên dưới để tiến hành đặt mua tài khoản số của bạn."
  },
  en: {
    welcome: "Welcome to Patrick Tech Shop. Choose an action below:",
    chooseLanguage: "Please choose your language / Vui lòng chọn ngôn ngữ:",
    languageSaved: "Language saved: English.",
    buyAccounts: "Buy accounts",
    myOrders: "My orders",
    support: "Warranty / Support",
    adminProducts: "Products",
    adminPendingOrders: "Pending orders",
    adminStock: "Stock",
    noAdmin: "You do not have admin permission.",
    adminPanel: "Admin panel:",
    addProductUsage: "Use: /addproduct Package name | 100000 | Description",
    productCreated: (product) => `Created product #${product.id}: ${product.name}`,
    importUsage: "Use:\n/import 1\nuser1|pass1\nuser2|pass2",
    imported: (count, productId) => `Imported ${count} accounts into product #${productId}.`,
    importSheetShortUsage: "Use: /importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0",
    importSheetUsage: [
      "Use:",
      "/importsheet 1 https://docs.google.com/spreadsheets/d/.../export?format=csv&gid=0",
      "",
      "The sheet should use the first column, or a column named data/account/tài khoản."
    ].join("\n"),
    importedSheet: (count, productId) => `Imported ${count} accounts from Google Sheet into product #${productId}.`,
    orderPaid: (order, account) => `Order ${order.code} has been paid.\n\nYour account:\n${account.data}`,
    delivered: (code) => `Delivered account for order ${code}.`,
    ticketCreated: (id) => `Created ticket #${id}. Admin will reply soon.`,
    unknownCommand: "I do not understand this command. Press /start to open the menu.",
    noProducts: "No products are available yet.",
    noProductsInStock: "No products are currently in stock.",
    outOfStock: "This product is out of stock. Please choose another package or come back later.",
    chooseProduct: "Choose the package you want to buy:",
    inStock: "stock",
    orderCreated: (order, product) => [
      `Order: ${order.code}`,
      `Product: ${product.name}`,
      `Amount: ${formatMoney(order.amount)}`,
      "",
      "Please choose a payment method below."
    ].join("\n"),
    noOrders: "You do not have any orders yet.",
    supportUsage: "Create a ticket with:\n/ticket Your support request",
    noProductsAdmin: "No products yet.\nUse: /addproduct Package name | 100000 | Description",
    noPendingOrders: "No pending orders.",
    stockLine: (row) => `#${row.id} ${row.name} | available ${row.available} | sold ${row.sold}`,
    noStock: "No stock data yet.",
    error: (message) => `Error: ${message}`,
    catalogEmpty: [
      "🌟 AUTOMATED DIGITAL ACCOUNT SHOP 🌟",
      "----------------------------------------",
      "Welcome to the automated digital account delivery system.",
      "Secure - Fast - Instant delivery!",
      "",
      "📋 CURRENT PRICE LIST & STOCK:",
      "",
      "No products are available yet.",
      "",
      "👉 Please come back later or contact support."
    ].join("\n"),
    catalogFooter: "👉 Please use the buttons below to place your order."
  }
};

export function langOf(user) {
  return user?.language === "en" ? "en" : "vi";
}

export function t(userOrLang, key, ...args) {
  const lang = typeof userOrLang === "string" ? userOrLang : langOf(userOrLang);
  const value = copy[lang][key] || copy.vi[key];
  return typeof value === "function" ? value(...args) : value;
}

export function formatCatalog(user, products) {
  const lang = langOf(user);
  if (products.length === 0) {
    return t(lang, "catalogEmpty");
  }

  const lines =
    lang === "en"
      ? [
          "🌟 AUTOMATED DIGITAL ACCOUNT SHOP 🌟",
          "----------------------------------------",
          "Welcome to the automated digital account delivery system.",
          "Secure - Fast - Instant delivery!",
          "",
          "📋 CURRENT PRICE LIST & STOCK:",
          ""
        ]
      : [
          "🌟 HỆ THỐNG BÁN TÀI KHOẢN SỐ TỰ ĐỘNG 🌟",
          "----------------------------------------",
          "Chào mừng bạn đến với hệ thống cung cấp tài khoản số tự động.",
          "An toàn - Nhanh chóng - Giao hàng lập tức!",
          "",
          "📋 BẢNG GIÁ & KHO HÀNG HIỆN TẠI:",
          ""
        ];

  products.forEach((product, index) => {
    const stockText =
      Number(product.stock) > 0
        ? lang === "en"
          ? `✅ ${product.stock} available`
          : `✅ Còn ${product.stock}`
        : lang === "en"
          ? "❌ Out of stock"
          : "❌ Hết hàng";

    lines.push(`${index + 1}. ${productIcon(product.name)} ${product.name}`);
    lines.push(`💵 ${lang === "en" ? "Price" : "Giá"}: ${formatMoney(product.price)} | ${lang === "en" ? "Stock" : "Kho"}: ${stockText}`);
    if (product.description) {
      lines.push(`👉 ${product.description}`);
    }
    lines.push("");
  });

  lines.push("----------------------------------------");
  lines.push(t(lang, "catalogFooter"));
  return lines.join("\n");
}

function productIcon(name) {
  const value = String(name || "").toLowerCase();
  if (value.includes("netflix")) return "📺";
  if (value.includes("spotify")) return "🎵";
  if (value.includes("youtube")) return "❤️";
  if (value.includes("vpn")) return "🛡️";
  if (value.includes("gmail") || value.includes("google")) return "📧";
  if (value.includes("facebook")) return "📘";
  if (value.includes("canva")) return "🎨";
  if (value.includes("chatgpt") || value.includes("openai")) return "🤖";
  return "🛒";
}

export function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + "đ";
}

export function paymentConfig() {
  return {
    bankName: process.env.SHOP_BANK_NAME || "ACB",
    bankBin: process.env.SHOP_BANK_BIN || "970416",
    bankAccount: process.env.SHOP_BANK_ACCOUNT || "333817088888",
    bankOwner: process.env.SHOP_BANK_OWNER || "Nguyen Hoang Phu",
    binancePayId: process.env.BINANCE_PAY_ID || "1077465024",
    fallbackUsdVndRate: Number(process.env.USD_VND_FALLBACK_RATE || 25000)
  };
}

export async function withUsdQuote(order) {
  const rate = await fetchUsdVndRate();
  const amount = Number(order.amount || 0);
  return {
    ...order,
    usdVndRate: rate,
    usdAmountRounded: Math.max(1, Math.round(amount / rate))
  };
}

export function vietQrUrl(order) {
  const config = paymentConfig();
  const query = new URLSearchParams({
    amount: String(Math.round(Number(order.amount || 0))),
    addInfo: order.code,
    accountName: config.bankOwner
  });
  return `https://img.vietqr.io/image/${config.bankBin}-${config.bankAccount}-compact2.png?${query.toString()}`;
}

export function formatBankPayment(userOrLang, order) {
  const lang = langOf(userOrLang);
  const config = paymentConfig();
  return lang === "en"
    ? [
        `Order: ${order.code}`,
        `Amount: ${formatMoney(order.amount)}`,
        "",
        "Bank transfer / VietQR:",
        `Bank: ${config.bankName}`,
        `Account number: ${config.bankAccount}`,
        `Account owner: ${config.bankOwner}`,
        `Transfer note: ${order.code}`,
        "",
        "Please transfer the exact amount and note."
      ].join("\n")
    : [
        `Đơn hàng: ${order.code}`,
        `Số tiền: ${formatMoney(order.amount)}`,
        "",
        "Chuyển khoản ngân hàng / VietQR:",
        `Ngân hàng: ${config.bankName}`,
        `Số tài khoản: ${config.bankAccount}`,
        `Chủ tài khoản: ${config.bankOwner}`,
        `Nội dung chuyển khoản: ${order.code}`,
        "",
        "Vui lòng chuyển đúng số tiền và nội dung."
      ].join("\n");
}

export function formatBinancePayment(userOrLang, order) {
  const lang = langOf(userOrLang);
  const config = paymentConfig();
  return lang === "en"
    ? [
        `Order: ${order.code}`,
        `VND amount: ${formatMoney(order.amount)}`,
        `Binance/USDT amount: ${formatUsdQuote(order)}`,
        "",
        "Binance Pay:",
        `Pay ID: ${config.binancePayId}`,
        `Note: ${order.code}`,
        "",
        "Please send the rounded USDT/USD amount and keep the note exactly as shown."
      ].join("\n")
    : [
        `Đơn hàng: ${order.code}`,
        `Số tiền VND: ${formatMoney(order.amount)}`,
        `Số tiền Binance/USDT: ${formatUsdQuote(order)}`,
        "",
        "Binance Pay:",
        `Pay ID: ${config.binancePayId}`,
        `Nội dung: ${order.code}`,
        "",
        "Vui lòng gửi đúng số USDT/USD đã làm tròn và giữ nguyên nội dung."
      ].join("\n");
}

export function formatUsdQuote(order) {
  const rate = Number(order.usdVndRate || paymentConfig().fallbackUsdVndRate);
  const amount = Number(order.usdAmountRounded || Math.max(1, Math.round(Number(order.amount || 0) / rate)));
  return `${amount} USDT/USD (tỷ giá ${formatMoney(Math.round(rate))}/$)`;
}

async function fetchUsdVndRate() {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(3500)
    });
    if (!response.ok) {
      throw new Error(`Rate API HTTP ${response.status}`);
    }
    const data = await response.json();
    const rate = Number(data?.rates?.VND);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error("Rate API returned invalid VND rate");
    }
    return rate;
  } catch (error) {
    console.warn("Using fallback USD/VND rate:", error.message);
    return paymentConfig().fallbackUsdVndRate;
  }
}
