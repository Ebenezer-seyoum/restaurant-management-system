// @ts-nocheck
export function ok(data, status = 200) {
  return Response.json(data, { status });
}

export function badRequest(message) {
  return Response.json({ error: message }, { status: 400 });
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

