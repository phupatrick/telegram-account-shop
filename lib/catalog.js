import { shopConfig } from "./shop-config.js";

const API_BASE = "https://api-catalog.zalo.me/v1";

export async function fetchCatalogProducts(catalogId = shopConfig().catalogId) {
  const items = [];
  const seen = new Set();
  let lastId = 0;
  let total = Infinity;

  while (items.length < total) {
    const url = API_BASE + "/catalog?noise=" + encodeURIComponent(catalogId) + "&limit=20&lastId=" + lastId;
    const page = await fetchJson(url);
    const rows = page.data?.category_product || [];
    total = Number(page.data?.total ?? rows.length);
    if (!rows.length) break;

    for (const row of rows) {
      const sourceId = extractProductId(row.path);
      if (sourceId && !seen.has(sourceId)) {
        seen.add(sourceId);
        items.push({ ...row, sourceId });
      }
    }
    const nextLastId = Math.min(...rows.map((row) => Number(row.id)).filter(Number.isFinite));
    if (!Number.isFinite(nextLastId) || nextLastId === lastId) break;
    lastId = nextLastId;
  }

  return Promise.all(items.map(async (item) => {
    try {
      const detailUrl = API_BASE + "/product?productId=" + encodeURIComponent(item.sourceId);
      const detail = await fetchJson(detailUrl);
      return mapCatalogProduct({ ...item, ...(detail.data?.product_info || {}) });
    } catch {
      return mapCatalogProduct(item);
    }
  }));
}

export function mapCatalogProduct(raw) {
  const name = cleanText(raw.name || "Sản phẩm Catalog");
  const description = cleanText(raw.description || "");
  const price = parseCatalogPrice(raw.strPrice ?? raw.price);
  const imageUrl = raw.productPhotos?.[0] || raw.photos?.[0] || "";
  const warrantyText = inferWarranty(name + " " + description);
  return {
    sourceId: raw.sourceId || raw.productId || extractProductId(raw.path),
    name,
    nameEn: translateName(name),
    description,
    descriptionEn: englishDescription(name, description, warrantyText),
    price,
    imageUrl,
    warrantyText,
    active: price > 0,
    payload: raw
  };
}

export function parseCatalogPrice(value) {
  const input = String(value ?? "").trim();
  if (!input || /free|miễn phí|\d+\s*-\s*\d+/i.test(input)) return 0;
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(input)) return Number(input.replace(/\D/g, ""));
  if (/^\d+$/.test(input)) {
    const number = Number(input);
    return number > 0 && number < 10000 ? number * 1000 : number;
  }
  return 0;
}

export function translateName(value) {
  return String(value || "")
    .replace(/bảo hành\s+full/gi, "full warranty")
    .replace(/tài khoản/gi, "account")
    .replace(/nâng cấp/gi, "upgrade")
    .replace(/bảo hành/gi, "warranty")
    .replace(/\bbh\b/gi, "warranty")
    .replace(/chính chủ/gi, "primary")
    .replace(/dùng chung/gi, "shared")
    .replace(/cấp riêng/gi, "dedicated")
    .replace(/\bacc\b/gi, "account")
    .replace(/thiết bị/gi, "devices")
    .replace(/(\d+)\s*giờ/gi, "$1 hours")
    .replace(/(\d+)\s*năm/gi, "$1 year")
    .replace(/(\d+)\s*tháng/gi, "$1 month")
    .replace(/(\d+)\s*ngày/gi, "$1 day")
    .replace(/miễn phí/gi, "free")
    .replace(/warranty\s+(\d+\s*hours?)/gi, "$1 warranty")
    .replace(/full warranty\s+(\d+\s*(?:days?|months?|years?))/gi, "full $1 warranty")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function englishDescription(name, description, warranty) {
  const translated = translateName(description)
    .replace(/khách hàng/gi, "customer")
    .replace(/giao nhanh/gi, "fast delivery")
    .replace(/liên hệ/gi, "contact support")
    .replace(/thời hạn/gi, "term")
    .replace(/sản phẩm/gi, "product");
  const stillVietnamese = /[À-ỹ]|\b(bao mat|khong|duoc|voi|va|cua|cho|khi|goi|dung|nhan|gui)\b/i.test(translated.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  if (translated && !stillVietnamese) return translated;
  return translateName(name) + ". Catalog-synced digital product" + (warranty ? " with " + translateName(warranty) : "") + ". Contact support for delivery details.";
}

function inferWarranty(value) {
  const match = String(value || "").match(/bảo hành\s*(?:full\s*)?(\d+\s*(?:ngày|tháng|năm|giờ)|full[^,.\n]*)/i);
  return match ? cleanText(match[0]) : "";
}

function extractProductId(path = "") {
  return new URLSearchParams(String(path).replace(/^\?/, "")).get("pid") || "";
}

function cleanText(value) {
  return String(value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(12000)
  });
  if (!response.ok) throw new Error("Catalog HTTP " + response.status);
  const data = await response.json();
  if (Number(data?.error_code || 0) !== 0) throw new Error(data?.error_message || "Catalog API error");
  return data;
}
