// @ts-nocheck
import { Pool } from "pg";

const globalPoolKey = "__emrakelPostgresPool";

function databaseUsesSsl(connectionString) {
  if (process.env.DATABASE_SSL === "true") return true;
  if (process.env.DATABASE_SSL === "false") return false;

  try {
    const hostname = new URL(connectionString).hostname.toLowerCase();
    return hostname.includes("supabase") || hostname.includes("neon.tech");
  } catch {
    return false;
  }
}

export function getDbPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!globalThis[globalPoolKey]) {
    globalThis[globalPoolKey] = new Pool({
      connectionString,
      max: Number(process.env.DATABASE_POOL_SIZE || 10),
      ssl: databaseUsesSsl(connectionString) ? { rejectUnauthorized: false } : false
    });
  }

  return globalThis[globalPoolKey];
}

export async function withTransaction(callback) {
  const pool = getDbPool();
  if (!pool) return null;

  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await callback(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

