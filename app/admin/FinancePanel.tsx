// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";

const paymentMethods = ["cash", "card", "telebirr", "bank", "other"];
const defaultCategories = [
  "Ingredients",
  "Maintenance",
  "Salaries",
  "Rent",
  "Utilities",
  "Transport",
  "Marketing",
  "Other"
];

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function monthStart() {
  const now = new Date();
  return localDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function money(value) {
  return `${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`;
}

function dateLabel(value) {
  if (!value) return "-";
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function FinancePanel({ reportOnly = false }) {
  const [data, setData] = useState({
    income: [],
    expenses: [],
    daily: [],
    paymentBreakdown: [],
    expenseBreakdown: [],
    bestSellers: [],
    expenseCategories: defaultCategories,
    totals: { income: 0, expenses: 0, profit: 0, transactions: 0 }
  });
  const [filters, setFilters] = useState({
    from: monthStart(),
    to: localDate(),
    type: "all",
    category: "all",
    payment_method: "all",
    search: ""
  });
  const [preset, setPreset] = useState("month");
  const [form, setForm] = useState({
    category: "Maintenance",
    description: "",
    amount: "",
    payment_method: "cash",
    expense_date: localDate(),
    notes: ""
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadFinance(nextFilters = filters) {
    setLoading(true);
    const query = new URLSearchParams(
      Object.entries(nextFilters).filter(([, value]) => value !== "" && value !== "all")
    );
    try {
      const response = await fetch(`/api/hono/${reportOnly ? "reports" : "finance"}?${query}`, {
        cache: "no-store"
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load finance records.");
      setData((current) => ({ ...current, ...result }));
      setMessage("");
    } catch (error) {
      setMessage(error.message || "Unable to load finance records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => loadFinance(filters), 180);
    return () => window.clearTimeout(timer);
  }, [filters, reportOnly]);

  function applyPreset(nextPreset) {
    const today = new Date();
    let from = localDate(today);
    if (nextPreset === "week") {
      const monday = new Date(today);
      const day = monday.getDay() || 7;
      monday.setDate(monday.getDate() - day + 1);
      from = localDate(monday);
    }
    if (nextPreset === "month") from = monthStart();
    if (nextPreset === "all") from = "";
    setPreset(nextPreset);
    setFilters((current) => ({ ...current, from, to: nextPreset === "all" ? "" : localDate(today) }));
  }

  async function addExpense(event) {
    event.preventDefault();
    setMessage("Saving expense...");
    const response = await fetch("/api/hono/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to save expense.");
      return;
    }
    setForm((current) => ({ ...current, description: "", amount: "", notes: "" }));
    setMessage("Expense saved.");
    await loadFinance();
  }

  async function voidExpense(id) {
    if (!window.confirm("Void this expense? It will remain in the audit history but will not count in reports.")) return;
    const response = await fetch(`/api/hono/expenses/${id}/void`, { method: "PATCH" });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to void expense.");
      return;
    }
    setMessage("Expense voided.");
    await loadFinance();
  }

  const rows = useMemo(
    () =>
      [
        ...(data.income || []).map((item) => ({
          ...item,
          kind: "Income",
          date: item.transaction_date
        })),
        ...(data.expenses || []).map((item) => ({
          ...item,
          kind: "Expense",
          date: item.expense_date
        }))
      ].sort((a, b) => {
        const dateCompare = String(b.date).localeCompare(String(a.date));
        return dateCompare || String(b.created_at).localeCompare(String(a.created_at));
      }),
    [data.expenses, data.income]
  );
  const categories = [...new Set([...defaultCategories, ...(data.expenseCategories || [])])];
  const chartDays = (data.daily || []).slice(-14);
  const maxDaily = Math.max(1, ...chartDays.flatMap((day) => [Number(day.income), Number(day.expenses)]));

  function exportCsv() {
    const lines = [
      ["Type", "Date", "Category", "Description", "Payment method", "Amount ETB"].map(csvCell).join(","),
      ...rows.map((row) =>
        [
          row.kind,
          String(row.date).slice(0, 10),
          row.category,
          row.description,
          row.payment_method,
          row.amount
        ]
          .map(csvCell)
          .join(",")
      )
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `emrakel-finance-${filters.from || "all"}-${filters.to || "today"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="financeWorkspace">
      <section className="financeToolbar panel">
        <div className="financeToolbarTitle">
          <p className="eyebrow">{reportOnly ? "Business reporting" : "Owner finance control"}</p>
          <h2>{reportOnly ? "Profit and performance report" : "Income and expense management"}</h2>
          <p>Finished waiter orders become income automatically. Add operating expenses manually.</p>
        </div>
        <button className="button buttonLine compact" type="button" onClick={exportCsv}>
          Export CSV
        </button>
        <div className="financePresets" aria-label="Date range presets">
          {[
            ["today", "Today"],
            ["week", "This week"],
            ["month", "This month"],
            ["all", "All time"]
          ].map(([id, label]) => (
            <button className={preset === id ? "active" : ""} key={id} type="button" onClick={() => applyPreset(id)}>
              {label}
            </button>
          ))}
        </div>
        <div className="financeFilterGrid">
          <label>
            From
            <input
              type="date"
              value={filters.from}
              onChange={(event) => {
                setPreset("custom");
                setFilters((current) => ({ ...current, from: event.target.value }));
              }}
            />
          </label>
          <label>
            To
            <input
              type="date"
              value={filters.to}
              onChange={(event) => {
                setPreset("custom");
                setFilters((current) => ({ ...current, to: event.target.value }));
              }}
            />
          </label>
          <label>
            Transaction
            <select value={filters.type} onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}>
              <option value="all">Income & expenses</option>
              <option value="income">Income only</option>
              <option value="expense">Expenses only</option>
            </select>
          </label>
          <label>
            Category
            <select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
              <option value="all">All categories</option>
              <option value="food_sales">Food sales</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            Payment
            <select value={filters.payment_method} onChange={(event) => setFilters((current) => ({ ...current, payment_method: event.target.value }))}>
              <option value="all">All payments</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </label>
          <label className="financeSearch">
            Search
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Description or category"
            />
          </label>
        </div>
      </section>

      <section className="financeMetricGrid">
        <article className="financeMetric income">
          <span>Income</span>
          <strong>{money(data.totals?.income)}</strong>
          <small>Finished restaurant orders</small>
        </article>
        <article className="financeMetric expense">
          <span>Expenses</span>
          <strong>{money(data.totals?.expenses)}</strong>
          <small>Active owner-entered spending</small>
        </article>
        <article className={`financeMetric profit ${Number(data.totals?.profit) < 0 ? "negative" : ""}`}>
          <span>Net profit</span>
          <strong>{money(data.totals?.profit)}</strong>
          <small>Income minus expenses</small>
        </article>
        <article className="financeMetric neutral">
          <span>Transactions</span>
          <strong>{Number(data.totals?.transactions || 0).toLocaleString()}</strong>
          <small>Matching current filters</small>
        </article>
      </section>

      {!reportOnly ? (
        <section className="financeEntryGrid">
          <form className="panel expenseEntryCard" onSubmit={addExpense}>
            <div>
              <p className="eyebrow">New spending</p>
              <h2>Add daily expense</h2>
              <p>Example: TV maintenance — 500 ETB.</p>
            </div>
            <div className="expenseEntryFields">
              <label>
                Category
                <input
                  list="expense-categories"
                  required
                  value={form.category}
                  onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                />
                <datalist id="expense-categories">
                  {categories.map((category) => <option key={category} value={category} />)}
                </datalist>
              </label>
              <label>
                Description
                <input
                  required
                  value={form.description}
                  placeholder="TV maintenance"
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <label>
                Amount (ETB)
                <input
                  min="0.01"
                  step="0.01"
                  required
                  type="number"
                  value={form.amount}
                  placeholder="500"
                  onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </label>
              <label>
                Expense date
                <input
                  required
                  type="date"
                  value={form.expense_date}
                  onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
                />
              </label>
              <label>
                Payment method
                <select
                  value={form.payment_method}
                  onChange={(event) => setForm((current) => ({ ...current, payment_method: event.target.value }))}
                >
                  {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
                </select>
              </label>
              <label>
                Notes
                <input
                  value={form.notes}
                  placeholder="Optional details"
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>
            <button className="button buttonGold" type="submit">Save expense</button>
          </form>

          <article className="panel financeSnapshot">
            <p className="eyebrow">Period snapshot</p>
            <h2>Where money is going</h2>
            {(data.expenseBreakdown || []).length ? (
              <div className="breakdownList">
                {data.expenseBreakdown.slice(0, 6).map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>{money(item.amount)}</strong>
                  </div>
                ))}
              </div>
            ) : <p className="mutedText">No expenses match this period.</p>}
          </article>
        </section>
      ) : null}

      <section className="financeReportGrid">
        <article className="panel financeChartCard">
          <div className="financeCardHeading">
            <div>
              <p className="eyebrow">Daily movement</p>
              <h2>Income vs expenses</h2>
            </div>
            <span>Last {chartDays.length} active days</span>
          </div>
          {chartDays.length ? (
            <div className="financeBarChart">
              {chartDays.map((day) => (
                <div className="financeBarDay" key={day.date} title={`${day.date}: ${money(day.income)} income, ${money(day.expenses)} expenses`}>
                  <div className="financeBars">
                    <i className="incomeBar" style={{ height: `${Math.max(3, (Number(day.income) / maxDaily) * 100)}%` }} />
                    <i className="expenseBar" style={{ height: `${Math.max(3, (Number(day.expenses) / maxDaily) * 100)}%` }} />
                  </div>
                  <small>{String(day.date).slice(5)}</small>
                </div>
              ))}
            </div>
          ) : <p className="mutedText">Finish orders or add expenses to see the chart.</p>}
          <div className="financeLegend"><span><i className="incomeDot" /> Income</span><span><i className="expenseDot" /> Expenses</span></div>
        </article>

        <article className="panel bestSellerCard">
          <div className="financeCardHeading">
            <div>
              <p className="eyebrow">Menu performance</p>
              <h2>Best sellers</h2>
            </div>
          </div>
          {(data.bestSellers || []).length ? (
            <div className="bestSellerList">
              {data.bestSellers.slice(0, 6).map((item, index) => (
                <div key={item.name}>
                  <b>{index + 1}</b>
                  <span><strong>{item.name}</strong><small>{item.quantity} sold</small></span>
                  <em>{money(item.revenue)}</em>
                </div>
              ))}
            </div>
          ) : <p className="mutedText">Finished orders will show best-selling items here.</p>}
        </article>
      </section>

      <section className="panel financeTransactions">
        <div className="financeCardHeading">
          <div>
            <p className="eyebrow">Detailed ledger</p>
            <h2>Income and expenses</h2>
          </div>
          <span>{loading ? "Updating..." : `${rows.length} records`}</span>
        </div>
        {message ? <p className="financeMessage">{message}</p> : null}
        <div className="financeTableScroll">
          <table className="financeTable">
            <thead>
              <tr>
                <th>Type</th>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Payment</th>
                <th>Amount</th>
                {!reportOnly ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td><span className={`transactionBadge ${row.kind.toLowerCase()}`}>{row.kind}</span></td>
                  <td>{dateLabel(row.date)}</td>
                  <td><strong>{row.description}</strong>{row.notes ? <small>{row.notes}</small> : null}</td>
                  <td>{row.category}</td>
                  <td className="capitalize">{row.payment_method}</td>
                  <td className={row.kind === "Income" ? "incomeValue" : "expenseValue"}>
                    {row.kind === "Income" ? "+" : "-"}{money(row.amount)}
                  </td>
                  {!reportOnly ? (
                    <td>{row.kind === "Expense" ? <button className="voidExpenseButton" type="button" onClick={() => voidExpense(row.id)}>Void</button> : null}</td>
                  ) : null}
                </tr>
              )) : (
                <tr><td colSpan={reportOnly ? 6 : 7} className="emptyFinanceTable">No transactions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

