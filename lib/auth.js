import crypto from "node:crypto";

export const sessionCookieName = "emrakel_session";
const sessionLifetimeSeconds = 60 * 60 * 12;

function authSecret() {
  return (
    process.env.AUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.ADMIN_PASSWORD ||
    "emrakel-development-only-secret"
  );
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signature(value) {
  return crypto.createHmac("sha256", authSecret()).update(value).digest("base64url");
}

export function createSessionToken(user) {
  const payload = encode({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds
  });
  return `${payload}.${signature(payload)}`;
}

export function readSessionToken(token) {
  try {
    const [payload, suppliedSignature] = String(token || "").split(".");
    if (!payload || !suppliedSignature) return null;

    const expected = Buffer.from(signature(payload));
    const supplied = Buffer.from(suppliedSignature);
    if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;

    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.exp || session.exp <= Math.floor(Date.now() / 1000)) return null;
    return session;
  } catch {
    return null;
  }
}

function cookieValue(request, name) {
  const cookieHeader = request?.headers?.get("cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...valueParts] = part.trim().split("=");
    if (key === name) return decodeURIComponent(valueParts.join("="));
  }
  return "";
}

export function getSessionFromRequest(request) {
  return readSessionToken(cookieValue(request, sessionCookieName));
}

export function isAdminSession(request) {
  return getSessionFromRequest(request)?.role === "admin";
}

export function sessionCookie(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const domain = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : "";
  return `${sessionCookieName}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionLifetimeSeconds}${secure}${domain}`;
}

export function expiredSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const domain = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : "";
  return `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}${domain}`;
}

export function isWaiterHost(request) {
  const forwardedHost = String(request?.headers?.get("x-forwarded-host") || "").split(",")[0].trim();
  const host = String(forwardedHost || request?.headers?.get("host") || "").split(":")[0].toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host.startsWith("order.");
}
