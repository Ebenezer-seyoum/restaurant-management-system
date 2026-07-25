// @ts-nocheck
import { Hono } from "hono";
import { handle } from "hono/vercel";
import { getSessionFromRequest, isAdminSession } from "@/lib/auth";
import { getLocalState, newId, saveLocalState } from "@/lib/cms";
import {
  createPostgresExpense,
  readFinanceFromPostgres,
  voidPostgresExpense
} from "@/lib/finance-db";

export const runtime = "nodejs";
const app = new Hono().basePath("/api/hono");

app.get("/health", (c) => c.json({ ok: true, service: "emrakel-api" }));

function requireAdmin(c) {
  if (isAdminSession(c.req.raw)) return null;
  return c.json({ error: "Admin access is required." }, 403);
}

function financeFilters(c) {
  return {
    from: c.req.query("from") || "",
    to: c.req.query("to") || "",
    type: c.req.query("type") || "all",
    paymentMethod: c.req.query("payment_method") || "all",
    costType: c.req.query("cost_type") || "all",
    search: c.req.query("search") || ""
  };
}

function allocatedExpenseAmount(item) {
  const amount = Number(item.amount || 0);
  const months = Math.max(1, Number.parseInt(item.allocation_months, 10) || 1);
  return item.cost_type === "long_term" ? amount / months : amount;
}

async function financeResponse(c) {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const filters = financeFilters(c);
  const postgresFinance = await readFinanceFromPostgres(filters);
  if (postgresFinance) return c.json(postgresFinance);

  const { from, to, type, paymentMethod, costType, search } = filters;
  const state = await getLocalState();
  const inRange = (value) => (!from || value >= from) && (!to || value <= to);
  const matches = (item, isExpense = false) =>
    (paymentMethod === "all" || item.payment_method === paymentMethod) &&
    (!isExpense || costType === "all" || (item.cost_type || "variable") === costType) &&
    (!search || [item.description, item.notes, item.payment_method].join(" ").toLowerCase().includes(search.toLowerCase()));
  const income = type === "expense" ? [] : (state.income || []).filter((item) =>
    inRange(String(item.transaction_date || item.created_at).slice(0, 10)) && matches(item)
  );
  const expenses = type === "income" ? [] : (state.expenses || []).filter((item) =>
    item.status !== "voided" &&
    inRange(String(item.expense_date || item.created_at).slice(0, 10)) &&
    matches(item, true)
  );
  const incomeTotal = income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const allocatedExpenseTotal = expenses.reduce((sum, item) => sum + allocatedExpenseAmount(item), 0);
  const fixedExpenseTotal = expenses.filter((item) => item.cost_type === "fixed").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const operatingExpenseTotal = expenses.filter((item) => !["fixed", "long_term"].includes(item.cost_type || "variable")).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return c.json({
    income,
    expenses: expenses.map((item) => ({
      cost_type: "variable",
      recurrence: "one_time",
      allocation_months: 1,
      ...item
    })),
    daily: [],
    paymentBreakdown: [],
    expenseBreakdown: [],
    costTypeBreakdown: [],
    bestSellers: [],
    totals: {
      income: incomeTotal,
      expenses: expenseTotal,
      allocatedExpenses: allocatedExpenseTotal,
      fixedExpenses: fixedExpenseTotal,
      operatingExpenses: operatingExpenseTotal,
      profit: incomeTotal - expenseTotal,
      plannedProfit: incomeTotal - allocatedExpenseTotal,
      transactions: income.length + expenses.length
    },
    source: "local"
  });
}

app.get("/finance", financeResponse);
app.get("/reports", financeResponse);

app.post("/expenses", async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const body = await c.req.json();
  const amount = Number(body.amount);
  if (!body.description || !Number.isFinite(amount) || amount <= 0) return c.json({ error: "Description and a positive amount are required." }, 400);
  if (!["cash", "bank", "telebirr"].includes(String(body.payment_method || "cash"))) {
    return c.json({ error: "Payment method must be cash, bank, or Telebirr." }, 400);
  }
  const costType = String(body.cost_type || "variable");
  const recurrence = String(body.recurrence || "one_time");
  const allowedCostTypes = ["fixed", "variable", "maintenance", "long_term", "other"];
  const allowedRecurrences = ["one_time", "daily", "weekly", "monthly", "yearly"];
  if (!allowedCostTypes.includes(costType)) return c.json({ error: "Select a valid cost type." }, 400);
  if (!allowedRecurrences.includes(recurrence)) return c.json({ error: "Select a valid recurrence." }, 400);
  const session = getSessionFromRequest(c.req.raw);
  const postgresExpense = await createPostgresExpense(body, session?.id || null);
  if (postgresExpense) return c.json({ expense: postgresExpense }, 201);
  const state = await getLocalState();
  const expense = {
    id: newId("expense"),
    category: body.category || costType,
    description: body.description,
    amount,
    payment_method: body.payment_method || "cash",
    expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
    cost_type: costType,
    recurrence,
    allocation_months: Math.max(1, Number.parseInt(body.allocation_months, 10) || 1),
    allocation_start_date: body.allocation_start_date || body.expense_date || new Date().toISOString().slice(0, 10),
    allocation_end_date: body.allocation_end_date || "",
    notes: body.notes || "",
    receipt_url: body.receipt_url || "",
    status: "active",
    created_at: new Date().toISOString()
  };
  await saveLocalState({ ...state, expenses: [expense, ...(state.expenses || [])] });
  return c.json({ expense }, 201);
});

app.patch("/expenses/:id/void", async (c) => {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const session = getSessionFromRequest(c.req.raw);
  if (process.env.DATABASE_URL) {
    const expense = await voidPostgresExpense(c.req.param("id"), session?.id || null);
    if (!expense) return c.json({ error: "Expense not found or already voided." }, 404);
    return c.json({ expense });
  }

  const state = await getLocalState();
  await saveLocalState({ ...state, expenses: (state.expenses || []).map((item) => item.id === c.req.param("id") ? { ...item, status: "voided" } : item) });
  return c.json({ ok: true });
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);

