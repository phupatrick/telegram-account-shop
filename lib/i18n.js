const copy = {
  vi: {
    welcome: "Chào mừng bạn đến với Patrick Tech Shop. Chọn tác vụ bên dưới:",
    chooseLanguage: "Vui lòng chọn ngôn ngữ / Please choose your language:",
    languageSaved: "Đã lưu ngôn ngữ Tiếng Việt.",
    buyAccounts: "Mua tài khoản",
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
    chooseProduct: "Chọn gói bạn muốn mua:",
    inStock: "còn",
    orderCreated: (order, product) => [
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
    ].join("\n"),
    noOrders: "Bạn chưa có đơn hàng nào.",
    supportUsage: "Gửi ticket bằng lệnh:\n/ticket Nội dung cần hỗ trợ",
    noProductsAdmin: "Chưa có sản phẩm.\nDùng: /addproduct Tên gói | 100000 | Mô tả",
    noPendingOrders: "Không có đơn chờ thanh toán.",
    stockLine: (row) => `#${row.id} ${row.name} | còn ${row.available} | đã bán ${row.sold}`,
    noStock: "Chưa có dữ liệu kho.",
    error: (message) => `Lỗi: ${message}`
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
    chooseProduct: "Choose the package you want to buy:",
    inStock: "stock",
    orderCreated: (order, product) => [
      `Order: ${order.code}`,
      `Product: ${product.name}`,
      `Amount: ${formatMoney(order.amount)}`,
      "",
      "Payment information:",
      `Bank: ${process.env.SHOP_BANK_NAME || "Not configured"}`,
      `Account number: ${process.env.SHOP_BANK_ACCOUNT || "Not configured"}`,
      `Account owner: ${process.env.SHOP_BANK_OWNER || "Not configured"}`,
      `Transfer note: ${order.code}`,
      "",
      "After payment, admin confirms with:",
      `/confirm ${order.code}`
    ].join("\n"),
    noOrders: "You do not have any orders yet.",
    supportUsage: "Create a ticket with:\n/ticket Your support request",
    noProductsAdmin: "No products yet.\nUse: /addproduct Package name | 100000 | Description",
    noPendingOrders: "No pending orders.",
    stockLine: (row) => `#${row.id} ${row.name} | available ${row.available} | sold ${row.sold}`,
    noStock: "No stock data yet.",
    error: (message) => `Error: ${message}`
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

export function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " VND";
}
