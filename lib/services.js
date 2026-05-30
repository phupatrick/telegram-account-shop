import { db } from "./db.js";

export async function ensureUser(from) {
  const sql = db();
  const rows = await sql`
    insert into users (telegram_id, username, full_name)
    values (${String(from.id)}, ${from.username || null}, ${[from.first_name, from.last_name].filter(Boolean).join(" ") || null})
    on conflict (telegram_id)
    do update set username = excluded.username, full_name = excluded.full_name
    returning *
  `;
  return rows[0];
}

export async function setUserLanguage(userId, language) {
  const rows = await db()`
    update users
    set language = ${language}
    where id = ${userId}
    returning *
  `;
  return rows[0];
}

export async function listProducts() {
  return db()`
    select p.*,
      count(a.id) filter (where a.status = 'available')::int as stock
    from products p
    left join accounts a on a.product_id = p.id
    where p.is_active = true
    group by p.id
    order by p.id asc
  `;
}

export async function getProduct(productId) {
    const rows = await db()`select * from products where id = ${productId} and is_active = true`;
  return rows[0];
}

export async function createOrder(userId, productId) {
  const sql = db();
  const product = await getProduct(productId);
  if (!product) {
    throw new Error("Product does not exist");
  }

  const code = `DH${Date.now().toString(36).toUpperCase()}`;
  const rows = await sql`
    insert into orders (code, user_id, product_id, amount, status)
    values (${code}, ${userId}, ${productId}, ${product.price}, 'pending')
    returning *
  `;

  await logEvent("order.created", { orderCode: code, userId, productId });
  return { order: rows[0], product };
}

export async function listUserOrders(userId) {
  return db()`
    select o.*, p.name as product_name
    from orders o
    join products p on p.id = o.product_id
    where o.user_id = ${userId}
    order by o.created_at desc
    limit 10
  `;
}

export async function listPendingOrders() {
  return db()`
    select o.*, u.telegram_id, u.username, p.name as product_name
    from orders o
    join users u on u.id = o.user_id
    join products p on p.id = o.product_id
    where o.status = 'pending'
    order by o.created_at asc
    limit 20
  `;
}

export async function confirmAndDeliver(orderCode) {
  const sql = db();

  return sql.begin(async (tx) => {
    const orderRows = await tx`
      select o.*, u.telegram_id, p.name as product_name
      from orders o
      join users u on u.id = o.user_id
      join products p on p.id = o.product_id
      where o.code = ${orderCode} and o.status = 'pending'
      for update of o
    `;

    const order = orderRows[0];
    if (!order) {
      throw new Error("Pending order not found");
    }

    const accountRows = await tx`
      select *
      from accounts
      where product_id = ${order.product_id} and status = 'available'
      order by id asc
      limit 1
      for update skip locked
    `;

    const account = accountRows[0];
    if (!account) {
      await tx`
        update orders
        set status = 'failed', paid_at = now()
        where id = ${order.id}
      `;
      throw new Error("Out of stock");
    }

    await tx`
      update accounts
      set status = 'sold',
          order_id = ${order.id},
          sold_to_user_id = ${order.user_id},
          sold_at = now()
      where id = ${account.id}
    `;

    await tx`
      update orders
      set status = 'delivered',
          paid_at = now(),
          delivered_at = now()
      where id = ${order.id}
    `;

    await tx`
      insert into system_logs (event, payload)
      values (${"order.delivered"}, ${JSON.stringify({ orderCode, accountId: account.id })}::jsonb)
    `;

    return { order, account };
  });
}

export async function addProduct(name, price, description = "") {
  const rows = await db()`
    insert into products (name, price, description)
    values (${name}, ${price}, ${description})
    returning *
  `;
  return rows[0];
}

export async function importAccounts(productId, accountLines) {
  const cleanLines = accountLines.map((line) => line.trim()).filter(Boolean);
  if (cleanLines.length === 0) {
    return 0;
  }

  const values = cleanLines.map((line) => ({ product_id: productId, data: line, status: "available" }));
  await db()`insert into accounts ${db()(values, "product_id", "data", "status")}`;
  await logEvent("accounts.imported", { productId, count: cleanLines.length });
  return cleanLines.length;
}

export async function importAccountsFromSheet(productId, sheetCsvUrl) {
  const response = await fetch(sheetCsvUrl);
  if (!response.ok) {
    throw new Error(`Could not load Google Sheet: HTTP ${response.status}`);
  }

  const csv = await response.text();
  const lines = csvToAccountLines(csv);
  return importAccounts(productId, lines);
}

export async function createSmartImportDraft(telegramId, rawText) {
  const catalog = await listProductsWithVariants();
  const parsed = classifyInventoryText(rawText, catalog);
  const rows = await db()`
    insert into warehouse_import_drafts (telegram_id, raw_text, parsed, status)
    values (${String(telegramId)}, ${rawText}, ${JSON.stringify(parsed)}::jsonb, 'pending')
    returning *
  `;
  await logEvent("warehouse.import_draft.created", {
    draftId: rows[0].id,
    telegramId: String(telegramId),
    groups: parsed.groups.length,
    unclassified: parsed.unclassified.length
  });
  return rows[0];
}

export async function approveSmartImportDraft(draftId, telegramId) {
  const sql = db();

  return sql.begin(async (tx) => {
    const rows = await tx`
      select *
      from warehouse_import_drafts
      where id = ${draftId}
        and telegram_id = ${String(telegramId)}
        and status = 'pending'
      for update
    `;
    const draft = rows[0];
    if (!draft) {
      throw new Error("Không tìm thấy nháp nhập kho đang chờ duyệt.");
    }

    const parsed = normalizeDraftParsed(draft.parsed);
    const values = parsed.groups.flatMap((group) =>
      group.lines.map((line) => ({
        product_id: Number(group.product_id),
        variant_id: group.variant_id ? Number(group.variant_id) : null,
        data: line,
        status: "available",
        note: `Nhập kho qua bot #${draft.id}`
      }))
    );

    if (values.length === 0) {
      throw new Error("Nháp này chưa có dòng tài khoản hợp lệ để nhập kho.");
    }

    await tx`insert into accounts ${tx(values, "product_id", "variant_id", "data", "status", "note")}`;
    await tx`
      update warehouse_import_drafts
      set status = 'approved',
          reviewed_at = now()
      where id = ${draft.id}
    `;
    await tx`
      insert into system_logs (event, payload)
      values (${"warehouse.import_draft.approved"}, ${JSON.stringify({ draftId: draft.id, count: values.length })}::jsonb)
    `;

    return { draft: { ...draft, parsed }, count: values.length };
  });
}

export async function cancelSmartImportDraft(draftId, telegramId) {
  const rows = await db()`
    update warehouse_import_drafts
    set status = 'cancelled',
        reviewed_at = now()
    where id = ${draftId}
      and telegram_id = ${String(telegramId)}
      and status = 'pending'
    returning *
  `;
  if (!rows[0]) {
    throw new Error("Không tìm thấy nháp nhập kho đang chờ duyệt.");
  }
  await logEvent("warehouse.import_draft.cancelled", { draftId, telegramId: String(telegramId) });
  return rows[0];
}

export function formatSmartImportDraft(draft) {
  const parsed = normalizeDraftParsed(draft.parsed);
  const groupsText = parsed.groups.length
    ? parsed.groups
        .map((group, index) => {
          const variant = group.variant_name ? ` / ${group.variant_name}` : "";
          return `${index + 1}. ${group.product_name}${variant}: ${group.lines.length} tài khoản`;
        })
        .join("\n")
    : "Chưa phân loại được tài khoản nào.";

  const unclassifiedText = parsed.unclassified.length
    ? `\n\nChưa nhận diện (${parsed.unclassified.length} dòng, sẽ không nhập):\n${parsed.unclassified.slice(0, 8).join("\n")}${parsed.unclassified.length > 8 ? "\n..." : ""}`
    : "";

  return [
    `Nháp nhập kho #${draft.id}`,
    "",
    groupsText,
    unclassifiedText,
    "",
    "Kiểm tra kỹ rồi bấm duyệt để nhập kho thật."
  ].join("\n");
}

async function listProductsWithVariants() {
  return db()`
    select
      p.id as product_id,
      p.name as product_name,
      p.description as product_description,
      v.id as variant_id,
      v.name as variant_name,
      v.warranty_days,
      v.mail_type
    from products p
    left join product_variants v on v.product_id = p.id and v.is_active = true
    where p.is_active = true
    order by p.id asc, v.id asc
  `;
}

function classifyInventoryText(rawText, catalog) {
  const products = buildProductIndex(catalog);
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const grouped = new Map();
  const unclassified = [];
  let context = null;

  for (const line of lines) {
    const match = findCatalogMatch(line, products, context);
    if (match && !looksLikeAccountLine(line)) {
      context = match;
      continue;
    }

    if (!looksLikeAccountLine(line)) {
      continue;
    }

    const target = match || context || (products.length === 1 ? { product: products[0], variant: products[0].variants[0] || null } : null);
    if (!target) {
      unclassified.push(line);
      continue;
    }

    const key = `${target.product.id}:${target.variant?.id || ""}`;
    const group = grouped.get(key) || {
      product_id: target.product.id,
      product_name: target.product.name,
      variant_id: target.variant?.id || null,
      variant_name: target.variant?.name || "",
      lines: []
    };
    group.lines.push(line);
    grouped.set(key, group);
  }

  return { groups: [...grouped.values()], unclassified };
}

function buildProductIndex(catalog) {
  const map = new Map();
  for (const row of catalog) {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, {
        id: Number(row.product_id),
        name: row.product_name,
        normalizedName: normalizeText(row.product_name),
        tokens: significantTokens(row.product_name),
        variants: []
      });
    }

    if (row.variant_id) {
      map.get(row.product_id).variants.push({
        id: Number(row.variant_id),
        name: row.variant_name,
        normalizedName: normalizeText(row.variant_name),
        tokens: significantTokens(`${row.variant_name} ${row.mail_type || ""} ${row.warranty_days || ""} ngay bh`)
      });
    }
  }
  return [...map.values()];
}

function findCatalogMatch(line, products, context) {
  const normalized = normalizeText(line);
  let best = null;
  let bestScore = 0;

  for (const product of products) {
    const productScore = scoreMatch(normalized, product.normalizedName, product.tokens);
    if (productScore <= 0 && context?.product?.id !== product.id) {
      continue;
    }

    const variants = product.variants.length ? product.variants : [null];
    for (const variant of variants) {
      const variantScore = variant ? scoreMatch(normalized, variant.normalizedName, variant.tokens) : 0;
      const contextBoost = context?.product?.id === product.id ? 1 : 0;
      const score = productScore + variantScore + contextBoost;
      if (score > bestScore) {
        bestScore = score;
        best = { product, variant };
      }
    }
  }

  return bestScore > 0 ? best : null;
}

function scoreMatch(normalizedLine, normalizedName, tokens) {
  let score = normalizedName && normalizedLine.includes(normalizedName) ? 4 : 0;
  for (const token of tokens) {
    if (normalizedLine.includes(token)) {
      score += 1;
    }
  }
  return score;
}

function looksLikeAccountLine(line) {
  const normalized = normalizeText(line);
  if (/^\d+[\).\-\s]/.test(line)) {
    return false;
  }
  return /[@|:;,]/.test(line) || /\b(pass|pwd|password|login|user)\b/.test(normalized) || /^\S{18,}$/.test(line);
}

function significantTokens(text) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !["premium", "account", "tai", "khoan", "ngay", "nam", "thang"].includes(token));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeDraftParsed(parsed) {
  if (typeof parsed === "string") {
    return JSON.parse(parsed);
  }
  return parsed || { groups: [], unclassified: [] };
}

function csvToAccountLines(csv) {
  const rows = parseCsv(csv);
  if (rows.length === 0) {
    return [];
  }

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const dataIndex = header.findIndex((cell) => ["data", "account", "tài khoản", "tai khoan"].includes(cell));
  const startRow = dataIndex >= 0 ? 1 : 0;
  const columnIndex = dataIndex >= 0 ? dataIndex : 0;

  return rows
    .slice(startRow)
    .map((row) => (row[columnIndex] || "").trim())
    .filter(Boolean);
}

function parseCsv(csv) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((cells) => cells.some((value) => value.trim()));
}

export async function stockSummary() {
  return db()`
    select p.id, p.name,
      count(a.id) filter (where a.status = 'available')::int as available,
      count(a.id) filter (where a.status = 'sold')::int as sold
    from products p
    left join accounts a on a.product_id = p.id
    group by p.id
    order by p.id asc
  `;
}

export async function createTicket(userId, message) {
  const rows = await db()`
    insert into tickets (user_id, message, status)
    values (${userId}, ${message}, 'open')
    returning *
  `;
  await logEvent("ticket.created", { userId, ticketId: rows[0].id });
  return rows[0];
}

export async function logEvent(event, payload) {
  await db()`
    insert into system_logs (event, payload)
    values (${event}, ${JSON.stringify(payload)}::jsonb)
  `;
}
