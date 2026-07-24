// @ts-nocheck
import { forbidden, getLocalState, getPublicContent, isAdminRequest, saveLocalState } from "@/lib/cms";
import { saveSettingsToPostgres } from "@/lib/cms-db";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET() {
  const content = await getPublicContent();
  return Response.json({
    brand: content.brand,
    home: content.home,
    about: content.about,
    contact: content.contact,
    footer: content.footer,
    jazz: content.jazz,
    seo: content.seo,
    menuBoard: content.menuBoard,
    bookingPage: content.bookingPage,
    loginPage: content.loginPage,
    customerPage: content.customerPage,
    source: content.source
  });
}

export async function PUT(request) {
  if (!isAdminRequest(request)) {
    return forbidden();
  }

  const body = await request.json();

  if (process.env.DATABASE_URL) {
    try {
      await saveSettingsToPostgres(body);
      return Response.json({ message: "Settings saved.", ...body, source: "postgres" });
    } catch (error) {
      console.error("Unable to save PostgreSQL settings:", error);
      return Response.json({ error: "Unable to save website settings." }, { status: 500 });
    }
  }

  const supabase = getSupabaseServer();

  async function saveLocalSettings(message = "Settings saved locally.") {
    const state = await getLocalState();
    const next = await saveLocalState({
      ...state,
      brand: { ...state.brand, ...(body.brand || {}) },
      home: { ...state.home, ...(body.home || {}) },
      about: { ...state.about, ...(body.about || {}) },
      contact: { ...state.contact, ...(body.contact || {}) },
      footer: { ...state.footer, ...(body.footer || {}) },
      jazz: { ...state.jazz, ...(body.jazz || {}) },
      seo: { ...state.seo, ...(body.seo || {}) },
      menuBoard: { ...state.menuBoard, ...(body.menuBoard || {}) },
      bookingPage: { ...state.bookingPage, ...(body.bookingPage || {}) },
      loginPage: { ...state.loginPage, ...(body.loginPage || {}) },
      customerPage: { ...state.customerPage, ...(body.customerPage || {}) }
    });
    return Response.json({ message, ...next, source: "local" });
  }

  if (!supabase) {
    return saveLocalSettings();
  }

  const rows = [
    { setting_key: "brand", setting_value: body.brand || {} },
    { setting_key: "home", setting_value: body.home || {} },
    { setting_key: "about", setting_value: body.about || {} },
    { setting_key: "contact", setting_value: body.contact || {} },
    { setting_key: "footer", setting_value: body.footer || {} },
    { setting_key: "jazz", setting_value: body.jazz || {} },
    { setting_key: "seo", setting_value: body.seo || {} },
    { setting_key: "menuBoard", setting_value: body.menuBoard || {} },
    { setting_key: "bookingPage", setting_value: body.bookingPage || {} },
    { setting_key: "loginPage", setting_value: body.loginPage || {} },
    { setting_key: "customerPage", setting_value: body.customerPage || {} }
  ];

  let error;

  try {
    ({ error } = await supabase.from("site_settings").upsert(rows, { onConflict: "setting_key" }));
  } catch {
    return saveLocalSettings("Settings saved locally because Supabase is unavailable.");
  }

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ message: "Settings saved.", ...body, source: "supabase" });
}

