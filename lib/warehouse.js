import { db } from "./db.js";

export function assertWarehouseAuth(req) {
  const expected = process.env.WAREHOUSE_ADMIN_TOKEN;
  if (!expected) {
    throw new Error("Missing WAREHOUSE_ADMIN_TOKEN");
  }

  const provided = req.headers["x-admin-token"] || req.query?.token;
  if (provided !== expected) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }
}

export async function warehouseOverview() {
  const sql = db();
  const [categories, products, variants, accounts, orders, logs, admins] = await Promise.all([
    sql`
      select c.*,
        count(distinct p.id)::int as product_count,
        count(a.id) filter (where a.status = 'available')::int as available_count
      from categories c
      left join products p on p.category_id = c.id
      left join accounts a on a.product_id = p.id
      group by c.id
      order by c.id desc
    `,
    sql`
      select p.*, c.name as category_name,
        count(a.id) filter (where a.status = 'available')::int as available_count,
        count(a.id) filter (where a.status = 'sold')::int as sold_count,
        count(a.id) filter (where a.status = 'disabled')::int as disabled_count
      from products p
      left join categories c on c.id = p.category_id
      left join accounts a on a.product_id = p.id
      group by p.id, c.name
      order by p.id desc
    `,
    sql`
      select v.*, p.name as product_name,
        count(a.id) filter (where a.status = 'available')::int as available_count,
        count(a.id) filter (where a.status = 'sold')::int as sold_count
      from product_variants v
      join products p on p.id = v.product_id
      left join accounts a on a.variant_id = v.id
      group by v.id, p.name
      order by v.id desc
    `,
    sql`
      select a.id, a.product_id, a.variant_id, a.status, a.note, a.created_at, a.sold_at,
        p.name as product_name, v.name as variant_name,
        left(a.data, 80) as preview
      from accounts a
      join products p on p.id = a.product_id
      left join product_variants v on v.id = a.variant_id
      order by a.id desc
      limit 80
    `,
    sql`
      select o.*, p.name as product_name, u.username, u.telegram_id
      from orders o
      join products p on p.id = o.product_id
      join users u on u.id = o.user_id
      order by o.created_at desc
      limit 40
    `,
    sql`
      select *
      from system_logs
      order by created_at desc
      limit 40
    `,
    sql`
      select *
      from warehouse_admins
      order by id asc
    `
  ]);

  return { categories, products, variants, accounts, orders, logs, admins };
}

export async function createCategory({ name, description = "" }) {
  const rows = await db()`
    insert into categories (name, description)
    values (${required(name, "name")}, ${description})
    returning *
  `;
  await logWarehouse("warehouse.category.created", { id: rows[0].id, name });
  return rows[0];
}

export async function createProduct({ category_id, name, price, description = "" }) {
  const rows = await db()`
    insert into products (category_id, name, price, description)
    values (${nullableInt(category_id)}, ${required(name, "name")}, ${Number(price)}, ${description})
    returning *
  `;
  await logWarehouse("warehouse.product.created", { id: rows[0].id, name });
  return rows[0];
}

export async function createVariant({ product_id, name, warranty_days = 0, mail_type = "random" }) {
  const rows = await db()`
    insert into product_variants (product_id, name, warranty_days, mail_type)
    values (${requiredInt(product_id, "product_id")}, ${required(name, "name")}, ${Number(warranty_days) || 0}, ${mail_type || "random"})
    returning *
  `;
  await logWarehouse("warehouse.variant.created", { id: rows[0].id, product_id });
  return rows[0];
}

export async function importWarehouseAccounts({ product_id, variant_id, lines, note = "" }) {
  const cleanLines = String(lines || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (cleanLines.length === 0) {
    return { count: 0 };
  }

  const productId = requiredInt(product_id, "product_id");
  const variantId = nullableInt(variant_id);
  const values = cleanLines.map((line) => ({
    product_id: productId,
    variant_id: variantId,
    data: line,
    status: "available",
    note
  }));

  const sql = db();
  await sql`insert into accounts ${sql(values, "product_id", "variant_id", "data", "status", "note")}`;
  await logWarehouse("warehouse.accounts.imported", { product_id: productId, variant_id: variantId, count: cleanLines.length });
  return { count: cleanLines.length };
}

export async function updateAccountStatus({ account_id, status, note = "" }) {
  const allowed = new Set(["available", "reserved", "sold", "disabled"]);
  if (!allowed.has(status)) {
    throw new Error("Invalid status");
  }

  const rows = await db()`
    update accounts
    set status = ${status}, note = ${note}
    where id = ${requiredInt(account_id, "account_id")}
    returning id, status, note
  `;
  await logWarehouse("warehouse.account.status_updated", rows[0] || { account_id, status });
  return rows[0];
}

export async function toggleProduct({ product_id, is_active }) {
  const rows = await db()`
    update products
    set is_active = ${Boolean(is_active)}
    where id = ${requiredInt(product_id, "product_id")}
    returning *
  `;
  await logWarehouse("warehouse.product.toggled", { product_id, is_active: Boolean(is_active) });
  return rows[0];
}

export async function createWarehouseAdmin({ email, role = "admin" }) {
  const cleanEmail = required(email, "email").toLowerCase();
  const rows = await db()`
    insert into warehouse_admins (email, role)
    values (${cleanEmail}, ${role || "admin"})
    on conflict (email)
    do update set role = excluded.role, is_active = true
    returning *
  `;
  await logWarehouse("warehouse.admin.upserted", { email: cleanEmail, role: rows[0].role });
  return rows[0];
}

async function logWarehouse(event, payload) {
  await db()`
    insert into system_logs (event, payload)
    values (${event}, ${JSON.stringify(payload)}::jsonb)
  `;
}

function required(value, name) {
  if (value === undefined || value === null || String(value).trim() === "") {
    throw new Error(`Missing ${name}`);
  }
  return String(value).trim();
}

function requiredInt(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}`);
  }
  return parsed;
}

function nullableInt(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return requiredInt(value, "id");
}
