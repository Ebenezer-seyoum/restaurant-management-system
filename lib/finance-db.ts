// @ts-nocheck
import { getDbPool, withTransaction } from "@/lib/db";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getFinancePool() {
  return getDbPool();
}

function buildFilters(filters, type) {
  const params = [];
  const clauses = [];
  const dateColumn = type === "income" ? "transaction_date" : "expense_date";

  if (filters.from) {
    params.push(filters.from);
    clauses.push(`${dateColumn} >= $${params.length}::date`);
  }
  if (filters.to) {
    params.push(filters.to);
    clauses.push(`${dateColumn} <= $${params.length}::date`);
  }
  if (filters.paymentMethod && filters.paymentMethod !== "all") {
    params.push(filters.paymentMethod);
    clauses.push(`payment_method = $${params.length}`);
  }
  if (filters.search) {
    params.push(`%${filters.search}%`);
    const searchColumns = [
      `description ilike $${params.length}`,
      `payment_method ilike $${params.length}`
    ];
    if (type === "expense") {
      searchColumns.push(`coalesce(notes, '') ilike $${params.length}`);
    }
    clauses.push(`(${searchColumns.join(" or ")})`);
  }

  return {
    params,
    sql: clauses.length ? ` and ${clauses.join(" and ")}` : ""
  };
}

function addAmount(target, key, amount, labelKey = "label") {
  const found = target.find((item) => item[labelKey] === key);
  if (found) found.amount += amount;
  else target.push({ [labelKey]: key, amount });
}

function summarize(income, expenses) {
  const dailyMap = new Map();
  const paymentBreakdown = [];
  const expenseBreakdown = [];

  for (const item of income) {
    const date = String(item.transaction_date).slice(0, 10);
    const day = dailyMap.get(date) || { date, income: 0, expenses: 0, profit: 0 };
    day.income += Number(item.amount || 0);
    dailyMap.set(date, day);
    addAmount(paymentBreakdown, item.payment_method || "other", Number(item.amount || 0));
  }
  for (const item of expenses) {
    const date = String(item.expense_date).slice(0, 10);
    const day = dailyMap.get(date) || { date, income: 0, expenses: 0, profit: 0 };
    day.expenses += Number(item.amount || 0);
    dailyMap.set(date, day);
    addAmount(expenseBreakdown, item.category || "Other", Number(item.amount || 0));
  }

  const daily = [...dailyMap.values()]
    .map((day) => ({ ...day, profit: day.income - day.expenses }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const incomeTotal = income.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    daily,
    paymentBreakdown: paymentBreakdown.sort((a, b) => b.amount - a.amount),
    expenseBreakdown: expenseBreakdown.sort((a, b) => b.amount - a.amount),
    totals: {
      income: incomeTotal,
      expenses: expenseTotal,
      profit: incomeTotal - expenseTotal,
      transactions: income.length + expenses.length
    }
  };
}

async function readBestSellers(db, { from, to } = {}) {
  const params = [];
  const clauses = ["o.status = 'finished'"];
  if (from) {
    params.push(from);
    clauses.push(`coalesce(o.finished_at, o.created_at)::date >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    clauses.push(`coalesce(o.finished_at, o.created_at)::date <= $${params.length}::date`);
  }

  const { rows } = await db.query(
    `select oi.name,
            sum(oi.quantity)::integer as quantity,
            sum(oi.quantity * oi.unit_price)::numeric(12,2) as revenue
     from public.order_items oi
     join public.orders o on o.id = oi.order_id
     where ${clauses.join(" and ")}
     group by oi.name
     order by revenue desc
     limit 10`,
    params
  );
  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity || 0),
    revenue: Number(row.revenue || 0)
  }));
}

export async function readFinanceFromPostgres(filters = {}) {
  const db = getDbPool();
  if (!db) return null;

  const type = filters.type || "all";
  const incomeFilters = buildFilters(filters, "income");
  const expenseFilters = buildFilters(filters, "expense");
  const shouldReadIncome = type === "all" || type === "income";
  const shouldReadExpenses = type === "all" || type === "expense";

  const [incomeResult, expenseResult, bestSellers] = await Promise.all([
    shouldReadIncome
      ? db.query(
          `select id, order_id, category, description, amount, payment_method,
                  transaction_date, created_at
           from public.income_transactions
           where 1 = 1 ${incomeFilters.sql}
           order by transaction_date desc, created_at desc
           limit 2000`,
          incomeFilters.params
        )
      : Promise.resolve({ rows: [] }),
    shouldReadExpenses
      ? db.query(
          `select id, category, description, amount, payment_method, expense_date,
                  status, notes, receipt_url, created_at
           from public.expenses
           where status = 'active' ${expenseFilters.sql}
           order by expense_date desc, created_at desc
           limit 2000`,
          expenseFilters.params
        )
      : Promise.resolve({ rows: [] }),
    type === "expense" ? Promise.resolve([]) : readBestSellers(db, filters)
  ]);

  const income = incomeResult.rows.map((item) => ({ ...item, amount: Number(item.amount || 0) }));
  const expenses = expenseResult.rows.map((item) => ({ ...item, amount: Number(item.amount || 0) }));
  const summary = summarize(income, expenses);

  return {
    income,
    expenses,
    ...summary,
    bestSellers,
    filters: {
      from: filters.from || "",
      to: filters.to || "",
      type,
      paymentMethod: filters.paymentMethod || "all",
      search: filters.search || ""
    },
    source: "postgres"
  };
}

export async function createPostgresExpense(body, userId = null) {
  const db = getDbPool();
  if (!db) return null;

  return withTransaction(async (client) => {
    const result = await client.query(
      `insert into public.expenses
        (category_id, category, description, amount, payment_method, expense_date, notes, receipt_url, created_by)
       values (null, 'Operating expense', $1, $2, $3, coalesce($4::date, current_date), $5, $6, $7)
       returning *`,
      [
        String(body.description || "").trim(),
        Number(body.amount),
        body.payment_method || "cash",
        body.expense_date || null,
        body.notes || null,
        body.receipt_url || null,
        userId && uuidPattern.test(String(userId)) ? userId : null
      ]
    );
    return { ...result.rows[0], amount: Number(result.rows[0].amount || 0) };
  });
}

export async function voidPostgresExpense(id, userId = null) {
  const db = getDbPool();
  if (!db) return null;

  return withTransaction(async (client) => {
    const result = await client.query(
      `update public.expenses
       set status = 'voided', updated_at = now()
       where id::text = $1 and status = 'active'
       returning *`,
      [String(id)]
    );
    const expense = result.rows[0];
    if (!expense) return null;

    await client.query(
      `insert into public.audit_logs (user_id, action, entity_type, entity_id, details)
       values ($1, 'voided', 'expense', $2, $3::jsonb)`,
      [
        userId && uuidPattern.test(String(userId)) ? userId : null,
        String(expense.id),
        JSON.stringify({ amount: Number(expense.amount), description: expense.description })
      ]
    );
    return { ...expense, amount: Number(expense.amount || 0) };
  });
}

