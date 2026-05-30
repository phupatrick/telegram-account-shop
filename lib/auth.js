import crypto from "node:crypto";
import { db } from "./db.js";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function loginWithPassword(email, password) {
  const admin = await findActiveAdmin(email);
  if (!admin) {
    throw unauthorized();
  }

  const expectedHash = process.env.WAREHOUSE_PASSWORD_HASH;
  const salt = process.env.WAREHOUSE_PASSWORD_SALT;
  if (!expectedHash || !salt) {
    throw new Error("Missing warehouse password configuration");
  }

  const actualHash = hashPassword(password, salt);
  if (!crypto.timingSafeEqual(Buffer.from(actualHash), Buffer.from(expectedHash))) {
    throw unauthorized();
  }

  return createSession(admin);
}

export async function loginWithGoogle(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Missing GOOGLE_CLIENT_ID");
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) {
    throw unauthorized();
  }

  const profile = await response.json();
  if (profile.aud !== clientId || profile.email_verified !== "true") {
    throw unauthorized();
  }

  const admin = await findActiveAdmin(profile.email);
  if (!admin) {
    throw unauthorized();
  }

  return createSession(admin);
}

export async function verifyWarehouseSession(token) {
  if (!token) {
    return null;
  }

  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) {
    return null;
  }

  const expected = sign(payloadPart);
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return findActiveAdmin(payload.email);
}

export function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(String(password), String(salt), 210000, 32, "sha256").toString("hex");
}

async function findActiveAdmin(email) {
  const rows = await db()`
    select *
    from warehouse_admins
    where lower(email) = lower(${String(email || "")})
      and is_active = true
    limit 1
  `;
  return rows[0] || null;
}

function createSession(admin) {
  const payload = {
    sub: String(admin.id),
    email: admin.email,
    role: admin.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    token: `${payloadPart}.${sign(payloadPart)}`,
    admin: { email: admin.email, role: admin.role }
  };
}

function sign(payloadPart) {
  const secret = process.env.WAREHOUSE_SESSION_SECRET;
  if (!secret) {
    throw new Error("Missing WAREHOUSE_SESSION_SECRET");
  }
  return crypto.createHmac("sha256", secret).update(payloadPart).digest("base64url");
}

function unauthorized() {
  const error = new Error("Email hoặc mật khẩu không đúng");
  error.statusCode = 401;
  return error;
}
