// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  ChefHat,
  CircleOff,
  Clock3,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  Store,
  Trash2,
  Utensils,
  Wifi,
  WifiOff,
  X,
  XCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { menuCategories, menuItems } from "@/lib/data";
import {
  effectiveProductAvailability,
  effectiveSectionAvailability
} from "@/lib/menu-availability";

const money = (value) =>
  `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;

const paymentOptions = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank transfer" },
  { value: "telebirr", label: "Telebirr" }
];
const legacyProductImagePlaceholders = new Set([
  "/logo.png",
  "/uploads/house/menu-board-reference.jpg"
]);

function resolvedMenuImage(item, section) {
  const productImage = String(item?.image || "").trim();
  const sectionImage = String(section?.image || "").trim();
  const hasRealProductImage =
    productImage && !legacyProductImagePlaceholders.has(productImage);

  return hasRealProductImage
    ? productImage
    : sectionImage || productImage || "/logo.png";
}

function orderLines(order) {
  return order.order_items || order.items || [];
}

function elapsedTime(value) {
  if (!value) return "";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(value).getTime()) / 60_000)
  );
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hr${hours === 1 ? "" : "s"} ago`;
}

function paymentLabel(value) {
  return (
    paymentOptions.find((item) => item.value === String(value || "").toLowerCase())
      ?.label || "Awaiting payment"
  );
}

export default function OrdersClient() {
  const [table, setTable] = useState("1");
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [liveCategories, setLiveCategories] = useState(menuCategories);
  const [liveItems, setLiveItems] = useState(menuItems);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [online, setOnline] = useState(true);
  const [finishOrder, setFinishOrder] = useState(null);
  const [finishPayment, setFinishPayment] = useState("cash");
  const [finishNote, setFinishNote] = useState("");
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
        const children = activeCategories.filter(
          (item) => item.parentId === root.id
        );
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
          return (
            !query ||
            [item.name, item.description]
              .join(" ")
              .toLowerCase()
              .includes(query)
          );
        })
      }))
      .filter((section) => section.items.length);
  }, [category, liveItems, menuSections, search]);

  const total = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );
  const pendingOrders = orders.filter(
    (order) => String(order.status || "pending") === "pending"
  );

  function add(item, section) {
    if (
      effectiveProductAvailability(item, section, activeCategories) !==
      "available"
    ) {
      setMessage(`${item.name} is coming soon and cannot be ordered yet.`);
      return;
    }
    const orderItem = { ...item, image: resolvedMenuImage(item, section) };
    setCart((current) =>
      current.some((line) => line.id === orderItem.id)
        ? current.map((line) =>
            line.id === orderItem.id
              ? { ...line, quantity: line.quantity + 1 }
              : line
          )
        : [...current, { ...orderItem, quantity: 1 }]
    );
    setMessage(`${orderItem.name} added to Table ${table}.`);
  }

  function change(id, delta) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === id
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function remove(id) {
    const removed = cart.find((item) => item.id === id);
    setCart((current) => current.filter((item) => item.id !== id));
    setMessage(removed ? `${removed.name} removed from the order.` : "");
  }

  async function submit() {
    if (!cart.length || submitting) return;
    setSubmitting(true);
    setMessage("Sending order to the kitchen...");

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: `Table ${table}`,
          phone: "in-person",
          order_type: "dine_in",
          table_number: table,
          items: cart.map((item) => ({
            menu_item_id: item.databaseId || item.id,
            quantity: item.quantity
          }))
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to submit order.");
      }

      setMessage(`Table ${table} order sent successfully.`);
      setCart([]);
      await loadOrders();
    } catch (error) {
      setMessage(error.message || "Unable to submit order.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateStatus(
    order,
    nextStatus,
    { paymentMethod = "", notes = "", cancelReason = "" } = {}
  ) {
    const busyKey = `${order.id}:${nextStatus}`;
    if (actionBusy) return false;
    setActionBusy(busyKey);
    setMessage(
      nextStatus === "finished" ? "Finishing order..." : "Cancelling order..."
    );

    try {
      const response = await fetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: order.id,
          status: nextStatus,
          ...(paymentMethod ? { payment_method: paymentMethod } : {}),
          ...(notes ? { notes } : {}),
          ...(cancelReason ? { cancel_reason: cancelReason } : {})
        })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to update order.");
      }

      setMessage(
        nextStatus === "finished"
          ? "Order finished and recorded as income."
          : "Order cancelled."
      );
      setOrders((current) =>
        current.filter((currentOrder) => String(currentOrder.id) !== String(order.id))
      );
      await loadOrders();
      return true;
    } catch (error) {
      setMessage(error.message || "Unable to update order.");
      return false;
    } finally {
      setActionBusy("");
    }
  }

  function openFinishDialog(order) {
    setFinishOrder(order);
    setFinishPayment(
      paymentOptions.some((option) => option.value === order.payment_method)
        ? order.payment_method
        : "cash"
    );
    setFinishNote(order.notes || "");
  }

  async function confirmFinish(event) {
    event.preventDefault();
    if (!finishOrder || !finishPayment) return;
    const updated = await updateStatus(finishOrder, "finished", {
      paymentMethod: finishPayment,
      notes: finishNote.trim()
    });
    if (updated) {
      setFinishOrder(null);
      setFinishNote("");
    }
  }

  async function confirmCancellation(event) {
    event.preventDefault();
    if (!cancelOrder) return;
    const updated = await updateStatus(cancelOrder, "cancelled", {
      cancelReason: cancelReason.trim()
    });
    if (updated) {
      setCancelOrder(null);
      setCancelReason("");
    }
  }

  return (
    <section className="waiterWorkspace waiterShadcnWorkspace">
      <Card className="waiterTopbar waiterShadcnTopbar">
        <div className="waiterBrand">
          <img src="/logo.png" alt="EMRAKEL" />
          <div>
            <strong>EMRAKEL</strong>
            <small>Burger, Pizza & Cocktail House</small>
          </div>
        </div>

        <div className="waiterPageTitle">
          <span>Restaurant service</span>
          <h1>Waiter Orders</h1>
        </div>

        <div className="waiterTableControl">
          <Label htmlFor="waiter-table">Serving table</Label>
          <Select value={table} onValueChange={setTable}>
            <SelectTrigger id="waiter-table" aria-label="Serving table">
              <SelectValue placeholder="Select a table">
                Table {table}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 20 }, (_, index) => (
                <SelectItem key={index + 1} value={String(index + 1)}>
                  Table {index + 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Badge
          className="waiterLiveBadge"
          variant={online ? "success" : "destructive"}
        >
          {online ? <Wifi size={14} /> : <WifiOff size={14} />}
          {online ? "Live" : "Offline"}
        </Badge>
      </Card>

      <div className="waiterLayout waiterShadcnLayout">
        <Card className="waiterMenuArea waiterShadcnMenu">
          <CardHeader className="waiterMenuToolbar">
            <Tabs
              className="waiterCategoryTabs"
              value={category}
              onValueChange={setCategory}
            >
              <TabsList>
                <TabsTrigger value="all">
                  <Utensils size={16} /> All
                </TabsTrigger>
                {rootCategories.map((item) => (
                  <TabsTrigger key={item.id} value={item.id}>
                    {item.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="ui-input-with-icon waiterSearch">
              <Search size={17} />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search dishes and drinks..."
                aria-label="Search menu"
              />
            </div>
          </CardHeader>

          <CardContent className="waiterMenuContent">
            {visibleSections.length ? (
              visibleSections.map((section) => (
                <section className="waiterMenuSection" key={section.id}>
                  <div className="waiterSectionHeading">
                    <div>
                      <span className="waiterSectionIcon">
                        <ChefHat size={17} />
                      </span>
                      <div>
                        <h2>{section.name}</h2>
                        {section.description ? (
                          <p>{section.description}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="waiterSectionBadges">
                      {effectiveSectionAvailability(section, activeCategories) ===
                      "coming_soon" ? (
                        <Badge variant="warning">Coming Soon</Badge>
                      ) : null}
                      <Badge variant="secondary">
                        {section.items.length}{" "}
                        {section.items.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                  </div>

                  <div className="waiterItemGrid">
                    {section.items.map((item) => {
                      const itemStatus = effectiveProductAvailability(
                        item,
                        section,
                        activeCategories
                      );
                      const comingSoon = itemStatus === "coming_soon";
                      return (
                      <Card className={`waiterItemCard ${comingSoon ? "isComingSoon" : ""}`} key={item.id}>
                        <button
                          className="waiterItemImageButton"
                          onClick={() => add(item, section)}
                          type="button"
                          disabled={comingSoon}
                          aria-label={`Add ${item.name}`}
                        >
                          <img
                            src={resolvedMenuImage(item, section)}
                            alt={item.name}
                          />
                          <span className={`waiterImageAddHint ${comingSoon ? "comingSoon" : ""}`}>
                            {comingSoon ? (
                              <><Clock3 size={15} /> Coming Soon</>
                            ) : (
                              <><Plus size={15} /> Add to order</>
                            )}
                          </span>
                        </button>
                        <CardContent className="waiterItemInfo">
                          <div>
                            <h3>{item.name}</h3>
                            <p>
                              {item.description ||
                                "Freshly prepared at EMRAKEL."}
                            </p>
                          </div>
                          <div className="waiterItemFooter">
                            {comingSoon ? (
                              <Badge variant="warning">Coming Soon</Badge>
                            ) : (
                              <strong>{money(item.price)}</strong>
                            )}
                            <Button
                              variant={comingSoon ? "secondary" : "gold"}
                              size="sm"
                              onClick={() => add(item, section)}
                              disabled={comingSoon}
                              type="button"
                            >
                              {comingSoon ? (
                                <><Clock3 size={15} /> Coming Soon</>
                              ) : (
                                <><Plus size={15} /> Add</>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                    })}
                  </div>
                </section>
              ))
            ) : (
              <div className="waiterNoResults">
                <CircleOff size={30} />
                <strong>No menu items found</strong>
                <span>Try another category or search term.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="waiterSidePanel waiterShadcnSidePanel">
          <Card className="waiterCurrentOrder">
            <CardHeader className="waiterPanelHeading">
              <div>
                <span className="waiterPanelIcon">
                  <ShoppingBasket size={18} />
                </span>
                <div>
                  <CardTitle>Current Order</CardTitle>
                  <CardDescription>
                    Review items before sending them.
                  </CardDescription>
                </div>
              </div>
              <Badge variant="warning">Table {table}</Badge>
            </CardHeader>

            <CardContent className="waiterCurrentContent">
              <ScrollArea className="waiterCartScroll">
                <div className="waiterCartList">
                  {cart.length ? (
                    cart.map((item) => (
                      <div className="waiterCartLine" key={item.id}>
                        <img src={item.image || "/logo.png"} alt={item.name} />
                        <div className="waiterCartName">
                          <strong>{item.name}</strong>
                          <span>{money(item.price)} each</span>
                        </div>
                        <Button
                          className="waiterRemoveButton"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(item.id)}
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          title={`Remove ${item.name}`}
                        >
                          <X size={16} />
                        </Button>
                        <div className="waiterCartControls">
                          <div className="waiterQuantity">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => change(item.id, -1)}
                              type="button"
                              aria-label={`Decrease ${item.name}`}
                            >
                              <Minus size={14} />
                            </Button>
                            <b>{item.quantity}</b>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => change(item.id, 1)}
                              type="button"
                              aria-label={`Increase ${item.name}`}
                            >
                              <Plus size={14} />
                            </Button>
                          </div>
                          <strong className="waiterLineTotal">
                            {money(item.price * item.quantity)}
                          </strong>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="waiterEmpty">
                      <ShoppingBasket size={29} />
                      <strong>Your order is empty</strong>
                      <p>Select a menu item to begin Table {table}&apos;s order.</p>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <Separator />
              <div className="waiterOrderTotals">
                <div className="waiterSubtotal">
                  <span>Items</span>
                  <strong>
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </strong>
                </div>
                <div className="waiterTotal">
                  <span>Total</span>
                  <strong>{money(total)}</strong>
                </div>
              </div>
            </CardContent>

            <CardFooter className="waiterSubmitFooter">
              <Button
                className="waiterSubmitButton"
                variant="gold"
                size="lg"
                disabled={!cart.length || submitting}
                onClick={submit}
                type="button"
              >
                <ReceiptText size={18} />
                {submitting ? "Sending..." : "Send order to kitchen"}
              </Button>
              {message ? (
                <p className="waiterMessage" role="status">
                  {message}
                </p>
              ) : null}
            </CardFooter>
          </Card>

          <Card className="waiterQueue">
            <CardHeader className="waiterQueueHeader">
              <div>
                <CardTitle>Pending Orders</CardTitle>
                <CardDescription>
                  Finish or cancel active table orders.
                </CardDescription>
              </div>
              <Badge className="waiterPendingCount" variant="warning">
                <Clock3 size={13} />
                {pendingOrders.length} pending
              </Badge>
            </CardHeader>

            <ScrollArea className="waiterQueueScroll">
              <CardContent className="waiterQueueList">
                {pendingOrders.length ? (
                  pendingOrders.map((order) => {
                    const isUpdating = actionBusy.startsWith(`${order.id}:`);

                    return (
                      <Card className="waiterQueueCard" key={order.id}>
                        <CardHeader className="waiterQueueCardHeader">
                          <div className="waiterQueueIdentity">
                            <span className="waiterQueueNumber">
                              <Store size={15} />
                              <b>
                                #{String(order.id).slice(-4).toUpperCase()}
                              </b>
                            </span>
                            <div>
                              <strong>Table {order.table_number || "-"}</strong>
                              <small>
                                <Clock3 size={12} />
                                {elapsedTime(order.created_at)}
                              </small>
                            </div>
                          </div>
                          <Badge variant="warning">
                            <Clock3 size={13} /> Pending
                          </Badge>
                        </CardHeader>

                        <CardContent className="waiterQueueCardContent">
                          <div className="waiterQueueItems">
                            {orderLines(order).map((item, index) => (
                              <div key={item.id || `${item.name}-${index}`}>
                                <span>{item.name}</span>
                                <strong>×{item.quantity}</strong>
                              </div>
                            ))}
                          </div>

                          <Separator />

                          <div className="waiterQueueMeta">
                            <div>
                              <span>Total</span>
                              <strong>{money(order.total_amount)}</strong>
                            </div>
                            <div>
                              <span>Payment</span>
                              <strong>Select when finishing</strong>
                            </div>
                          </div>

                          {order.notes ? (
                            <p className="waiterOrderNote">
                              <ReceiptText size={14} />
                              {order.notes}
                            </p>
                          ) : null}
                        </CardContent>

                        <CardFooter className="waiterOrderActions">
                          <Button
                            variant="destructive"
                            disabled={isUpdating}
                            onClick={() => {
                              setCancelOrder(order);
                              setCancelReason("");
                            }}
                            type="button"
                          >
                            <Trash2 size={15} /> Cancel
                          </Button>
                          <Button
                            variant="success"
                            disabled={isUpdating}
                            onClick={() => openFinishDialog(order)}
                            type="button"
                          >
                            <Check size={16} /> Finish
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })
                ) : (
                  <div className="waiterEmptyQueue">
                    <CheckCircle2 size={27} />
                    <strong>No pending orders</strong>
                    <span>New table orders will appear here.</span>
                  </div>
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </aside>
      </div>

      <Dialog
        open={Boolean(finishOrder)}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setFinishOrder(null);
        }}
      >
        <DialogContent className="waiterDecisionDialog">
          <form onSubmit={confirmFinish}>
            <DialogHeader className="waiterDecisionHeader">
              <span className="waiterDecisionIcon finish">
                <CheckCircle2 size={29} />
              </span>
              <div>
                <p className="eyebrow">Finish order</p>
                <DialogTitle>Complete this table order?</DialogTitle>
                <DialogDescription>
                  Select how the customer paid. The total will be recorded as
                  income after confirmation.
                </DialogDescription>
              </div>
            </DialogHeader>

            {finishOrder ? (
              <div className="waiterDialogSummary">
                <span>Table {finishOrder.table_number || "-"}</span>
                <strong>{money(finishOrder.total_amount)}</strong>
              </div>
            ) : null}

            <div className="waiterDialogFields">
              <div className="ui-field">
                <Label htmlFor="finish-payment">
                  Payment method <span aria-hidden="true">*</span>
                </Label>
                <Select
                  value={finishPayment}
                  onValueChange={setFinishPayment}
                >
                  <SelectTrigger id="finish-payment">
                    <SelectValue placeholder="Select payment method">
                      {paymentLabel(finishPayment)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {paymentOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ui-field">
                <Label htmlFor="finish-note">
                  Order note <span className="waiterOptional">Optional</span>
                </Label>
                <Textarea
                  id="finish-note"
                  value={finishNote}
                  onChange={(event) => setFinishNote(event.target.value)}
                  placeholder="Add a payment or service note..."
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                disabled={Boolean(actionBusy)}
                onClick={() => setFinishOrder(null)}
              >
                Cancel
              </Button>
              <Button
                variant="success"
                type="submit"
                disabled={!finishPayment || Boolean(actionBusy)}
              >
                <CheckCircle2 size={16} />
                {actionBusy ? "Finishing..." : "Confirm finish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelOrder)}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setCancelOrder(null);
        }}
      >
        <DialogContent className="waiterDecisionDialog">
          <form onSubmit={confirmCancellation}>
            <DialogHeader className="waiterDecisionHeader">
              <span className="waiterDecisionIcon cancel">
                <XCircle size={29} />
              </span>
              <div>
                <p className="eyebrow">Cancel order</p>
                <DialogTitle>Cancel this table order?</DialogTitle>
                <DialogDescription>
                  The order will be locked and excluded from finished-order
                  income.
                </DialogDescription>
              </div>
            </DialogHeader>

            {cancelOrder ? (
              <div className="waiterDialogSummary cancel">
                <span>Table {cancelOrder.table_number || "-"}</span>
                <strong>{money(cancelOrder.total_amount)}</strong>
              </div>
            ) : null}

            <div className="waiterDialogFields">
              <div className="ui-field">
                <Label htmlFor="cancel-reason">
                  Cancellation reason{" "}
                  <span className="waiterOptional">Optional</span>
                </Label>
                <Textarea
                  id="cancel-reason"
                  autoFocus
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                  placeholder="Add a reason if needed..."
                  maxLength={500}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                disabled={Boolean(actionBusy)}
                onClick={() => setCancelOrder(null)}
              >
                Keep order
              </Button>
              <Button
                variant="destructive"
                type="submit"
                disabled={Boolean(actionBusy)}
              >
                <XCircle size={16} />
                {actionBusy ? "Cancelling..." : "Confirm cancellation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
