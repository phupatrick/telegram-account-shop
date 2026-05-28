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

export function mainMenu() {
  return {
    inline_keyboard: [
      [{ text: "Mua tài khoản", callback_data: "products" }],
      [{ text: "Đơn hàng của tôi", callback_data: "my_orders" }],
      [{ text: "Bảo hành / Hỗ trợ", callback_data: "support" }]
    ]
  };
}

export function adminMenu() {
  return {
    inline_keyboard: [
      [{ text: "Sản phẩm", callback_data: "admin_products" }],
      [{ text: "Đơn chờ thanh toán", callback_data: "admin_pending_orders" }],
      [{ text: "Tồn kho", callback_data: "admin_stock" }]
    ]
  };
}
