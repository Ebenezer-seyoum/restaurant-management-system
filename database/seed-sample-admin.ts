// @ts-nocheck
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const sampleAdminEmail = "admin@emrakel.com";
const sampleAdminPassword = "kena@12345";
const sampleAdminName = "EMRAKEL Admin";

async function loadEnv(filePath) {
  try {
    const contents = await readFile(filePath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...parts] = trimmed.split("=");
      if (!process.env[key]) process.env[key] = parts.join("=").replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Environment files are optional; the database URL is still required.
  }
}

async function main() {
  await loadEnv(".env");
  await loadEnv(".env.local");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required to seed the sample admin account.");
    process.exit(1);
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = `scrypt:${salt}:${crypto.scryptSync(sampleAdminPassword, salt, 64).toString("hex")}`;
  const hostname = new URL(process.env.DATABASE_URL).hostname.toLowerCase();
  const useSsl =
    process.env.DATABASE_SSL === "true" ||
    (process.env.DATABASE_SSL !== "false" && (hostname.includes("supabase") || hostname.includes("neon.tech")));
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: useSsl ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    await client.query("create extension if not exists pgcrypto");
    await client.query(`
      create table if not exists public.app_users (
        id uuid primary key default gen_random_uuid(),
        email text not null unique,
        password_hash text not null,
        name text not null,
        phone text,
        role text not null default 'customer' check (role in ('customer', 'admin')),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);
    await client.query(
      `insert into public.app_users (email, password_hash, name, role)
       values ($1, $2, $3, 'admin')
       on conflict (email) do update set
         password_hash = excluded.password_hash,
         name = excluded.name,
         role = 'admin',
         updated_at = now()`,
      [sampleAdminEmail, passwordHash, sampleAdminName]
    );
    console.log(`Sample admin account ready: ${sampleAdminEmail}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
