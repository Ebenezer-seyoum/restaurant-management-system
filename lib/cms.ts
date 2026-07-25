// @ts-nocheck
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  aboutSettings,
  brand,
  brandImage,
  bookingPageSettings,
  contactSettings,
  customerPageSettings,
  footerSettings,
  galleryImages,
  homeSettings,
  houseImages,
  jazzSettings,
  loginPageSettings,
  menuBoardSettings,
  seoSettings,
  menuCategories,
  menuItems
} from "@/lib/data";
import { getSupabaseServer } from "@/lib/supabase";
import { isAdminSession } from "@/lib/auth";
import { readWebsiteDataFromPostgres } from "@/lib/restaurant-db";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "admin-data.json");

export const defaultState = {
  brand,
  home: {
    ...homeSettings,
    heroImage: houseImages[7],
    featureImage: houseImages[4],
    galleryImage: houseImages[10]
  },
  about: aboutSettings,
  contact: contactSettings,
  footer: footerSettings,
  jazz: jazzSettings,
  seo: seoSettings,
  menuBoard: menuBoardSettings,
  bookingPage: bookingPageSettings,
  loginPage: loginPageSettings,
  customerPage: customerPageSettings,
  categories: menuCategories,
  items: menuItems,
  gallery: galleryImages.map((image, index) => ({
    id: `gallery-${index + 1}`,
    title: `Gallery ${index + 1}`,
    image
  })),
  bookings: [],
  orders: [],
  customers: [],
  feedback: [],
  income: [],
  expenses: []
};

export function inferMenuSide(category) {
  const value = [category?.id, category?.name, category?.description, category?.parentId]
    .join(" ")
    .toLowerCase();

  return /drink|shake|mojito|cocktail|juice|coffee|tea/.test(value) ? "drinks" : "food";
}

function normalizeSeo(seo = {}) {
  const defaultSitelinksById = Object.fromEntries(defaultState.seo.sitelinks.map((link) => [link.id, link]));
  const sitelinks = seo.sitelinks?.length
    ? seo.sitelinks.map((link) => ({
        ...(defaultSitelinksById[link.id] || {}),
        ...link,
        title: link.title || defaultSitelinksById[link.id]?.title || link.label,
        noindex: link.noindex === true,
        enabled: link.enabled !== false
      }))
    : defaultState.seo.sitelinks;
  const siteUrl = String(seo.siteUrl || defaultState.seo.siteUrl).replace(/^https?:\/\/https?:\/\//i, "https://");

  return {
    ...defaultState.seo,
    ...seo,
    siteUrl: /http:\/\/http/i.test(siteUrl) ? defaultState.seo.siteUrl : siteUrl,
    menuUrl: seo.menuUrl || defaultState.seo.menuUrl,
    sitelinks
  };
}

function withIds(state) {
  const defaultCategoryById = Object.fromEntries(defaultState.categories.map((category) => [category.id, category]));
  const categories = state?.categories?.length
    ? state.categories.map((category) => ({
        ...(defaultCategoryById[category.id] || {}),
        ...category,
        image: category.image || defaultCategoryById[category.id]?.image || "",
        menuSide: category.menuSide || defaultCategoryById[category.id]?.menuSide || inferMenuSide(category),
        isActive: category.isActive !== false
      }))
    : defaultState.categories;
  const items = state?.items?.length
    ? state.items.map((item) => ({
        ...item,
        isActive: item.isActive !== false
      }))
    : defaultState.items;

  return {
    ...defaultState,
    ...state,
    brand: { ...defaultState.brand, ...(state?.brand || {}) },
    home: { ...defaultState.home, ...(state?.home || {}) },
    about: { ...defaultState.about, ...(state?.about || {}) },
    contact: { ...defaultState.contact, ...(state?.contact || {}) },
    footer: { ...defaultState.footer, ...(state?.footer || {}) },
    jazz: { ...defaultState.jazz, ...(state?.jazz || {}) },
    seo: normalizeSeo(state?.seo),
    menuBoard: { ...defaultState.menuBoard, ...(state?.menuBoard || {}) },
    bookingPage: { ...defaultState.bookingPage, ...(state?.bookingPage || {}) },
    loginPage: { ...defaultState.loginPage, ...(state?.loginPage || {}) },
    customerPage: { ...defaultState.customerPage, ...(state?.customerPage || {}) },
    categories,
    items,
    gallery: state?.gallery?.length ? state.gallery : defaultState.gallery,
    bookings: state?.bookings || [],
    orders: state?.orders || [],
    customers: state?.customers || [],
    feedback: state?.feedback || [],
    income: state?.income || [],
    expenses: state?.expenses || []
  };
}

export async function getLocalState() {
  try {
    const file = await readFile(dataFile, "utf8");
    return withIds(JSON.parse(file));
  } catch {
    await saveLocalState(defaultState);
    return defaultState;
  }
}

export async function saveLocalState(nextState) {
  await mkdir(dataDir, { recursive: true });
  const state = withIds(nextState);
  await writeFile(dataFile, JSON.stringify(state, null, 2));
  return state;
}

export async function updateLocalState(updater) {
  const current = await getLocalState();
  return saveLocalState(await updater(current));
}

export function isAdminRequest(request) {
  return isAdminSession(request);
}

export function forbidden() {
  return Response.json({ error: "Admin access is required." }, { status: 403 });
}

export function newId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function publicState(state) {
  const activeCategoryIds = new Set(
    (state.categories || []).filter((category) => category.isActive !== false).map((category) => category.id)
  );

  return {
    ...state,
    categories: (state.categories || []).filter((category) => category.isActive !== false),
    items: (state.items || []).filter((item) => item.isActive !== false && activeCategoryIds.has(item.category)),
    source: "local"
  };
}

export async function getPublicContent() {
  if (process.env.DATABASE_URL) {
    try {
      const data = await readWebsiteDataFromPostgres();
      const settingsMap = data.settings || {};

      return {
        brand: { ...defaultState.brand, ...(settingsMap.brand || {}) },
        home: { ...defaultState.home, ...(settingsMap.home || {}) },
        about: { ...defaultState.about, ...(settingsMap.about || {}) },
        contact: { ...defaultState.contact, ...(settingsMap.contact || {}) },
        footer: { ...defaultState.footer, ...(settingsMap.footer || {}) },
        jazz: { ...defaultState.jazz, ...(settingsMap.jazz || {}) },
        seo: normalizeSeo(settingsMap.seo),
        menuBoard: { ...defaultState.menuBoard, ...(settingsMap.menuBoard || {}) },
        bookingPage: { ...defaultState.bookingPage, ...(settingsMap.bookingPage || {}) },
        loginPage: { ...defaultState.loginPage, ...(settingsMap.loginPage || {}) },
        customerPage: { ...defaultState.customerPage, ...(settingsMap.customerPage || {}) },
        categories: data.categories || [],
        items: data.items || [],
        gallery: data.gallery?.length ? data.gallery : defaultState.gallery,
        source: "postgres"
      };
    } catch (error) {
      console.error("Unable to read public PostgreSQL content:", error);
    }
  }

  const supabase = getSupabaseServer();

  if (!supabase) {
    const state = await getLocalState();
    return publicState(state);
  }

  try {
    const [{ data: settings }, { data: categories }, { data: items }, { data: gallery }] = await Promise.all([
      supabase.from("site_settings").select("*"),
      supabase.from("menu_categories").select("*").eq("is_active", true).order("sort_order"),
      supabase.from("menu_items").select("*").eq("is_available", true).order("sort_order"),
      supabase.from("gallery_images").select("*").eq("is_active", true).order("sort_order")
    ]);

    const settingsMap = Object.fromEntries((settings || []).map((row) => [row.setting_key, row.setting_value]));
    const categoryMap = Object.fromEntries((categories || []).map((category) => [category.id, category.slug]));

    return {
      brand: { ...defaultState.brand, ...(settingsMap.brand || {}) },
      home: { ...defaultState.home, ...(settingsMap.home || {}) },
      about: { ...defaultState.about, ...(settingsMap.about || {}) },
      contact: { ...defaultState.contact, ...(settingsMap.contact || {}) },
      footer: { ...defaultState.footer, ...(settingsMap.footer || {}) },
      jazz: { ...defaultState.jazz, ...(settingsMap.jazz || {}) },
      seo: normalizeSeo(settingsMap.seo),
      menuBoard: { ...defaultState.menuBoard, ...(settingsMap.menuBoard || {}) },
      bookingPage: { ...defaultState.bookingPage, ...(settingsMap.bookingPage || {}) },
      loginPage: { ...defaultState.loginPage, ...(settingsMap.loginPage || {}) },
      customerPage: { ...defaultState.customerPage, ...(settingsMap.customerPage || {}) },
      categories: (categories || defaultState.categories).map((category) => ({
        id: category.slug || category.id,
        name: category.name,
        parentId: category.parent_slug || category.parentId || "",
        description: category.description || "",
        image: category.image_url || category.image || "",
        menuSide: category.menu_side || category.menuSide || inferMenuSide(category),
        isActive: category.is_active !== false
      })),
      items: (items || []).map((item) => ({
        id: item.id,
        category: categoryMap[item.category_id] || item.category || "burgers",
        name: item.name,
        description: item.description,
        price: Number(item.price),
        image: item.image_url || item.image || "",
        isActive: item.is_available !== false
      })),
      gallery: (gallery || []).map((image) => ({
        id: image.id,
        title: image.title || "Gallery image",
        image: image.image_url || brandImage
      })),
      source: "supabase"
    };
  } catch {
    const state = await getLocalState();
    return publicState(state);
  }
}


