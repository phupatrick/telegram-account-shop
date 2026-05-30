import { loginWithGoogle, loginWithPassword, verifyWarehouseSession } from "../lib/auth.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const admin = await verifyWarehouseSession(readBearer(req));
      return res.status(200).json({
        ok: true,
        data: {
          admin: admin ? { email: admin.email, role: admin.role } : null,
          googleClientId: process.env.GOOGLE_CLIENT_ID || null
        }
      });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Method not allowed" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const result =
      body.provider === "google"
        ? await loginWithGoogle(body.idToken)
        : await loginWithPassword(body.email, body.password);

    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error(error);
    return res.status(error.statusCode || 500).json({ ok: false, error: error.message });
  }
}

function readBearer(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}
