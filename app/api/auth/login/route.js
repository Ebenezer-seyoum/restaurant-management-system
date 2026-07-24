import { badRequest } from "@/lib/api";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { getDbPool } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { getSupabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";
const attemptStoreKey = "__emrakelLoginAttempts";
const attemptWindowMs = 15 * 60 * 1000;
const maxAttempts = 10;

function attemptStore() {
  globalThis[attemptStoreKey] ||= new Map();
  return globalThis[attemptStoreKey];
}

function clientKey(request, email) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${forwarded || "unknown"}:${email}`;
}

function isRateLimited(key) {
  const current = attemptStore().get(key);
  if (!current || current.resetAt <= Date.now()) {
    attemptStore().delete(key);
    return false;
  }
  return current.count >= maxAttempts;
}

function recordFailure(key) {
  const store = attemptStore();
  const current = store.get(key);
  if (!current || current.resetAt <= Date.now()) {
    store.set(key, { count: 1, resetAt: Date.now() + attemptWindowMs });
    return;
  }
  current.count += 1;
}

function loginResponse(user) {
  const publicUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role
  };

  return Response.json(
    { message: "Login successful.", user: publicUser },
    { headers: { "Set-Cookie": sessionCookie(createSessionToken(publicUser)) } }
  );
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("A valid email and password are required.");
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return badRequest("Email and password are required.");
  }
  const key = clientKey(request, email);
  if (isRateLimited(key)) {
    return Response.json(
      { error: "Too many login attempts. Try again in 15 minutes." },
      { status: 429 }
    );
  }

  const pool = getDbPool();
  if (pool) {
    try {
      const { rows } = await pool.query(
        `select id, email, password_hash, name, phone, role
         from public.app_users
         where lower(email) = $1
         limit 1`,
        [email]
      );
      const user = rows[0];

      if (!user || !verifyPassword(password, user.password_hash)) {
        recordFailure(key);
        return Response.json({ error: "Invalid login details." }, { status: 401 });
      }

      attemptStore().delete(key);
      return loginResponse(user);
    } catch (error) {
      console.error("PostgreSQL login failed:", error);
      return Response.json({ error: "Login service is temporarily unavailable." }, { status: 503 });
    }
  }

  const supabase = getSupabaseServer();
  if (supabase) {
    const { data: user, error } = await supabase
      .from("app_users")
      .select("id,email,password_hash,name,phone,role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      return Response.json({ error: "Login service is temporarily unavailable." }, { status: 503 });
    }

    if (!user || !verifyPassword(password, user.password_hash)) {
      recordFailure(key);
      return Response.json({ error: "Invalid login details." }, { status: 401 });
    }

    attemptStore().delete(key);
    return loginResponse(user);
  }

  return Response.json(
    { error: "Database login is not configured. Add DATABASE_URL and seed the admin account." },
    { status: 503 }
  );
}
