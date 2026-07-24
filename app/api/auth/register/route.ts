// @ts-nocheck
import { badRequest, isEmail } from "@/lib/api";
import { createSessionToken, sessionCookie } from "@/lib/auth";
import { createUserInPostgres } from "@/lib/cms-db";
import { hashPassword } from "@/lib/password";
import { getSupabaseServer } from "@/lib/supabase";

export async function POST(request) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!body.name || !email || !password) {
    return badRequest("Name, email, and password are required.");
  }

  if (!isEmail(email)) {
    return badRequest("Please enter a valid email address.");
  }

  if (password.length < 8) {
    return badRequest("Password must be at least 8 characters.");
  }

  if (process.env.DATABASE_URL) {
    try {
      const user = await createUserInPostgres({ ...body, email, password });
      return Response.json(
        { message: "Account created successfully.", user },
        { status: 201, headers: { "Set-Cookie": sessionCookie(createSessionToken(user)) } }
      );
    } catch (error) {
      const duplicate = error.code === "23505";
      return Response.json(
        { error: duplicate ? "An account with this email already exists." : "Unable to create the account." },
        { status: duplicate ? 409 : 500 }
      );
    }
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    return Response.json({ error: "Supabase is required for customer registration." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("app_users")
    .insert({
      email,
      password_hash: hashPassword(password),
      name: body.name,
      phone: body.phone || null,
      role: "customer"
    })
    .select("id,email,name,phone,role")
    .single();

  if (error) {
    const message = error.code === "23505" ? "An account with this email already exists." : error.message;
    return Response.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }

  return Response.json(
    { message: "Account created successfully.", user: data },
    { status: 201, headers: { "Set-Cookie": sessionCookie(createSessionToken(data)) } }
  );
}

