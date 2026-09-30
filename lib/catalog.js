import { shopConfig } from "./shop-config.js";

const API_BASE = "https://api-catalog.zalo.me/v1";
const STORE_CATALOG_URL = "https://patricktechmedia.store/api/products";
export const ZALO_CATALOGS = [
  { id: "premium", name: "Tài khoản Premium", nameEn: "Premium Accounts", cid: "CjB4IZYLbGb1hBDIEvNfUJUdmLPRuE0S9DUwEItYd6PUrhOpKvEJ7m" },
  { id: "api-keys", name: "API Key & AI", nameEn: "API Keys & AI", cid: "CjN8JpoKdmn5hRbNFvJZV3EcorDVuUeP8DQmF2dZbcDQrxmsLvAP6W" },
  { id: "social", name: "Mạng xã hội", nameEn: "Social Growth", cid: "CjN8J3-Id0z6gxfKF9BWVp2Wo51Sv-aQ8z2pFohbbM1PqRyrL9IQ6G" },
  { id: "software", name: "Code, Tool & Phần mềm", nameEn: "Code, Tools & Software", cid: "CjN8J3-IdGz6gxjKF9BXVp2WoL1Sv-WQ8z2oFohbb61PqRurL9IR6G" }
];

async function fetchSingleCatalog(catalog, catalogId) {
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
      return mapCatalogProduct({ ...item, ...(detail.data?.product_info || {}), sourceId: `${catalog.id}:${item.sourceId}`, category: catalog.name, categoryEn: catalog.nameEn });
    } catch {
      return mapCatalogProduct({ ...item, sourceId: `${catalog.id}:${item.sourceId}`, category: catalog.name, categoryEn: catalog.nameEn });
    }
  }));
}

export async function fetchCatalogProducts(catalogId) {
  if (!catalogId && process.env.STORE_CATALOG_URL) {
    return fetchStoreCatalogProducts(process.env.STORE_CATALOG_URL);
  }
  if (!catalogId && process.env.USE_STORE_CATALOG !== "false") {
    try {
      return await fetchStoreCatalogProducts(STORE_CATALOG_URL);
    } catch (error) {
      console.error("[store-catalog-fetch]", error.message || error);
    }
  }
  const requested = catalogId ? ZALO_CATALOGS.filter((catalog) => catalog.cid === catalogId) : ZALO_CATALOGS;
  const catalogs = requested.length ? requested : [{ id: "custom", name: "Tài khoản Premium", nameEn: "Premium Accounts", cid: catalogId || shopConfig().catalogId }];
  const results = await Promise.allSettled(catalogs.map((catalog) => fetchSingleCatalog(catalog, catalog.cid)));
  const products = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!products.length && results.every((result) => result.status === "rejected")) {
    throw new Error("All Zalo catalogs are unavailable");
  }
  return products.filter((product, index, all) => all.findIndex((item) => `${item.name.toLowerCase()}|${item.price}` === `${product.name.toLowerCase()}|${product.price}`) === index);
}

async function fetchStoreCatalogProducts(url) {
  const response = await fetchJson(url);
  const rows = Array.isArray(response.products) ? response.products : [];
  return rows.map((item) => mapCatalogProduct({
    sourceId: item.id,
    name: item.title,
    description: item.description,
    price: item.price,
    productPhotos: item.images?.length ? item.images : item.image ? [item.image] : [],
    category: item.catalogLabelVi || item.catalogCategory,
    categoryEn: item.catalogLabelEn,
    payload: item
  })).filter((product) => product.sourceId);
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
    category: raw.category || "Tài khoản Premium",
    categoryEn: raw.categoryEn || "Premium Accounts",
    active: price > 0,
    payload: raw
  };
}

export function parseCatalogPrice(value) {
  const input = String(value ?? "").trim();
  if (!input || /free|miễn phí|\d+\s*-\s*\d+/i.test(input)) return 0;
  const numeric = input.replace(/[₫đ\s]/gi, "");
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(numeric)) return Number(numeric.replace(/\D/g, ""));
  if (/^\d+$/.test(numeric)) {
    const number = Number(numeric);
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
