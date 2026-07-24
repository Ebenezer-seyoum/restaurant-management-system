// @ts-nocheck
import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { Client } from "pg";

async function loadEnv(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = parts.join("=").replace(/^["']|["']$/g, "");
    }
  } catch {
    // Environment files are optional in hosted deployments.
  }
}

await loadEnv(".env");
await loadEnv(".env.local");

const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_PASSWORD || "");
const name = String(process.env.ADMIN_NAME || "EMRAKEL Admin");

if (!process.env.DATABASE_URL || !email || password.length < 10) {
  console.error("DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD (minimum 10 characters) are required.");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const passwordHash = `scrypt:${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
const hostname = new URL(process.env.DATABASE_URL).hostname;
const ssl = process.env.DATABASE_SSL === "true" || hostname.includes("supabase") || hostname.includes("neon.tech");
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: ssl ? { rejectUnauthorized: false } : false
});

try {
  await client.connect();
  await client.query(
    `insert into public.app_users (email, password_hash, name, role)
     values ($1, $2, $3, 'admin')
     on conflict (email) do update set
       password_hash = excluded.password_hash,
       name = excluded.name,
       role = 'admin',
       updated_at = now()`,
    [email, passwordHash, name]
  );
  console.log(`Admin account ready: ${email}`);
} finally {
  await client.end();
}

