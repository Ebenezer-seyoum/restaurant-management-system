import { ok } from "@/lib/api";
import { forbidden, getLocalState, isAdminRequest } from "@/lib/cms";
import { listUsersFromPostgres } from "@/lib/cms-db";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(request) {
  if (!isAdminRequest(request)) {
    return forbidden();
  }

  if (process.env.DATABASE_URL) {
    try {
      return ok({ customers: await listUsersFromPostgres(), source: "postgres" });
    } catch (error) {
      console.error("Unable to read PostgreSQL users:", error);
      return Response.json({ error: "Unable to load users." }, { status: 500 });
    }
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    const state = await getLocalState();
    return ok({ customers: state.customers, source: "local" });
  }

  const { data, error } = await supabase
    .from("app_users")
    .select("id,email,name,phone,role,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return ok({ customers: data, source: "supabase" });
}
