export const VND_PER_USD = 26000;
export const RESELLER_DISCOUNT = 0.2;

export function shopConfig() {
  return {
    mode: process.env.SHOP_MODE === "reseller" ? "reseller" : "retail",
    catalogId: process.env.ZALO_CATALOG_ID || "CjB4IZYLbGb1hBDIEvNfUJUdmLPRuE0S9DUwEItYd6PUrhOpKvEJ7m",
    supportUsername: clean(process.env.SHOP_SUPPORT_USERNAME, "Patrick_Tech_Fullapp").replace(/^@/, ""),
    bankName: clean(process.env.SHOP_BANK_NAME, "ACB"),
    bankBin: clean(process.env.SHOP_BANK_BIN, "970416"),
    bankAccount: clean(process.env.SHOP_BANK_ACCOUNT, "333817088888"),
    bankOwner: clean(process.env.SHOP_BANK_OWNER, "NGUYEN HOANG PHU"),
    binancePayId: clean(process.env.BINANCE_PAY_ID, "1077465024"),
    binanceOwner: clean(process.env.BINANCE_OWNER, "Nguyen Hoang Phu Patrick"),
    bankQrUrl: clean(process.env.SHOP_BANK_QR_URL, defaultAssetUrl("bank-qr.png"))
  };
}

export function defaultShopLanguage(currentLanguage) {
  if (shopConfig().mode === "reseller") return "en";
  return currentLanguage === "en" || currentLanguage === "vi" ? currentLanguage : null;
}

export function salePriceVnd(basePrice, mode = shopConfig().mode) {
  const amount = Math.max(0, Number(basePrice) || 0);
  return mode === "reseller" ? Math.round(amount * (1 - RESELLER_DISCOUNT)) : amount;
}

export function usdFromVnd(value) {
  return Math.round((Math.max(0, Number(value) || 0) / VND_PER_USD) * 100) / 100;
}

function defaultAssetUrl(fileName) {
  const appUrl = String(process.env.APP_URL || "").replace(/\/$/, "");
  return appUrl ? appUrl + "/" + fileName : "";
}

function clean(value, fallback) {
  const text = String(value || "").trim();
  return text && !/^(your |000000)/i.test(text) ? text : fallback;
}
