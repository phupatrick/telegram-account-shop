import { syncCatalog } from "../lib/services.js";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) return res.status(405).json({ ok: false });

  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    return res.status(200).json({ ok: true, ...(await syncCatalog()) });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
