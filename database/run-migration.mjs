import { readFile } from "node:fs/promises";
import { Client } from "pg";

async function loadEnvFile(filePath) {
  try {
    const file = await readFile(filePath, "utf8");

    for (const line of file.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
        continue;
      }

      const [key, ...valueParts] = trimmed.split("=");
      const value = valueParts.join("=").replace(/^["']|["']$/g, "");

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Optional local env file.
  }
}

await loadEnvFile(".env");
await loadEnvFile(".env.local");

const databaseUrl = process.env.DATABASE_URL;
const migrationPath = process.argv[2] || "database/migrations/001_initial_emrakel.sql";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const hostname = new URL(databaseUrl).hostname.toLowerCase();
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  (process.env.DATABASE_SSL !== "false" &&
    (hostname.includes("supabase") || hostname.includes("neon.tech")));
const client = new Client({
  connectionString: databaseUrl,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

try {
  const sql = await readFile(migrationPath, "utf8");
  await client.connect();
  await client.query(sql);
  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'profiles',
        'app_users',
        'site_settings',
        'menu_categories',
        'menu_items',
        'gallery_images',
        'table_bookings',
        'orders',
        'order_items',
        'contact_messages',
        'restaurant_tables',
        'income_transactions',
        'expense_categories',
        'expenses',
        'audit_logs'
      )
    order by table_name;
  `);

  console.log(`Migration completed. Tables found: ${rows.map((row) => row.table_name).join(", ")}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
