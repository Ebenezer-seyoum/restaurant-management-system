import { getSessionFromRequest } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  return Response.json({
    user: {
      id: session.id,
      email: session.email,
      name: session.name,
      role: session.role
    }
  });
}
