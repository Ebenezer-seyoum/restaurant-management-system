// @ts-nocheck
import { expiredSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    { message: "Logged out." },
    { headers: { "Set-Cookie": expiredSessionCookie() } }
  );
}

