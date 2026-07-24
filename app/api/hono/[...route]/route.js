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
    category: c.req.query("category") || "all",
    paymentMethod: c.req.query("payment_method") || "all",
    search: c.req.query("search") || ""
  };
}

async function financeResponse(c) {
  const denied = requireAdmin(c);
  if (denied) return denied;

  const filters = financeFilters(c);
  const postgresFinance = await readFinanceFromPostgres(filters);
  if (postgresFinance) return c.json(postgresFinance);

  const { from, to, type, category, paymentMethod, search } = filters;
  const state = await getLocalState();
  const inRange = (value) => (!from || value >= from) && (!to || value <= to);
  const matches = (item) =>
    (category === "all" || item.category === category) &&
    (paymentMethod === "all" || item.payment_method === paymentMethod) &&
    (!search || [item.description, item.category, item.payment_method].join(" ").toLowerCase().includes(search.toLowerCase()));
  const income = type === "expense" ? [] : (state.income || []).filter((item) =>
    inRange(String(item.transaction_date || item.created_at).slice(0, 10)) && matches(item)
  );
  const expenses = type === "income" ? [] : (state.expenses || []).filter((item) =>
    item.status !== "voided" &&
    inRange(String(item.expense_date || item.created_at).slice(0, 10)) &&
    matches(item)
  );
  const incomeTotal = income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseCategories = [...new Set(["Ingredients", "Maintenance", "Salaries", "Rent", "Utilities", "Transport", "Marketing", "Other", ...expenses.map((item) => item.category)])];
  return c.json({
    income,
    expenses,
    daily: [],
    paymentBreakdown: [],
    expenseBreakdown: [],
    bestSellers: [],
    expenseCategories,
    totals: { income: incomeTotal, expenses: expenseTotal, profit: incomeTotal - expenseTotal, transactions: income.length + expenses.length },
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
  if (!body.category || !body.description || !Number.isFinite(amount) || amount <= 0) return c.json({ error: "Category, description, and a positive amount are required." }, 400);
  const session = getSessionFromRequest(c.req.raw);
  const postgresExpense = await createPostgresExpense(body, session?.id || null);
  if (postgresExpense) return c.json({ expense: postgresExpense }, 201);
  const state = await getLocalState();
  const expense = {
    id: newId("expense"),
    category: body.category,
    description: body.description,
    amount,
    payment_method: body.payment_method || "cash",
    expense_date: body.expense_date || new Date().toISOString().slice(0, 10),
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
