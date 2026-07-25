// @ts-nocheck
import { badRequest, isEmail, ok } from "@/lib/api";
import { getSessionFromRequest, isWaiterHost } from "@/lib/auth";
import {
  forbidden,
  getLocalState,
  getPublicContent,
  isAdminRequest,
  newId,
  saveLocalState
} from "@/lib/cms";
import {
  createOrderInPostgres,
  listOrdersFromPostgres,
  updateOrderStatusInPostgres
} from "@/lib/restaurant-db";
import { getSupabaseServer } from "@/lib/supabase";

export const runtime = "nodejs";

function canManageOrders(request) {
  return isAdminRequest(request) || isWaiterHost(request);
}

function normalizeOrderType(value) {
  if (value === "delivery") return "delivery";
  if (value === "takeaway" || value === "pickup") return value;
  return "dine_in";
}

export async function GET(request) {
  if (!canManageOrders(request)) return forbidden();

  if (process.env.DATABASE_URL) {
    try {
      const orders = await listOrdersFromPostgres();
      return ok({ orders, source: "postgres" });
    } catch (error) {
      console.error("Unable to read PostgreSQL orders:", error);
      return Response.json({ error: "Unable to load orders." }, { status: 500 });
    }
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    const state = await getLocalState();
    return ok({ orders: state.orders, source: "local" });
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return ok({ orders: data, source: "supabase" });
}

export async function POST(request) {
  if (!canManageOrders(request)) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("A valid order is required.");
  }

  if (!body.customer_name || !body.phone || !Array.isArray(body.items) || body.items.length === 0) {
    return badRequest("Customer name, phone, and at least one order item are required.");
  }
  if (body.email && !isEmail(body.email)) return badRequest("Please enter a valid email address.");

  if (process.env.DATABASE_URL) {
    try {
      const order = await createOrderInPostgres(body);
      return ok({ message: "Order sent successfully.", order, source: "postgres" }, 201);
    } catch (error) {
      console.error("Unable to create PostgreSQL order:", error);
      return Response.json(
        { error: error.message || "Unable to create the order." },
        { status: error.status || 500 }
      );
    }
  }

  const content = await getPublicContent();
  const itemById = new Map((content.items || []).map((item) => [String(item.id), item]));
  const validatedItems = body.items.map((line) => {
    const item = itemById.get(String(line.menu_item_id || line.id || ""));
    const quantity = Math.max(1, Math.min(99, Number.parseInt(line.quantity, 10) || 1));
    return item
      ? { menu_item_id: item.databaseId || item.id, name: item.name, quantity, unit_price: Number(item.price) }
      : null;
  });
  if (validatedItems.some((item) => !item)) {
    return badRequest("A selected menu item is unavailable. Refresh the menu and try again.");
  }
  const totalAmount = validatedItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0
  );
  const order = {
    customer_name: body.customer_name,
    phone: body.phone,
    email: body.email || null,
    order_type: normalizeOrderType(body.order_type),
    table_number: body.table_number || null,
    waiter_name: body.waiter_name || null,
    address: body.address || null,
    notes: body.notes || null,
    payment_method: body.payment_method || "cash",
    status: "pending",
    total_amount: totalAmount
  };

  const supabase = getSupabaseServer();
  if (!supabase) {
    const state = await getLocalState();
    const savedOrder = {
      id: newId("order"),
      ...order,
      items: validatedItems,
      order_items: validatedItems,
      created_at: new Date().toISOString()
    };
    await saveLocalState({ ...state, orders: [savedOrder, ...state.orders] });
    return ok({ message: "Order sent successfully.", order: savedOrder, source: "local" }, 201);
  }

  const { data: savedOrder, error: orderError } = await supabase
    .from("orders")
    .insert(order)
    .select()
    .single();
  if (orderError) return Response.json({ error: orderError.message }, { status: 500 });

  const orderItems = validatedItems.map((item) => ({
    ...item,
    order_id: savedOrder.id,
    menu_item_id: /^[0-9a-f-]{36}$/i.test(String(item.menu_item_id || "")) ? item.menu_item_id : null
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
  if (itemsError) return Response.json({ error: itemsError.message }, { status: 500 });

  return ok(
    {
      message: "Order sent successfully.",
      order: { ...savedOrder, order_items: validatedItems, items: validatedItems },
      source: "supabase"
    },
    201
  );
}

export async function PATCH(request) {
  if (!canManageOrders(request)) return forbidden();

  let body;
  try {
    body = await request.json();
  } catch {
    return badRequest("A valid order update is required.");
  }
  if (!body.id || !body.status) return badRequest("Order id and status are required.");
  const nextStatus = String(body.status || "").toLowerCase();
  if (!["pending", "finished", "cancelled"].includes(nextStatus)) {
    return badRequest("Order status must be pending, finished, or cancelled.");
  }
  const cancelReason = String(body.cancel_reason || "").trim();
  if (nextStatus === "cancelled" && !cancelReason) {
    return badRequest("A cancellation reason is required.");
  }

  if (process.env.DATABASE_URL) {
    try {
      const session = getSessionFromRequest(request);
      const order = await updateOrderStatusInPostgres(body.id, body.status, {
        paymentMethod: body.payment_method || null,
        userId: session?.id || null,
        cancelReason
      });
      return ok({
        message: nextStatus === "finished"
          ? "Order finished and recorded as income."
          : nextStatus === "cancelled"
            ? "Order cancelled with its reason recorded."
            : "Order status updated.",
        order,
        source: "postgres"
      });
    } catch (error) {
      console.error("Unable to update PostgreSQL order:", error);
      return Response.json(
        { error: error.message || "Unable to update the order." },
        { status: error.status || 500 }
      );
    }
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    const state = await getLocalState();
    const existingOrder = state.orders.find((order) => order.id === body.id);
    if (existingOrder && ["finished", "cancelled"].includes(existingOrder.status) && existingOrder.status !== nextStatus) {
      return Response.json({ error: "Completed and cancelled orders are locked." }, { status: 409 });
    }
    const orders = state.orders.map((order) =>
      order.id === body.id
        ? {
            ...order,
            status: nextStatus,
            payment_method: body.payment_method || order.payment_method || "cash",
            finished_at: nextStatus === "finished" ? new Date().toISOString() : order.finished_at,
            cancel_reason: nextStatus === "cancelled" ? cancelReason : order.cancel_reason,
            cancelled_at: nextStatus === "cancelled" ? new Date().toISOString() : order.cancelled_at,
            updated_at: new Date().toISOString()
          }
        : order
    );
    const income = state.income || [];
    const completedOrder = orders.find((item) => item.id === body.id);
    const nextIncome =
      nextStatus === "finished" && !income.some((item) => item.order_id === body.id)
        ? [
            {
              id: newId("income"),
              order_id: body.id,
              category: "food_sales",
              description: `Order ${body.id}`,
              amount: Number(completedOrder?.total_amount || 0),
              payment_method: body.payment_method || "cash",
              transaction_date: new Date().toISOString().slice(0, 10),
              created_at: new Date().toISOString()
            },
            ...income
          ]
        : income;
    await saveLocalState({ ...state, orders, income: nextIncome });
    return ok({ message: "Order updated locally.", order: completedOrder, source: "local" });
  }

  const update = {
    status: nextStatus,
    updated_at: new Date().toISOString()
  };
  if (body.payment_method) update.payment_method = body.payment_method;
  if (nextStatus === "finished") {
    update.finished_at = new Date().toISOString();
    update.paid_at = new Date().toISOString();
  }
  if (nextStatus === "cancelled") {
    update.cancel_reason = cancelReason;
    update.cancelled_at = new Date().toISOString();
  }
  const { data, error } = await supabase
    .from("orders")
    .update(update)
    .eq("id", body.id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  if (nextStatus === "finished" && data) {
    const { error: incomeError } = await supabase.from("income_transactions").upsert(
      {
        order_id: data.id,
        category: "food_sales",
        description: `Order ${data.id}`,
        amount: Number(data.total_amount || 0),
        payment_method: body.payment_method || data.payment_method || "cash",
        transaction_date: new Date().toISOString().slice(0, 10)
      },
      { onConflict: "order_id", ignoreDuplicates: true }
    );
    if (incomeError) return Response.json({ error: incomeError.message }, { status: 500 });
  }

  return ok({
    message: nextStatus === "cancelled" ? "Order cancelled with its reason recorded." : "Order updated.",
    order: data,
    source: "supabase"
  });
}

