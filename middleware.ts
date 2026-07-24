// @ts-nocheck
import { NextResponse } from "next/server";

export function middleware(request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = String(forwardedHost || request.headers.get("host") || "")
    .split(":")[0]
    .toLowerCase();

  if (host.startsWith("order.") && request.nextUrl.pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/orders";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"]
};

