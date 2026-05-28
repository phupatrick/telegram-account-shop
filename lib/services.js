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
    throw new Error("Sản phẩm không tồn tại");
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
      throw new Error("Không tìm thấy đơn đang chờ thanh toán");
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
      throw new Error("Hết tài khoản trong kho");
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
    throw new Error(`Không tải được Google Sheet: HTTP ${response.status}`);
  }

  const csv = await response.text();
  const lines = csvToAccountLines(csv);
  return importAccounts(productId, lines);
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
