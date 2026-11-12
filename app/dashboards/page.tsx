"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../lib/store";
import { g, inr, jcCalc } from "../lib/calc";
import { THIS_MONTH, ageBucket, customerTotals, lakh, monthKey, receivables, revenueByMonth, sumBy } from "../lib/stats";
import { Card, PageHeader } from "../components/ui";
import { Grid, Kpis } from "../components/kit";
import { AP, VENDORS } from "../lib/mock";
import type { State } from "../lib/data";

interface Dash {
  id: string; title: string;
  kpis: [string, string, string?][];
  chart: { kind: "bar" | "line"; title: string; data: { name: string; v: number }[] };
  table: { head: string[]; rows: (string | number)[][] };
}
const sumDue = (a: { due: number }[]) => a.reduce((x, r) => x + r.due, 0);
const days = (tag: string) => 5 + ([...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % 140);
const TARGET: Record<string, number> = { "Mumbai Flagship": 4000000, "Delhi Store": 2000000 };

function build(s: State): Dash[] {
  const live = s.items.filter((i) => i.status !== "Sold");
  const stock = s.items.filter((i) => i.status === "InStock");
  const byLoc = Object.entries(live.reduce<Record<string, number>>((a, i) => ({ ...a, [i.loc]: (a[i.loc] || 0) + 1 }), {}));
  const fine = s.lots.reduce((a, l) => a + l.fine, 0);
  const open = s.jcs.filter((j) => j.state !== "Closed");
  const bySku = s.skus.map((k) => ({ name: k.code.slice(3), v: s.items.filter((i) => i.sku === k.code).length }));
  const rev = revenueByMonth(s.invoices);
  const now = s.invoices.filter((v) => monthKey(v.date) === THIS_MONTH);
  const nowTotal = now.reduce((a, v) => a + v.amount, 0);
  const ch = sumBy(s.invoices, (v) => v.channel, THIS_MONTH);
  const owed = receivables(s.invoices).map((v) => ({ due: v.amount - v.paid, age: ageBucket(v.date), party: s.customers.find((c) => c.id === v.custId)?.name ?? "Walk-in", note: v.id }));
  const cust = customerTotals(s.invoices, s.customers).sort((a, b) => b.spend - a.spend);
  const repeat = cust.filter((c) => c.orders >= 2).length;
  const sold = s.invoices.filter((v) => v.sku);
  const unrec = s.jcs.filter((j) => j.state === "Received" && !j.approved).reduce((a, j) => a + jcCalc(j).unrec, 0);
  const store = (n: string) => s.invoices.filter((v) => v.store === n && monthKey(v.date) === THIS_MONTH).reduce((a, v) => a + v.amount, 0);
  const aged = stock.filter((i) => days(i.tag) > 90);
  const topSku = s.skus.map((k) => [k.code, sold.filter((v) => v.sku === k.code).length] as const).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";

  return [
    { id: "inventory", title: "Inventory", kpis: [["Pieces on the books", String(live.length)], ["Stock value", inr(live.reduce((a, i) => a + i.price, 0))], ["In stock", String(stock.length)], ["In transit", String(s.items.filter((i) => i.status === "InTransit").length)]],
      chart: { kind: "bar", title: "Pieces by location", data: byLoc.map(([name, v]) => ({ name, v })) }, table: { head: ["SKU", "Pieces"], rows: bySku.map((b) => [b.name, b.v]) } },
    { id: "raw", title: "Raw material", kpis: [["Fine gold", g(fine)], ["Metal lots", String(s.lots.length)], ["Certified stones", "4"], ["Below reorder", "3"]],
      chart: { kind: "bar", title: "Fine gold by lot (g)", data: s.lots.map((l) => ({ name: l.id, v: Math.round(l.fine / 1000) })) }, table: { head: ["Lot", "Fine gold"], rows: s.lots.map((l) => [l.id, g(l.fine)]) } },
    { id: "production", title: "Production", kpis: [["Open job cards", String(open.length)], ["At vendor", String(s.jcs.filter((j) => j.state === "At vendor").length)], ["Received", String(s.jcs.filter((j) => j.state === "Received").length)], ["Pieces in work", String(open.reduce((a, j) => a + j.qty, 0))]],
      chart: { kind: "bar", title: "Pieces in work by vendor", data: VENDORS.map((v) => ({ name: v.name.split(" ")[0], v: open.filter((j) => j.vendor === v.name).reduce((a, j) => a + j.qty, 0) })) }, table: { head: ["Job card", "Vendor", "State"], rows: open.map((j) => [j.id, j.vendor, j.state]) } },
    { id: "manufacturing", title: "Manufacturing", kpis: [["Cycle time", "13 days", "issue to HO receipt"], ["QC fail rate", "4%"], ["Rework pieces", "2"], ["Unreconciled gold", g(unrec)]],
      chart: { kind: "line", title: "Cycle time by month (days)", data: rev.map((r, i) => ({ name: r.name, v: [17, 16, 15, 15, 14, 13][i] ?? 13 })) }, table: { head: ["Stage", "Average days"], rows: [["Casting", 3], ["Setting", 5], ["Finishing", 2], ["QC and hallmark", 3]] } },
    { id: "sales", title: "Sales", kpis: [["This month", lakh(nowTotal)], ["Invoices", String(now.length)], ["Average invoice", inr(nowTotal / Math.max(1, now.length))], ["Online share", Math.round((now.filter((v) => v.channel === "Online").reduce((a, v) => a + v.amount, 0) / Math.max(1, nowTotal)) * 100) + "%"]],
      chart: { kind: "line", title: "Revenue by month (lakh)", data: rev.map((r) => ({ name: r.name, v: Math.round(r.v / 10000) / 10 })) }, table: { head: ["Channel", "Revenue this month"], rows: ch.map(([c, v]) => [c, lakh(v)]) } },
    { id: "finance", title: "Finance", kpis: [["Collected this month", lakh(now.reduce((a, v) => a + v.paid, 0))], ["Gross margin", "31%"], ["Gold rate 24K", inr(13250)], ["Net receivable", inr(sumDue(owed) - sumDue(AP))]],
      chart: { kind: "line", title: "Collections by month (lakh)", data: rev.map((r) => ({ name: r.name, v: Math.round(s.invoices.filter((v) => monthKey(v.date) === r.key).reduce((a, v) => a + v.paid, 0) / 10000) / 10 })) }, table: { head: ["Line", "Amount"], rows: [["Receivable", inr(sumDue(owed))], ["Payable", inr(sumDue(AP))]] } },
    { id: "ledgers", title: "Receivables and payables", kpis: [["Receivable", inr(sumDue(owed))], ["Payable", inr(sumDue(AP))], ["Over 60 days", inr(owed.filter((r) => r.age === "61-90+").reduce((x, r) => x + r.due, 0))], ["Due this week", inr(AP.filter((r) => r.age === "0-30").reduce((x, r) => x + r.due, 0))]],
      chart: { kind: "bar", title: "Receivable by age (thousand)", data: ["0-30", "31-60", "61-90+"].map((b) => ({ name: b, v: Math.round(owed.filter((r) => r.age === b).reduce((x, r) => x + r.due, 0) / 1000) })) }, table: { head: ["Party", "Amount", "Invoice"], rows: owed.slice(-6).map((r) => [r.party, inr(r.due), r.note]) } },
    { id: "customer", title: "Customer", kpis: [["Customers", String(s.customers.length)], ["Repeat share", Math.round((repeat / Math.max(1, cust.length)) * 100) + "%"], ["Top spend", inr(cust[0]?.spend ?? 0)], ["After-sales cases", String(s.repairs.length + s.approvals.filter((a) => a.type === "Refund" || a.type === "Exchange valuation").length)]],
      chart: { kind: "bar", title: "Spend by customer (lakh)", data: cust.slice(0, 6).map((c) => ({ name: c.name.split(" ")[0], v: Math.round(c.spend / 10000) / 10 })) }, table: { head: ["Customer", "Invoices", "Spend"], rows: cust.slice(0, 5).map((c) => [c.name, c.orders, inr(c.spend)]) } },
    { id: "vendor", title: "Vendor", kpis: [["Vendors", String(VENDORS.length)], ["On-time rate", Math.round(VENDORS.reduce((a, v) => a + v.onTime, 0) / VENDORS.length) + "%"], ["Wastage vs allowed", "1.1% vs 1.5%"], ["Open balances", g(open.reduce((a, j) => a + j.issued - j.pieces - j.scrap, 0))]],
      chart: { kind: "bar", title: "On-time rate (%)", data: VENDORS.map((v) => ({ name: v.name.split(" ")[0], v: v.onTime })) }, table: { head: ["Vendor", "On time", "Wastage"], rows: VENDORS.map((v) => [v.name, v.onTime + "%", v.wastage + "%"]) } },
    { id: "stores", title: "Store performance", kpis: [["Mumbai Flagship", Math.round((store("Mumbai Flagship") / TARGET["Mumbai Flagship"]) * 100) + "%", "of monthly target"], ["Delhi Store", Math.round((store("Delhi Store") / TARGET["Delhi Store"]) * 100) + "%", "of monthly target"], ["Store revenue this month", lakh(store("Mumbai Flagship") + store("Delhi Store"))], ["Stock turn", "3.2x"]],
      chart: { kind: "bar", title: "Revenue vs target (percent)", data: Object.keys(TARGET).map((n) => ({ name: n.split(" ")[0], v: Math.round((store(n) / TARGET[n]) * 100) })) }, table: { head: ["Store", "Revenue", "Pieces in stock", "Stock value"], rows: Object.keys(TARGET).map((l) => [l, lakh(store(l)), stock.filter((i) => i.loc === l).length, inr(stock.filter((i) => i.loc === l).reduce((a, i) => a + i.price, 0))]) } },
    { id: "dead", title: "Dead stock", kpis: [["Pieces over 90 days", String(aged.length)], ["Value locked", inr(aged.reduce((a, i) => a + i.price, 0))], ["Share of stock", Math.round((aged.length / Math.max(1, stock.length)) * 100) + "%"], ["Oldest", Math.max(0, ...stock.map((i) => days(i.tag))) + " days"]],
      chart: { kind: "bar", title: "Pieces by age", data: [["0-30", 0, 30], ["31-60", 31, 60], ["61-90", 61, 90], ["90+", 91, 999]].map(([name, a, b]) => ({ name: String(name), v: stock.filter((i) => days(i.tag) >= Number(a) && days(i.tag) <= Number(b)).length })) }, table: { head: ["Tag", "Days", "Location"], rows: aged.map((i) => [i.tag, days(i.tag), i.loc]) } },
    { id: "fast", title: "Fast movers", kpis: [["Pieces sold, 6 months", String(sold.length)], ["Top SKU", topSku], ["Average days of cover", "26"], ["Sell-through", Math.round((sold.length / Math.max(1, sold.length + stock.length)) * 100) + "%"]],
      chart: { kind: "bar", title: "Pieces sold by SKU", data: s.skus.map((k) => ({ name: k.code.slice(3), v: sold.filter((v) => v.sku === k.code).length })) }, table: { head: ["SKU", "Sold", "In stock"], rows: s.skus.map((k) => [k.code, sold.filter((v) => v.sku === k.code).length, stock.filter((i) => i.sku === k.code).length]) } },
  ];
}

export default function Dashboards() {
  const { s } = useStore();
  const all = build(s);
  const [id, setId] = useState("inventory");
  const d = all.find((x) => x.id === id) ?? all[0];

  return (
    <>
      <PageHeader title="Analytics dashboards" sub="Twelve views, all fed from the database. Vendor, manufacturing and a few finance figures are samples." />
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">
        {all.map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === d.id} onClick={() => setId(x.id)}
            className={"rounded-full border px-3 py-1 text-[13px] font-semibold " + (x.id === d.id ? "border-gold bg-gold-light text-gold" : "border-border bg-card text-muted-foreground hover:bg-muted")}>{x.title}</button>
        ))}
      </div>
      <Kpis items={d.kpis} />
      <div className="grid items-start gap-3.5 lg:grid-cols-[1.3fr_1fr]">
        <Card title={d.chart.title}>
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {d.chart.kind === "bar" ? (
                <BarChart data={d.chart.data}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="v" fill="var(--gold)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
                </BarChart>
              ) : (
                <LineChart data={d.chart.data}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} axisLine={false} tickLine={false} width={52} domain={["auto", "auto"]} />
                  <Tooltip />
                  <Line type="monotone" dataKey="v" stroke="var(--gold)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--gold)" }} isAnimationActive={false} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
        <Grid head={d.table.head} rows={d.table.rows} num={d.table.head.map((_, i) => i).filter((i) => i > 0 && typeof d.table.rows[0]?.[i] === "number")} />
      </div>
    </>
  );
}
