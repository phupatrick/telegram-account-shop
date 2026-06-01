import { t } from "../lib/i18n.js";
import { db } from "../lib/db.js";
import { confirmAndDeliver, logEvent } from "../lib/services.js";
import { telegram } from "../lib/telegram.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true, service: "payment-webhook" });
  }

  const allowedSecrets = [process.env.PAYMENT_WEBHOOK_SECRET, process.env.TELEGRAM_WEBHOOK_SECRET].filter(Boolean);
  if (allowedSecrets.length > 0 && !allowedSecrets.includes(req.headers["x-payment-webhook-secret"])) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    const transaction = normalizeTransaction(req.body || {});
    const result = await processPaymentTransaction(transaction);
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    await safeLog("payment.webhook.error", { message: error.message, body: req.body || null });
    return res.status(200).json({ ok: false, error: error.message });
  }
}

async function processPaymentTransaction(transaction) {
  const code = extractOrderCode(transaction.content);
  if (!code) {
    await safeLog("payment.webhook.ignored", { reason: "missing_order_code", transaction });
    return { status: "ignored", reason: "missing_order_code" };
  }

  const pending = await findPendingOrder(code);
  if (!pending) {
    await safeLog("payment.webhook.ignored", { reason: "order_not_pending", code, transaction });
    return { status: "ignored", reason: "order_not_pending", code };
  }

  const paidAmount = Number(transaction.amount || 0);
  const expectedAmount = Number(pending.amount || 0);
  if (!Number.isFinite(paidAmount) || paidAmount < expectedAmount) {
    await safeLog("payment.webhook.ignored", {
      reason: "amount_too_low",
      code,
      paidAmount,
      expectedAmount,
      transaction
    });
    return { status: "ignored", reason: "amount_too_low", code, paidAmount, expectedAmount };
  }

  const { order, account } = await confirmAndDeliver(code);
  await telegram("sendMessage", {
    chat_id: order.telegram_id,
    text: t(pending.language || "vi", "orderPaid", order, account)
  });
  await safeLog("payment.webhook.delivered", {
    code,
    paidAmount,
    expectedAmount,
    provider: transaction.provider,
    transactionId: transaction.transactionId || null
  });

  return { status: "delivered", code, paidAmount, expectedAmount };
}

async function findPendingOrder(code) {
  const rows = await db()`
    select o.*, u.telegram_id, u.language, p.name as product_name
    from orders o
    join users u on u.id = o.user_id
    join products p on p.id = o.product_id
    where o.code = ${code} and o.status = 'pending'
    limit 1
  `;
  return rows[0];
}

function normalizeTransaction(body) {
  const payload = body.data || body.transaction || body;
  const amount =
    firstNumber(payload.transferAmount, payload.amount, payload.money, payload.value, payload.creditAmount) ||
    firstNumber(body.transferAmount, body.amount, body.money, body.value, body.creditAmount);
  const content =
    firstText(payload.content, payload.description, payload.transferContent, payload.addInfo, payload.note, payload.memo) ||
    firstText(body.content, body.description, body.transferContent, body.addInfo, body.note, body.memo);

  return {
    provider: firstText(body.provider, payload.provider, body.gateway, payload.gateway) || "bank",
    transactionId: firstText(payload.id, payload.transactionId, payload.referenceCode, payload.refNo, body.id),
    amount,
    content
  };
}

function extractOrderCode(content) {
  const match = String(content || "").toUpperCase().match(/\bDH[A-Z0-9]{6,20}\b/);
  return match?.[0] || "";
}

function firstText(...values) {
  const value = values.find((item) => item !== undefined && item !== null && String(item).trim() !== "");
  return value === undefined ? "" : String(value).trim();
}

function firstNumber(...values) {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const normalized = String(value).replace(/[^\d.-]/g, "");
    const number = Number(normalized);
    if (Number.isFinite(number)) return number;
  }
  return 0;
}

async function safeLog(event, payload) {
  try {
    await logEvent(event, payload);
  } catch (error) {
    console.error(error);
  }
}
