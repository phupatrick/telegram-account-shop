import {
  assertWarehouseAuth,
  createCategory,
  createProduct,
  createVariant,
  importWarehouseAccounts,
  toggleProduct,
  updateAccountStatus,
  warehouseOverview
} from "../lib/warehouse.js";

export default async function handler(req, res) {
  try {
    assertWarehouseAuth(req);

    if (req.method === "GET") {
      return res.status(200).json({ ok: true, data: await warehouseOverview() });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const action = body.action;
    const payload = body.payload || {};

    const actions = {
      create_category: createCategory,
      create_product: createProduct,
      create_variant: createVariant,
      import_accounts: importWarehouseAccounts,
      update_account_status: updateAccountStatus,
      toggle_product: toggleProduct
    };

    if (!actions[action]) {
      return res.status(400).json({ ok: false, error: "Unknown action" });
    }

    const result = await actions[action](payload);
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
}
