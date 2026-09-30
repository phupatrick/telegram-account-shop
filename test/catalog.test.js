import test from "node:test";
import assert from "node:assert/strict";
import { fetchCatalogProducts, mapCatalogProduct, parseCatalogPrice, translateName } from "../lib/catalog.js";
import { formatCatalog } from "../lib/i18n.js";
import { extractOrderCode, isExactPayment } from "../lib/payment.js";
import { defaultShopLanguage, RESELLER_DISCOUNT, salePriceVnd, usdFromVnd, VND_PER_USD } from "../lib/shop-config.js";

test("uses the fixed 26,000 VND/USD rate", () => {
  assert.equal(VND_PER_USD, 26000);
  assert.equal(usdFromVnd(26000), 1);
});

test("applies the reseller discount only in reseller mode", () => {
  assert.equal(RESELLER_DISCOUNT, 0.2);
  assert.equal(salePriceVnd(100000, "retail"), 100000);
  assert.equal(salePriceVnd(100000, "reseller"), 80000);
});

test("forces English in reseller mode", () => {
  const previous = process.env.SHOP_MODE;
  process.env.SHOP_MODE = "reseller";
  assert.equal(defaultShopLanguage("vi"), "en");
  if (previous === undefined) delete process.env.SHOP_MODE;
  else process.env.SHOP_MODE = previous;
});

test("maps Zalo Catalog data", () => {
  const product = mapCatalogProduct({ sourceId: "abc", name: "Tài khoản AI 1 tháng", description: "Bảo hành 30 ngày", strPrice: "249.000", productPhotos: ["https://example.test/a.jpg"] });
  assert.equal(product.price, 249000);
  assert.match(product.nameEn, /account/i);
  assert.equal(product.imageUrl, "https://example.test/a.jpg");
});

test("loads store catalog products using the store API shape", async () => {
  const previousUrl = process.env.STORE_CATALOG_URL;
  const previousFetch = globalThis.fetch;
  process.env.STORE_CATALOG_URL = "https://store.test/api/products";
  globalThis.fetch = async () => new Response(JSON.stringify({ products: [{
    id: "premium:sku-1",
    title: "Gói AI 1 tháng",
    description: "Bảo hành 7 ngày",
    price: 130000,
    image: "https://store.test/product.jpg",
    catalogLabelVi: "AI Premium"
  }] }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const products = await fetchCatalogProducts();
    assert.equal(products.length, 1);
    assert.equal(products[0].sourceId, "premium:sku-1");
    assert.equal(products[0].price, 130000);
    assert.equal(products[0].imageUrl, "https://store.test/product.jpg");
  } finally {
    globalThis.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.STORE_CATALOG_URL;
    else process.env.STORE_CATALOG_URL = previousUrl;
  }
});

test("translates reseller catalog names without Vietnamese fragments", () => {
  assert.equal(translateName("Adobe 1 năm, 2 thiết bị"), "Adobe 1 year, 2 devices");
  assert.equal(translateName("Veo bảo hành full 30 ngày"), "Veo full 30 day warranty");
});

test("formats reseller catalog in English and discounted USD", () => {
  const previous = process.env.SHOP_MODE;
  process.env.SHOP_MODE = "reseller";
  const output = formatCatalog({ language: "en" }, [{
    name: "Adobe 1 năm",
    name_en: "Adobe 1 year",
    description: "Mô tả",
    description_en: "Catalog-synced product.",
    price: 260000,
    sale_price: salePriceVnd(260000, "reseller"),
    stock: 3,
    warranty_text: "bảo hành 30 ngày"
  }]);
  assert.match(output, /Price: \$8\.00/);
  assert.match(output, /Stock: 3 available/);
  assert.match(output, /Warranty: warranty 30 days/);
  assert.doesNotMatch(output, /Giá|Kho|bảo hành/i);
  if (previous === undefined) delete process.env.SHOP_MODE;
  else process.env.SHOP_MODE = previous;
});

test("shows reseller Catalog items even without retail account stock", () => {
  const previous = process.env.SHOP_MODE;
  process.env.SHOP_MODE = "reseller";
  const output = formatCatalog({ language: "en" }, [{
    name: "Adobe 1 nÄƒm",
    name_en: "Adobe 1 year",
    description_en: "Catalog-synced product.",
    price: 260000,
    sale_price: salePriceVnd(260000, "reseller"),
    stock: 0,
    warranty_text: ""
  }]);
  assert.match(output, /Stock: Catalog item/);
  assert.doesNotMatch(output, /Out of stock/);
  if (previous === undefined) delete process.env.SHOP_MODE;
  else process.env.SHOP_MODE = previous;
});

test("shows retail Catalog items without imported account stock", () => {
  const previous = process.env.SHOP_MODE;
  delete process.env.SHOP_MODE;
  const output = formatCatalog({ language: "en" }, [{
    name: "Adobe 1 năm",
    name_en: "Adobe 1 year",
    description_en: "Catalog-synced product.",
    price: 260000,
    sale_price: 260000,
    stock: 0,
    source: "zalo",
    warranty_text: ""
  }]);
  assert.match(output, /Stock: Catalog item/);
  assert.doesNotMatch(output, /Out of stock/);
  if (previous === undefined) delete process.env.SHOP_MODE;
  else process.env.SHOP_MODE = previous;
});

test("rejects ambiguous Catalog prices", () => {
  assert.equal(parseCatalogPrice("65.000 ₫"), 65000);
  assert.equal(parseCatalogPrice("100.000 - 200.000"), 0);
  assert.equal(parseCatalogPrice("Liên hệ"), 0);
});

test("requires the exact order code and exact payment amount", () => {
  assert.equal(extractOrderCode("Thanh toan DHABC1234"), "DHABC1234");
  assert.equal(isExactPayment(249000, 249000), true);
  assert.equal(isExactPayment(249001, 249000), false);
  assert.equal(isExactPayment(248999, 249000), false);
});
