import {
  approveSmartImportDraft,
  cancelSmartImportDraft,
  createSmartImportDraft,
  formatSmartImportDraft
} from "../lib/services.js";
import {
  assertWarehouseAuth,
  createCategory,
  createProduct,
  createWarehouseAdmin,
  createVariant,
  deleteAccount,
  deleteImportDraft,
  deleteProduct,
  deleteVariant,
  importWarehouseAccounts,
  toggleProduct,
  updateAccountStatus,
  warehouseOverview
} from "../lib/warehouse.js";

export default async function handler(req, res) {
  try {
    const admin = await assertWarehouseAuth(req);

    if (req.method === "GET") {
      return res.status(200).json({ ok: true, data: await warehouseOverview() });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const action = body.action;
    const payload = body.payload || {};
    const intakeActor = `web:${admin.email || "admin"}`;

    if (action === "chat_intake_draft") {
      const rawText = String(payload.message || "").trim();
      if (!rawText) {
        return res.status(400).json({ ok: false, error: "Vui lòng nhập nội dung hàng." });
      }
      const draft = await createSmartImportDraft(intakeActor, rawText);
      return res.status(200).json({ ok: true, data: { draft, text: formatSmartImportDraft(draft) } });
    }

    if (action === "chat_intake_approve") {
      const draftId = Number(payload.draft_id);
      const result = await approveSmartImportDraft(draftId, intakeActor);
      return res.status(200).json({ ok: true, data: result });
    }

    if (action === "chat_intake_cancel") {
      const draftId = Number(payload.draft_id);
      const draft = await cancelSmartImportDraft(draftId, intakeActor);
      return res.status(200).json({ ok: true, data: draft });
    }

    const actions = {
      create_category: createCategory,
      create_product: createProduct,
      create_variant: createVariant,
      create_admin: createWarehouseAdmin,
      import_accounts: importWarehouseAccounts,
      update_account_status: updateAccountStatus,
      toggle_product: toggleProduct,
      delete_product: deleteProduct,
      delete_variant: deleteVariant,
      delete_account: deleteAccount,
      delete_draft: deleteImportDraft
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
