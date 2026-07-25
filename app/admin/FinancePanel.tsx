// @ts-nocheck
"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Download, Layers3, Plus, ReceiptText, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const paymentMethods = ["cash", "bank", "telebirr"];
const costTypes = [
  { value: "variable", label: "Variable operating" },
  { value: "fixed", label: "Fixed monthly" },
  { value: "maintenance", label: "Maintenance" },
  { value: "long_term", label: "Long-term asset" },
  { value: "other", label: "Other one-time" }
];
const recurrences = [
  { value: "one_time", label: "One time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" }
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

function optionLabel(options, value) {
  return options.find((item) => item.value === value)?.label || value || "-";
}

function allocatedAmount(item) {
  const months = Math.max(1, Number.parseInt(item.allocation_months, 10) || 1);
  return item.cost_type === "long_term" ? Number(item.amount || 0) / months : Number(item.amount || 0);
}

export default function FinancePanel({ reportOnly = false }) {
  const [data, setData] = useState({
    income: [],
    expenses: [],
    daily: [],
    paymentBreakdown: [],
    expenseBreakdown: [],
    bestSellers: [],
    totals: { income: 0, expenses: 0, profit: 0, transactions: 0 }
  });
  const [filters, setFilters] = useState({
    from: monthStart(),
    to: localDate(),
    type: "all",
    payment_method: "all",
    cost_type: "all",
    search: ""
  });
  const [preset, setPreset] = useState("month");
  const [form, setForm] = useState({
    description: "",
    amount: "",
    payment_method: "cash",
    expense_date: localDate(),
    cost_type: "variable",
    recurrence: "one_time",
    allocation_months: "1",
    allocation_start_date: localDate(),
    allocation_end_date: "",
    notes: ""
  });
  const [loading, setLoading] = useState(reportOnly);
  const [saving, setSaving] = useState(false);
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
    if (!reportOnly) return undefined;
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
    setSaving(true);
    setMessage("Saving expense...");
    try {
      const response = await fetch("/api/hono/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save expense.");
      setForm((current) => ({ ...current, description: "", amount: "", allocation_months: "1", allocation_end_date: "", notes: "" }));
      setMessage("Expense saved. It is now available in Reports.");
    } catch (error) {
      setMessage(error.message || "Unable to save expense.");
    } finally {
      setSaving(false);
    }
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
  const chartDays = (data.daily || []).slice(-14);
  const maxDaily = Math.max(1, ...chartDays.flatMap((day) => [Number(day.income), Number(day.expenses)]));

  function exportCsv() {
    const lines = [
      ["Type", "Date", "Description", "Cost type", "Recurrence", "Payment method", "Cash amount ETB", "Allocated amount ETB"].map(csvCell).join(","),
      ...rows.map((row) =>
        [
          row.kind,
          String(row.date).slice(0, 10),
          row.description,
          row.cost_type || "",
          row.recurrence || "",
          row.payment_method,
          row.amount,
          row.kind === "Expense" ? allocatedAmount(row) : ""
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

  if (!reportOnly) {
    return (
      <div className="expenseOnlyWorkspace">
        <Card className="expenseOnlyCard">
          <form onSubmit={addExpense}>
            <CardHeader className="expenseOnlyHeader">
              <div className="expenseEntryHeaderIcon" aria-hidden="true">
                <ReceiptText size={24} />
              </div>
              <div>
                <Badge variant="outline">Operations</Badge>
                <CardTitle>Add business expense</CardTitle>
                <CardDescription>
                  Record operating, fixed, maintenance, or long-term costs. Reports separate cash spending from allocated monthly cost.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent>
              <div className="expenseEntryFields">
                <div className="expenseField">
                  <Label htmlFor="expense-cost-type">Cost type</Label>
                  <Select
                    value={form.cost_type}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        cost_type: value,
                        recurrence: value === "fixed" ? "monthly" : current.recurrence,
                        allocation_months: value === "long_term" ? current.allocation_months || "12" : "1"
                      }))
                    }
                  >
                    <SelectTrigger id="expense-cost-type">
                      <SelectValue placeholder="Select cost type" />
                    </SelectTrigger>
                    <SelectContent>
                      {costTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="expenseField">
                  <Label htmlFor="expense-recurrence">Recurrence</Label>
                  <Select
                    value={form.recurrence}
                    onValueChange={(value) => setForm((current) => ({ ...current, recurrence: value }))}
                  >
                    <SelectTrigger id="expense-recurrence">
                      <SelectValue placeholder="Select recurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrences.map((recurrence) => (
                        <SelectItem key={recurrence.value} value={recurrence.value}>
                          {recurrence.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.cost_type === "long_term" ? (
                  <div className="expenseField">
                    <Label htmlFor="expense-allocation">Spread over months</Label>
                    <Input
                      id="expense-allocation"
                      min="1"
                      step="1"
                      required
                      type="number"
                      value={form.allocation_months}
                      placeholder="12"
                      onChange={(event) => setForm((current) => ({ ...current, allocation_months: event.target.value }))}
                    />
                  </div>
                ) : null}
                <div className="expenseField">
                  <Label htmlFor="expense-description">Description</Label>
                  <Input
                    id="expense-description"
                    required
                    value={form.description}
                    placeholder="e.g. TV maintenance"
                    onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  />
                </div>
                <div className="expenseField">
                  <Label htmlFor="expense-amount">Amount (ETB)</Label>
                  <Input
                    id="expense-amount"
                    min="0.01"
                    step="0.01"
                    required
                    type="number"
                    value={form.amount}
                    placeholder="500"
                    onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                  />
                </div>
                <div className="expenseField">
                  <Label htmlFor="expense-date">Expense date</Label>
                  <Input
                    id="expense-date"
                    required
                    type="date"
                    value={form.expense_date}
                    onChange={(event) => setForm((current) => ({ ...current, expense_date: event.target.value }))}
                  />
                </div>
                {form.recurrence !== "one_time" || form.cost_type === "long_term" ? (
                  <div className="expenseField">
                    <Label htmlFor="expense-end-date">End date <span>Optional</span></Label>
                    <Input
                      id="expense-end-date"
                      type="date"
                      value={form.allocation_end_date}
                      onChange={(event) => setForm((current) => ({ ...current, allocation_end_date: event.target.value }))}
                    />
                  </div>
                ) : null}
                <div className="expenseField">
                  <Label htmlFor="expense-payment">Payment method</Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={(value) => setForm((current) => ({ ...current, payment_method: value }))}
                  >
                    <SelectTrigger id="expense-payment">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method.charAt(0).toUpperCase() + method.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="expenseField expenseNotesField">
                  <Label htmlFor="expense-notes">Notes <span>Optional</span></Label>
                  <Textarea
                    id="expense-notes"
                    value={form.notes}
                    placeholder="Add a receipt reference or any useful details..."
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="expenseOnlyFooter">
              <div aria-live="polite" className={`financeMessage ${message.startsWith("Expense saved") ? "success" : ""}`}>
                {message || "The entry will appear immediately the next time you open Reports."}
              </div>
              <Button variant="gold" size="lg" type="submit" disabled={saving}>
                <Plus size={17} /> {saving ? "Saving expense..." : "Save expense"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="financeWorkspace">
      <Card className="financeToolbar">
        <div className="financeToolbarTitle">
          <p className="eyebrow">Business reporting</p>
          <h2>Profit and performance report</h2>
          <p>Review finished-order income and owner-entered expenses in one report.</p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={exportCsv}>
          <Download size={15} /> Export CSV
        </Button>
        <div className="financePresets" aria-label="Date range presets">
          {[
            ["today", "Today"],
            ["week", "This week"],
            ["month", "This month"],
            ["all", "All time"]
          ].map(([id, label]) => (
            <Button variant={preset === id ? "default" : "outline"} size="sm" className={preset === id ? "active" : ""} key={id} type="button" onClick={() => applyPreset(id)}>
              {label}
            </Button>
          ))}
        </div>
        <div className="financeFilterGrid">
          <label>
            From
            <Input
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
            <Input
              type="date"
              value={filters.to}
              onChange={(event) => {
                setPreset("custom");
                setFilters((current) => ({ ...current, to: event.target.value }));
              }}
            />
          </label>
          <div className="financeFilterField">
            <Label>Transaction</Label>
            <Select value={filters.type} onValueChange={(value) => setFilters((current) => ({ ...current, type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Income &amp; expenses</SelectItem>
                <SelectItem value="income">Income only</SelectItem>
                <SelectItem value="expense">Expenses only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="financeFilterField">
            <Label>Payment</Label>
            <Select value={filters.payment_method} onValueChange={(value) => setFilters((current) => ({ ...current, payment_method: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All payments</SelectItem>
                {paymentMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method.charAt(0).toUpperCase() + method.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="financeFilterField">
            <Label>Cost type</Label>
            <Select value={filters.cost_type} onValueChange={(value) => setFilters((current) => ({ ...current, cost_type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cost types</SelectItem>
                {costTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="financeSearch">
            Search
            <Input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Description or payment"
            />
          </label>
        </div>
      </Card>

      <section className="financeMetricGrid">
        <Card className="financeMetric income">
          <div className="financeMetricIcon"><TrendingUp size={18} /></div>
          <span>Income</span>
          <strong>{money(data.totals?.income)}</strong>
          <small>Finished restaurant orders</small>
        </Card>
        <Card className="financeMetric expense">
          <div className="financeMetricIcon"><TrendingDown size={18} /></div>
          <span>Cash expenses</span>
          <strong>{money(data.totals?.expenses)}</strong>
          <small>Actual money paid in this period</small>
        </Card>
        <Card className="financeMetric neutral">
          <div className="financeMetricIcon"><Layers3 size={18} /></div>
          <span>Allocated cost</span>
          <strong>{money(data.totals?.allocatedExpenses ?? data.totals?.expenses)}</strong>
          <small>Long-term assets spread by month</small>
        </Card>
        <Card className={`financeMetric profit ${Number(data.totals?.plannedProfit ?? data.totals?.profit) < 0 ? "negative" : ""}`}>
          <div className="financeMetricIcon"><WalletCards size={18} /></div>
          <span>Planned profit</span>
          <strong>{money(data.totals?.plannedProfit ?? data.totals?.profit)}</strong>
          <small>Income minus allocated costs</small>
        </Card>
        <Card className="financeMetric neutral">
          <div className="financeMetricIcon"><CalendarClock size={18} /></div>
          <span>Fixed monthly</span>
          <strong>{money(data.totals?.fixedExpenses)}</strong>
          <small>Rent, salaries, internet, subscriptions</small>
        </Card>
      </section>

      <section className="financeReportGrid">
        <Card className="financeChartCard">
          <CardContent>
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
          </CardContent>
        </Card>

        <div className="financeReportSideStack">
          <Card className="bestSellerCard">
            <CardContent>
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
            </CardContent>
          </Card>

          <Card className="financeSnapshot">
            <CardContent>
              <div className="financeCardHeading">
                <div>
                  <p className="eyebrow">Recent spending</p>
                  <h2>Latest expenses</h2>
                </div>
              </div>
              {(data.expenses || []).length ? (
                <div className="breakdownList">
                  {data.expenses.slice(0, 6).map((item) => (
                    <div key={item.id}>
                      <span>
                        <strong>{item.description}</strong>
                        <small>{dateLabel(item.expense_date)} - {optionLabel(costTypes, item.cost_type || "variable")}</small>
                      </span>
                      <strong>{money(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="mutedText">No expenses match this period.</p>}
            </CardContent>
          </Card>
        </div>
      </section>

      <Card className="financeTransactions">
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
                <th>Cost type</th>
                <th>Recurrence</th>
                <th>Payment</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={`${row.kind}-${row.id}`}>
                  <td><Badge variant={row.kind === "Income" ? "success" : "destructive"}>{row.kind}</Badge></td>
                  <td>{dateLabel(row.date)}</td>
                  <td><strong>{row.description}</strong>{row.notes ? <small>{row.notes}</small> : null}</td>
                  <td>{row.kind === "Expense" ? optionLabel(costTypes, row.cost_type || "variable") : "-"}</td>
                  <td>{row.kind === "Expense" ? optionLabel(recurrences, row.recurrence || "one_time") : "-"}</td>
                  <td className="capitalize">{row.payment_method}</td>
                  <td className={row.kind === "Income" ? "incomeValue" : "expenseValue"}>
                    {row.kind === "Income" ? "+" : "-"}{money(row.amount)}
                    {row.kind === "Expense" && row.cost_type === "long_term" ? (
                      <small>{money(allocatedAmount(row))}/mo planned</small>
                    ) : null}
                  </td>
                  <td>{row.kind === "Expense" ? <Button variant="destructive" size="sm" type="button" onClick={() => voidExpense(row.id)}>Void</Button> : null}</td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="emptyFinanceTable">No transactions match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

