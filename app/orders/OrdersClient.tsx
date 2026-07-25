// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { menuCategories, menuItems } from "@/lib/data";

const money = (value) =>
  `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
const statusFlow = {
  pending: { label: "Pending", icon: "◷" },
  finished: { label: "Finished", icon: "✓" },
  cancelled: { label: "Cancelled", icon: "×" }
};
const statuses = Object.keys(statusFlow);
const legacyProductImagePlaceholders = new Set([
  "/logo.png",
  "/uploads/house/menu-board-reference.jpg"
]);

function resolvedMenuImage(item, section) {
  const productImage = String(item?.image || "").trim();
  const sectionImage = String(section?.image || "").trim();
  const hasRealProductImage = productImage && !legacyProductImagePlaceholders.has(productImage);
  return hasRealProductImage ? productImage : sectionImage || productImage || "/logo.png";
}

function orderLines(order) {
  return order.order_items || order.items || [];
}

function elapsedTime(value) {
  if (!value) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

export default function OrdersClient() {
  const [table, setTable] = useState("1");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [liveCategories, setLiveCategories] = useState(menuCategories);
  const [liveItems, setLiveItems] = useState(menuItems);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [online, setOnline] = useState(true);
  const [cancelOrder, setCancelOrder] = useState(null);
  const [cancelReason, setCancelReason] = useState("");

  async function loadMenu() {
    try {
      const response = await fetch("/api/menu", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (Array.isArray(data.categories) && Array.isArray(data.items)) {
        setLiveCategories(data.categories);
        setLiveItems(data.items);
      }
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }

  async function loadOrders() {
    try {
      const response = await fetch("/api/orders", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setOrders((await response.json()).orders || []);
      setOnline(true);
    } catch {
      setOnline(false);
    }
  }

  useEffect(() => {
    loadMenu();
    loadOrders();
    const timer = window.setInterval(() => {
      loadMenu();
      loadOrders();
    }, 12_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeCategories = useMemo(
    () => liveCategories.filter((item) => item.isActive !== false),
    [liveCategories]
  );
  const rootCategories = useMemo(
    () => activeCategories.filter((item) => !item.parentId),
    [activeCategories]
  );
  const menuSections = useMemo(
    () =>
      rootCategories.flatMap((root) => {
        const children = activeCategories.filter((item) => item.parentId === root.id);
        return children.length ? children : [root];
      }),
    [activeCategories, rootCategories]
  );
  const visibleSections = useMemo(() => {
    const query = search.trim().toLowerCase();
    return menuSections
      .filter(
        (section) =>
          category === "all" ||
          section.id === category ||
          section.parentId === category
      )
      .map((section) => ({
        ...section,
        items: liveItems.filter((item) => {
          if (item.category !== section.id || item.isActive === false) return false;
          return !query || [item.name, item.description].join(" ").toLowerCase().includes(query);
        })
      }))
      .filter((section) => section.items.length);
  }, [category, liveItems, menuSections, search]);
  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );
  const visibleOrders = orders.filter(
    (order) => String(order.status || "pending") === statusFilter
  );
  const counts = Object.fromEntries(
    statuses.map((status) => [status, orders.filter((order) => order.status === status).length])
  );

  function add(item, section) {
    const orderItem = { ...item, image: resolvedMenuImage(item, section) };
    setCart((current) =>
      current.some((line) => line.id === orderItem.id)
        ? current.map((line) =>
            line.id === orderItem.id ? { ...line, quantity: line.quantity + 1 } : line
          )
        : [...current, { ...orderItem, quantity: 1 }]
    );
    setMessage(`${orderItem.name} added to Table ${table}.`);
  }

  function change(id, delta) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  async function submit() {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    setMessage("Submitting order...");
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: `Table ${table}`,
          phone: "in-person",
          order_type: "dine_in",
          table_number: table,
          notes,
          payment_method: paymentMethod,
          items: cart.map((item) => ({
            menu_item_id: item.databaseId || item.id,
            quantity: item.quantity
          }))
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to submit order.");

      setMessage(`Order submitted for Table ${table}.`);
      setCart([]);
      setNotes("");
      setStatusFilter("pending");
      await loadOrders();
    } catch (error) {
      setMessage(error.message || "Unable to submit order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(order, nextStatus, reason = "") {
    setMessage("Updating order...");
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: order.id,
        status: nextStatus,
        payment_method: order.payment_method || paymentMethod,
        cancel_reason: reason
      })
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to update order.");
      return;
    }
    setMessage(
      nextStatus === "finished"
        ? "Order finished. The total was added to income once."
        : nextStatus === "cancelled"
          ? "Order cancelled and the reason was recorded."
          : `Order moved to ${statusFlow[nextStatus].label}.`
    );
    setCancelOrder(null);
    setCancelReason("");
    await loadOrders();
  }

  async function confirmCancellation(event) {
    event.preventDefault();
    if (!cancelOrder || !cancelReason.trim()) return;
    await updateStatus(cancelOrder, "cancelled", cancelReason.trim());
  }

  return (
    <section className="waiterWorkspace">
      <header className="waiterTopbar">
        <div className="waiterBrand">
          <img src="/logo.png" alt="" />
          <div>
            <strong>EMRAKEL</strong>
            <small>Burger, Pizza & Cocktail House</small>
          </div>
        </div>
        <div className="waiterPageTitle">
          <span>Restaurant service</span>
          <h1>Waiter Orders</h1>
        </div>
        <label className="tablePicker">
          <span>Table</span>
          <select value={table} onChange={(event) => setTable(event.target.value)}>
            {Array.from({ length: 20 }, (_, index) => (
              <option key={index + 1} value={index + 1}>Table {index + 1}</option>
            ))}
          </select>
        </label>
        <span className={`liveIndicator ${online ? "" : "offline"}`}>
          <i /> {online ? "Live" : "Offline"}
        </span>
      </header>

      <div className="waiterLayout">
        <main className="waiterMenuArea">
          <div className="waiterMenuToolbar">
            <div className="waiterCategoryTabs">
              <button
                className={category === "all" ? "active" : ""}
                onClick={() => setCategory("all")}
                type="button"
              >
                <span>▦</span> All
              </button>
              {rootCategories.map((item) => (
                <button
                  className={category === item.id ? "active" : ""}
                  key={item.id}
                  onClick={() => setCategory(item.id)}
                  type="button"
                >
                  {item.name}
                </button>
              ))}
            </div>
            <label className="waiterSearch">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search menu"
              />
            </label>
          </div>

          {visibleSections.length ? visibleSections.map((section) => (
            <section className="waiterMenuSection" key={section.id}>
              <div className="waiterSectionHeading">
                <div>
                  <span className="waiterSectionIcon">◆</span>
                  <h2>{section.name}</h2>
                </div>
                <p>{section.description}</p>
                <span>{section.items.length} items</span>
              </div>
              <div className="waiterItemGrid">
                {section.items.map((item) => (
                  <article className="waiterItemCard" key={item.id}>
                    <button
                      className="waiterItemImageButton"
                      onClick={() => add(item, section)}
                      type="button"
                      aria-label={`Add ${item.name}`}
                    >
                      <img src={resolvedMenuImage(item, section)} alt="" />
                    </button>
                    <div className="waiterItemInfo">
                      <h3>{item.name}</h3>
                      <p>{item.description || "Freshly prepared at EMRAKEL."}</p>
                      <div>
                        <strong>{money(item.price)}</strong>
                        <button className="waiterAddButton" onClick={() => add(item, section)} type="button">
                          Add
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )) : (
            <div className="waiterNoResults">
              <strong>No menu items found</strong>
              <span>Try another category or search term.</span>
            </div>
          )}
        </main>

        <aside className="waiterSidePanel">
          <section className="waiterCurrentOrder">
            <div className="waiterPanelHeading">
              <div>
                <span>▣</span>
                <h2>Current Order</h2>
              </div>
              <strong>Table {table}</strong>
            </div>
            <div className="waiterCartList">
              {cart.length ? cart.map((item) => (
                <div className="waiterCartLine" key={item.id}>
                  <img src={item.image || "/logo.png"} alt="" />
                  <div className="waiterCartName">
                    <strong>{item.name}</strong>
                    <span>{money(item.price)} each</span>
                  </div>
                  <div className="waiterQuantity">
                    <button onClick={() => change(item.id, -1)} type="button">−</button>
                    <b>{item.quantity}</b>
                    <button onClick={() => change(item.id, 1)} type="button">+</button>
                  </div>
                  <strong className="waiterLineTotal">{money(item.price * item.quantity)}</strong>
                </div>
              )) : (
                <div className="waiterEmpty">
                  <span>▣</span>
                  <strong>No items selected</strong>
                  <p>Choose a menu item to start the order.</p>
                </div>
              )}
            </div>
            <div className="waiterOrderOptions">
              <label>
                Payment
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank transfer</option>
                  <option value="telebirr">Telebirr</option>
                </select>
              </label>
              <label>
                Note
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="No onions, takeaway..." />
              </label>
            </div>
            <div className="waiterSubtotal">
              <span>Subtotal</span>
              <strong>{money(total)}</strong>
            </div>
            <div className="waiterTotal">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>
            <button
              className="waiterSubmitButton"
              disabled={!cart.length || submitting}
              onClick={submit}
              type="button"
            >
              <span>▣</span> {submitting ? "Submitting..." : "Submit Order"}
            </button>
            {message ? <p className="waiterMessage" role="status">{message}</p> : null}
          </section>

          <section className="waiterQueue">
            <div className="waiterStatusTabs">
              {statuses.map((status) => (
                <button
                  className={statusFilter === status ? "active" : ""}
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  type="button"
                >
                  <span>{statusFlow[status].icon}</span>
                  {statusFlow[status].label}
                  {counts[status] ? <small>{counts[status]}</small> : null}
                </button>
              ))}
            </div>
            <div className="waiterQueueList">
              {visibleOrders.length ? visibleOrders.map((order) => {
                const flow = statusFlow[order.status] || statusFlow.pending;
                return (
                  <article className="waiterQueueCard" key={order.id}>
                    <div className="waiterQueueNumber">
                      <b>#{String(order.id).slice(-4).toUpperCase()}</b>
                      <span>Table {order.table_number || "-"}</span>
                    </div>
                    <div className="waiterQueueDetails">
                      <strong>
                        {orderLines(order).map((item) => `${item.name} ×${item.quantity}`).join(", ")}
                      </strong>
                      <span>{order.notes || "No special notes"}</span>
                      <small>{elapsedTime(order.created_at)}</small>
                    </div>
                    <div className="waiterQueueTotal">
                      <strong>{money(order.total_amount)}</strong>
                      <span>{order.payment_method || "cash"}</span>
                    </div>
                    {order.status === "pending" ? (
                      <div className="waiterOrderActions">
                        <button
                          className="waiterCancelButton"
                          onClick={() => {
                            setCancelOrder(order);
                            setCancelReason("");
                          }}
                          type="button"
                        >
                          × Cancel
                        </button>
                        <button
                          className="waiterFinishButton status-pending"
                          onClick={() => updateStatus(order, "finished")}
                          type="button"
                        >
                          ✓ Finish
                        </button>
                      </div>
                    ) : order.status === "cancelled" ? (
                      <span className="waiterCancelledLabel">× {order.cancel_reason || "Cancelled"}</span>
                    ) : (
                      <span className="waiterCompletedLabel">✓ Recorded in income</span>
                    )}
                  </article>
                );
              }) : <p className="waiterEmptyQueue">No {statusFlow[statusFilter].label.toLowerCase()} orders.</p>}
            </div>
          </section>
        </aside>
      </div>
      {cancelOrder ? (
        <div className="adminModalBackdrop" role="presentation" onMouseDown={() => setCancelOrder(null)}>
          <form
            className="adminModalCard waiterCancelModal"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={confirmCancellation}
          >
            <div>
              <p className="eyebrow">Cancel order</p>
              <h2>Why is this order cancelled?</h2>
              <p>Table {cancelOrder.table_number || "-"} · {money(cancelOrder.total_amount)}</p>
            </div>
            <label>
              Cancellation reason
              <textarea
                autoFocus
                required
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                placeholder="Write the reason before cancelling"
              />
            </label>
            <div className="adminModalActions">
              <button className="button buttonLine" type="button" onClick={() => setCancelOrder(null)}>Keep order</button>
              <button className="button buttonDark" type="submit">Cancel order</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

