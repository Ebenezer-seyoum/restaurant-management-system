// @ts-nocheck
import { getDbPool, withTransaction } from "@/lib/db";
import { menuAvailabilityStatus } from "@/lib/menu-availability";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const orderStatuses = new Set(["pending", "finished", "cancelled"]);

function inferSide(category) {
  const value = [category?.slug, category?.name, category?.description, category?.parent_slug]
    .join(" ")
    .toLowerCase();
  return /drink|shake|mojito|cocktail|juice|coffee|tea/.test(value) ? "drinks" : "food";
}

function mapCategory(row) {
  return {
    id: row.slug || row.id,
    databaseId: row.id,
    name: row.name,
    parentId: row.parent_slug || "",
    description: row.description || "",
    image: row.image_url || "",
    menuSide: row.menu_side || inferSide(row),
    availabilityStatus: menuAvailabilityStatus({
      availability_status: row.availability_status,
      isActive: row.is_active !== false
    }),
    isActive: row.is_active !== false
  };
}

function mapMenuItem(row, categorySlugById) {
  return {
    id: row.slug || row.id,
    databaseId: row.id,
    category: categorySlugById[row.category_id] || row.category || "",
    name: row.name,
    description: row.description || "",
    price: Number(row.price || 0),
    image: row.image_url || "",
    availabilityStatus: menuAvailabilityStatus({
      availability_status: row.availability_status,
      isActive: row.is_available !== false
    }),
    isActive: row.is_available !== false
  };
}

function mapOrder(row) {
  const orderItems = Array.isArray(row.order_items) ? row.order_items : [];
  return {
    ...row,
    total_amount: Number(row.total_amount || 0),
    order_items: orderItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0)
    })),
    items: orderItems.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unit_price || 0)
    }))
  };
}

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function readMenuFromPostgres({ includeInactive = false } = {}) {
  const pool = getDbPool();
  if (!pool) return null;

  const categoryWhere = includeInactive
    ? ""
    : "where is_active = true and availability_status <> 'hidden'";
  const itemWhere = includeInactive
    ? ""
    : "where is_available = true and availability_status <> 'hidden'";
  const [categoryResult, itemResult] = await Promise.all([
    pool.query(
      `select id, slug, name, description, parent_slug, image_url, menu_side, sort_order, is_active, availability_status
       from public.menu_categories
       ${categoryWhere}
       order by sort_order, name`
    ),
    pool.query(
      `select id, category_id, slug, name, description, price, image_url, sort_order, is_available, availability_status
       from public.menu_items
       ${itemWhere}
       order by sort_order, name`
    )
  ]);

  const categorySlugById = Object.fromEntries(categoryResult.rows.map((row) => [row.id, row.slug]));
  return {
    categories: categoryResult.rows.map(mapCategory),
    items: itemResult.rows.map((row) => mapMenuItem(row, categorySlugById)),
    source: "postgres"
  };
}

export async function saveMenuToPostgres(categories, items) {
  const pool = getDbPool();
  if (!pool) return null;

  await withTransaction(async (client) => {
    await client.query("update public.menu_items set is_available = false, updated_at = now()");
    await client.query("update public.menu_categories set is_active = false, updated_at = now()");

    const categoryIdBySlug = {};
    for (const [index, category] of categories.entries()) {
      const slug = String(category.id || "").trim();
      const name = String(category.name || "").trim();
      if (!slug || !name) throw requestError("Every menu section needs a key and name.");

      const availabilityStatus = menuAvailabilityStatus(category);
      const { rows } = await client.query(
        `insert into public.menu_categories
          (slug, name, description, parent_slug, image_url, menu_side, sort_order, is_active, availability_status, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         on conflict (slug) do update set
           name = excluded.name,
           description = excluded.description,
           parent_slug = excluded.parent_slug,
           image_url = excluded.image_url,
           menu_side = excluded.menu_side,
           sort_order = excluded.sort_order,
           is_active = excluded.is_active,
           availability_status = excluded.availability_status,
           updated_at = now()
         returning id`,
        [
          slug,
          name,
          category.description || "",
          category.parentId || null,
          category.image || null,
          category.menuSide === "drinks" ? "drinks" : "food",
          index + 1,
          availabilityStatus !== "hidden",
          availabilityStatus
        ]
      );
      categoryIdBySlug[slug] = rows[0].id;
    }

    for (const [index, item] of items.entries()) {
      const slug = String(item.id || "").trim();
      const name = String(item.name || "").trim();
      const availabilityStatus = menuAvailabilityStatus(item);
      const price = item.price === "" || item.price === null || item.price === undefined
        ? 0
        : Number(item.price);
      if (!slug || !name || !Number.isFinite(price) || price < 0) {
        throw requestError("Every menu item needs a key, name, and valid non-negative price.");
      }

      await client.query(
        `insert into public.menu_items
          (slug, category_id, name, description, price, image_url, sort_order, is_available, availability_status, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
         on conflict (slug) do update set
           category_id = excluded.category_id,
           name = excluded.name,
           description = excluded.description,
           price = excluded.price,
           image_url = excluded.image_url,
           sort_order = excluded.sort_order,
           is_available = excluded.is_available,
           availability_status = excluded.availability_status,
           updated_at = now()`,
        [
          slug,
          categoryIdBySlug[item.category] || null,
          name,
          item.description || "",
          price,
          item.image || null,
          index + 1,
          availabilityStatus !== "hidden",
          availabilityStatus
        ]
      );
    }
  });

  return readMenuFromPostgres({ includeInactive: true });
}

export async function readWebsiteDataFromPostgres() {
  const pool = getDbPool();
  if (!pool) return null;

  const [menu, settingsResult, galleryResult] = await Promise.all([
    readMenuFromPostgres(),
    pool.query("select setting_key, setting_value from public.site_settings"),
    pool.query(
      `select id, title, image_url
       from public.gallery_images
       where is_active = true
       order by sort_order, created_at`
    )
  ]);

  return {
    ...menu,
    settings: Object.fromEntries(settingsResult.rows.map((row) => [row.setting_key, row.setting_value])),
    gallery: galleryResult.rows.map((row) => ({
      id: row.id,
      title: row.title || "Gallery image",
      image: row.image_url || ""
    }))
  };
}

export async function listOrdersFromPostgres() {
  const pool = getDbPool();
  if (!pool) return null;

  const { rows } = await pool.query(
    `select o.*,
       coalesce(
         jsonb_agg(
           jsonb_build_object(
             'id', oi.id,
             'menu_item_id', oi.menu_item_id,
             'name', oi.name,
             'quantity', oi.quantity,
             'unit_price', oi.unit_price
           ) order by oi.created_at
         ) filter (where oi.id is not null),
         '[]'::jsonb
       ) as order_items
     from public.orders o
     left join public.order_items oi on oi.order_id = o.id
     group by o.id
     order by o.created_at desc
     limit 300`
  );

  return rows.map(mapOrder);
}

export async function createOrderInPostgres(body) {
  const pool = getDbPool();
  if (!pool) return null;

  return withTransaction(async (client) => {
    const requestedItems = (body.items || []).map((item) => ({
      identifier: String(item.menu_item_id || item.id || "").trim(),
      quantity: Math.max(1, Math.min(99, Number.parseInt(item.quantity, 10) || 1))
    }));
    const identifiers = [...new Set(requestedItems.map((item) => item.identifier).filter(Boolean))];
    if (!identifiers.length) throw requestError("Select at least one valid menu item.");

    const { rows: menuRows } = await client.query(
      `select item.id, item.slug, item.name, item.price
       from public.menu_items item
       join public.menu_categories category on category.id = item.category_id
       left join public.menu_categories parent on parent.slug = category.parent_slug
       where item.is_available = true
         and item.availability_status = 'available'
         and category.is_active = true
         and category.availability_status = 'available'
         and (parent.id is null or (parent.is_active = true and parent.availability_status = 'available'))
         and (item.id::text = any($1::text[]) or item.slug = any($1::text[]))`,
      [identifiers]
    );
    const menuByIdentifier = new Map();
    for (const item of menuRows) {
      menuByIdentifier.set(String(item.id), item);
      menuByIdentifier.set(item.slug, item);
    }

    const validatedItems = requestedItems.map((requested) => {
      const item = menuByIdentifier.get(requested.identifier);
      if (!item) throw requestError("A selected menu item is unavailable. Refresh the waiter menu and try again.");
      return {
        menuItemId: item.id,
        name: item.name,
        quantity: requested.quantity,
        unitPrice: Number(item.price)
      };
    });
    const totalAmount = validatedItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const { rows } = await client.query(
      `insert into public.orders
        (customer_name, phone, email, order_type, table_number, waiter_name, address, notes, status, total_amount, payment_method)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
       returning *`,
      [
        String(body.customer_name || `Table ${body.table_number || ""}`).trim() || "Walk-in customer",
        String(body.phone || "in-person"),
        body.email || null,
        body.order_type === "delivery" ? "delivery" : body.order_type === "takeaway" ? "takeaway" : "dine_in",
        body.table_number ? String(body.table_number) : null,
        body.waiter_name || null,
        body.address || null,
        body.notes || null,
        totalAmount,
        body.payment_method || null
      ]
    );
    const order = rows[0];

    for (const item of validatedItems) {
      await client.query(
        `insert into public.order_items (order_id, menu_item_id, name, quantity, unit_price)
         values ($1, $2, $3, $4, $5)`,
        [order.id, item.menuItemId, item.name, item.quantity, item.unitPrice]
      );
    }

    return mapOrder({
      ...order,
      order_items: validatedItems.map((item) => ({
        menu_item_id: item.menuItemId,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice
      }))
    });
  });
}

export async function updateOrderStatusInPostgres(
  id,
  status,
  { paymentMethod = null, userId = null, cancelReason = "", notes = "" } = {}
) {
  const pool = getDbPool();
  if (!pool) return null;

  const nextStatus = String(status || "").toLowerCase();
  if (!orderStatuses.has(nextStatus)) throw requestError("Invalid order status.");

  return withTransaction(async (client) => {
    const { rows: existingRows } = await client.query(
      "select * from public.orders where id::text = $1 for update",
      [String(id)]
    );
    const existing = existingRows[0];
    if (!existing) throw requestError("Order not found.", 404);
    if (["finished", "cancelled"].includes(existing.status) && nextStatus !== existing.status) {
      throw requestError("Completed and cancelled orders are locked.", 409);
    }
    const normalizedCancelReason = String(cancelReason || "").trim();
    const normalizedNotes = String(notes || "").trim();

    const finishedAt = nextStatus === "finished" ? new Date() : existing.finished_at;
    const paidAt = nextStatus === "finished" ? new Date() : existing.paid_at;
    const cancelledAt = nextStatus === "cancelled" ? new Date() : existing.cancelled_at;
    const { rows } = await client.query(
      `update public.orders
       set status = $2,
           payment_method = coalesce($3, payment_method),
           finished_at = $4,
           paid_at = $5,
           cancel_reason = case when $2 = 'cancelled' then $6 else cancel_reason end,
           cancelled_at = $7,
           notes = case when $2 = 'finished' and $8 <> '' then $8 else notes end,
           updated_at = now()
       where id = $1
       returning *`,
      [
        existing.id,
        nextStatus,
        paymentMethod || null,
        finishedAt,
        paidAt,
        normalizedCancelReason || null,
        cancelledAt,
        normalizedNotes
      ]
    );
    const order = rows[0];

    if (nextStatus === "finished") {
      await client.query(
        `insert into public.income_transactions
          (order_id, category, description, amount, payment_method, transaction_date, created_by)
         values ($1, 'food_sales', $2, $3, $4, current_date, $5)
         on conflict (order_id) do nothing`,
        [
          order.id,
          `Order #${String(order.id).slice(-6)}${order.table_number ? ` - Table ${order.table_number}` : ""}`,
          Number(order.total_amount || 0),
          paymentMethod || order.payment_method || "cash",
          userId && uuidPattern.test(String(userId)) ? userId : null
        ]
      );
    }

    await client.query(
      `insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
       values ($1, 'status_changed', 'order', $2, $3::jsonb)`,
      [
        userId && uuidPattern.test(String(userId)) ? userId : null,
        String(order.id),
        JSON.stringify({
          from: existing.status,
          to: nextStatus,
          ...(normalizedCancelReason ? { reason: normalizedCancelReason } : {})
        })
      ]
    );

    const { rows: itemRows } = await client.query(
      `select id, menu_item_id, name, quantity, unit_price
       from public.order_items
       where order_id = $1
       order by created_at`,
      [order.id]
    );
    return mapOrder({ ...order, order_items: itemRows });
  });
}

