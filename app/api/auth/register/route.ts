export async function POST(request) {
  return Response.json(
    { error: "Customer account creation is no longer available." },
    { status: 410 }
  );
}

