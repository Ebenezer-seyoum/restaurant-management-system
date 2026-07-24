// @ts-nocheck
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";

async function loadEnvFile(filePath) {
  try {
    const file = await readFile(filePath, "utf8");
    for (const line of file.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const [key, ...valueParts] = trimmed.split("=");
      if (!process.env[key]) {
        process.env[key] = valueParts.join("=").replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // Environment files are optional in hosted deployments.
  }
}

await loadEnvFile(".env");
await loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const hostname = new URL(process.env.DATABASE_URL).hostname.toLowerCase();
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_SSL !== "false" &&
    (hostname.includes("supabase") || hostname.includes("neon.tech")));
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

try {
  await client.connect();
  await client.query("select pg_advisory_lock(20260724)");
  await client.query(`
    create table if not exists public.schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const files = (await readdir("database/migrations"))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();
  const appliedResult = await client.query("select filename from public.schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.filename));

  for (const filename of files) {
    if (applied.has(filename)) {
      console.log(`Already applied: ${filename}`);
      continue;
    }

    const sql = await readFile(`database/migrations/${filename}`, "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(
        "insert into public.schema_migrations (filename) values ($1)",
        [filename]
      );
      await client.query("commit");
      console.log(`Applied: ${filename}`);
    } catch (error) {
      await client.query("rollback");
      throw new Error(`${filename}: ${error.message}`);
    }
  }

  console.log("All database migrations are up to date.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.query("select pg_advisory_unlock(20260724)").catch(() => {});
  await client.end().catch(() => {});
}

