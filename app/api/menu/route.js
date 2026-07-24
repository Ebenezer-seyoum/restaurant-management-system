import { forbidden, getLocalState, getPublicContent, inferMenuSide, isAdminRequest, saveLocalState } from "@/lib/cms";
import { readMenuFromPostgres, saveMenuToPostgres } from "@/lib/restaurant-db";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(request) {
  if (isAdminRequest(request)) {
    if (process.env.DATABASE_URL) {
      try {
        const menu = await readMenuFromPostgres({ includeInactive: true });
        return Response.json(menu);
      } catch (error) {
        console.error("Unable to read the PostgreSQL menu:", error);
        return Response.json({ error: "Unable to load the menu from PostgreSQL." }, { status: 500 });
      }
    }

    const supabase = getSupabaseServer();

    if (!supabase) {
      const state = await getLocalState();
      return Response.json({ categories: state.categories, items: state.items, source: "local" });
    }

    try {
      const [{ data: categories }, { data: items }] = await Promise.all([
        supabase.from("menu_categories").select("*").order("sort_order"),
        supabase.from("menu_items").select("*").order("sort_order")
      ]);
      const categoryMap = Object.fromEntries((categories || []).map((category) => [category.id, category.slug]));

      return Response.json({
        categories: (categories || []).map((category) => ({
          id: category.slug || category.id,
          name: category.name,
          parentId: category.parent_slug || "",
          description: category.description || "",
          image: category.image_url || "",
          menuSide: category.menu_side || inferMenuSide(category),
          isActive: category.is_active !== false
        })),
        items: (items || []).map((item) => ({
          id: item.slug || item.id,
          category: categoryMap[item.category_id] || "burgers",
          name: item.name,
          description: item.description || "",
          price: Number(item.price || 0),
          image: item.image_url || "",
          isActive: item.is_available !== false
        })),
        source: "supabase"
      });
    } catch {
      const state = await getLocalState();
      return Response.json({ categories: state.categories, items: state.items, source: "local" });
    }
  }

  const content = await getPublicContent();
  return Response.json({ categories: content.categories, items: content.items, source: content.source });
}

export async function PUT(request) {
  if (!isAdminRequest(request)) {
    return forbidden();
  }

  const body = await request.json();
  const categories = Array.isArray(body.categories) ? body.categories : [];
  const items = Array.isArray(body.items) ? body.items : [];

  if (process.env.DATABASE_URL) {
    try {
      const saved = await saveMenuToPostgres(categories, items);
      return Response.json({ message: "Menu saved.", ...saved });
    } catch (error) {
      console.error("Unable to save the PostgreSQL menu:", error);
      return Response.json(
        { error: error.message || "Unable to save the menu." },
        { status: error.status || 500 }
      );
    }
  }

  const supabase = getSupabaseServer();

  async function saveLocalMenu(message = "Menu saved locally.") {
    const state = await getLocalState();
    const next = await saveLocalState({ ...state, categories, items });
    return Response.json({
      message,
      categories: next.categories,
      items: next.items,
      source: "local"
    });
  }

  if (!supabase) {
    return saveLocalMenu();
  }

  const categoryRows = categories.map((category, index) => ({
    slug: category.id,
    name: category.name,
    description: category.description || "",
    parent_slug: category.parentId || null,
    image_url: category.image || null,
    menu_side: category.menuSide || inferMenuSide(category),
    sort_order: index + 1,
    is_active: category.isActive !== false
  }));

  try {
    await supabase.from("menu_categories").update({ is_active: false }).neq("slug", "__never__");
    const { data: savedCategories, error: categoryError } = await supabase
      .from("menu_categories")
      .upsert(categoryRows, { onConflict: "slug" })
      .select("*");

    if (categoryError) {
      return Response.json({ error: categoryError.message }, { status: 500 });
    }

    const categoryIdBySlug = Object.fromEntries((savedCategories || []).map((category) => [category.slug, category.id]));
    const itemRows = items.map((item, index) => ({
      slug: item.id,
      category_id: categoryIdBySlug[item.category] || null,
      name: item.name,
      description: item.description,
      price: Number(item.price || 0),
      image_url: item.image || null,
      sort_order: index + 1,
      is_available: item.isActive !== false
    }));

    await supabase.from("menu_items").update({ is_available: false }).neq("slug", "__never__");
    const { error: itemError } = await supabase.from("menu_items").upsert(itemRows, { onConflict: "slug" });

    if (itemError) {
      return Response.json({ error: itemError.message }, { status: 500 });
    }

    return Response.json({ message: "Menu saved.", categories, items, source: "supabase" });
  } catch {
    return saveLocalMenu("Menu saved locally because Supabase is unavailable.");
  }
}
