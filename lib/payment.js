export function extractOrderCode(content) {
  const match = String(content || "").toUpperCase().match(/\bDH[A-Z0-9]{6,20}\b/);
  return match?.[0] || "";
}

export function isExactPayment(paidAmount, expectedAmount) {
  const paid = Number(paidAmount);
  const expected = Number(expectedAmount);
  return Number.isFinite(paid) && Number.isFinite(expected) && paid > 0 && paid === expected;
}
