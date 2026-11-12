"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { corporateOrder, posSale, submitDiscount } from "../lib/actions2";
import { g, inr } from "../lib/calc";
import { THIS_MONTH, custName, lakh, monthKey } from "../lib/stats";
import { Btn, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";
import { PrintButton } from "../components/Labels";

type Tab = "orders" | "retail" | "hni" | "corporate" | "invoice" | "delivery";
const status = (paid: number, amount: number) => (paid >= amount ? "Paid" : paid > 0 ? "Part paid" : "Due");

export default function Sales() {
  const { s, act } = useStore();
  const [tab, setTab] = useState<Tab>("orders");
  const [ch, setCh] = useState("");
  const [pct, setPct] = useState(12);
  const recent = [...s.invoices].reverse();
  const [inv, setInv] = useState(recent[0].id);
  const rows = recent.filter((o) => !ch || o.channel === ch).slice(0, 25);
  const doc = s.invoices.find((o) => o.id === inv) ?? recent[0];
  const stock = s.items.filter((i) => i.status === "InStock");
  const month = s.invoices.filter((o) => monthKey(o.date) === THIS_MONTH);
  const taxable = Math.round(doc.amount / 1.03);
  const pieces = doc.tags.map((t) => s.items.find((i) => i.tag === t)).filter((i) => !!i);
  const corp = s.customers.filter((c) => c.segment === "Corporate");
  const hniBase = 940000;

  return (
    <>
      <PageHeader title="Sales orders" sub="One order model for retail, HNI, corporate and online, so reports and after-sales work the same.">
        {tab === "orders" && (
          <select aria-label="Channel" className="h-9 rounded-lg border border-border bg-card px-2" value={ch} onChange={(e) => setCh(e.target.value)}>
            <option value="">All channels</option>{["Retail", "HNI", "Corporate", "Online"].map((c) => <option key={c}>{c}</option>)}
          </select>
        )}
      </PageHeader>
      <Tabs<Tab> tabs={[["orders", "Orders"], ["retail", "Retail order"], ["hni", "HNI order"], ["corporate", "Corporate order"], ["invoice", "Invoice"], ["delivery", "Delivery note"]]} value={tab} onChange={setTab} />

      {tab === "orders" && (
        <>
          <Kpis items={[["Invoices this month", String(month.length)], ["Value this month", lakh(month.reduce((a, o) => a + o.amount, 0))], ["Unpaid balance", inr(s.invoices.reduce((a, o) => a + (o.amount - o.paid), 0))], ["Online orders open", String(s.orders.filter((o) => o.state < 7).length)]]} />
          <Grid head={["Invoice", "Date", "Channel", "Customer", "Store", "Amount", "Status"]} num={[5]} onRow={(i) => { setInv(rows[i].id); setTab("invoice"); }}
            rows={rows.map((o) => [<span key="i" className="font-mono text-[12.5px]">{o.id}</span>, o.date, o.channel, custName(s.customers, o.custId), o.store, inr(o.amount), <Pill key="s">{status(o.paid, o.amount)}</Pill>])} />
        </>
      )}

      {tab === "retail" && (
        <FormCard className="max-w-[560px]" title="Retail order" cta="Bill and create invoice" fields={[
          { id: "cust", label: "Customer", type: "select", options: ["Walk-in customer", ...s.customers.map((c) => c.name)] },
          { id: "store", label: "Store", type: "select", options: ["Mumbai Flagship", "Delhi Store"] },
          { id: "tag", label: "Piece (scan or choose a tag)", type: "select", options: stock.map((i) => i.tag) },
        ]} onSubmit={(v) => { setInv("INV-" + (3200 + s.invoices.length)); act((d) => posSale(d, [v.tag], v.cust, v.store)); setTab("invoice"); }} />
      )}

      {tab === "hni" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <Card title="HNI quote, Rohan Mehta">
            <Rec rows={[["Piece", "Tennis bracelet, 18K White, custom length"], ["List price", inr(hniBase)], [`Discount ${pct}%`, "-" + inr((hniBase * pct) / 100)], ["Quote total", inr(hniBase * (1 - pct / 100)), true]]} />
            <Field label={`Discount: ${pct}%`} htmlFor="pct"><input id="pct" type="range" min={0} max={20} value={pct} onChange={(e) => setPct(+e.target.value)} className="mt-3 h-6" /></Field>
            <Btn gold onClick={() => act((d) => submitDiscount(d, "HNI order HN-209", pct, "on custom tennis bracelet"))}>Submit quote</Btn>
            <p className="mt-2 text-[12.5px] text-muted-foreground">Above 10% needs the founder&apos;s approval. Nobody approves their own request.</p>
          </Card>
          <Card title="Made to order"><p className="text-muted-foreground">The order line points to a variant and design before any piece exists. A job card is raised once the advance is paid, and the price is locked at the advance.</p></Card>
        </div>
      )}

      {tab === "corporate" && (
        <FormCard className="max-w-[560px]" title="Corporate bulk order" cta="Create order and invoice" fields={[
          { id: "co", label: "Company", type: "select", options: corp.map((c) => c.name) },
          { id: "sku", label: "SKU", type: "select", options: s.skus.map((k) => k.code) },
          { id: "qty", label: "Quantity", type: "number", value: "40" },
          { id: "adv", label: "Advance (percent)", type: "number", value: "30" },
        ]} onSubmit={(v) => { setInv("INV-" + (3200 + s.invoices.length)); act((d) => corporateOrder(d, v.co, v.sku, Math.max(1, +v.qty || 1), Math.min(100, +v.adv || 0))); setTab("invoice"); }} />
      )}

      {(tab === "invoice" || tab === "delivery") && (
        <div className="mb-3.5 max-w-xs no-print"><Field label="Invoice" htmlFor="inv"><select id="inv" className={inputCls} value={doc.id} onChange={(e) => setInv(e.target.value)}>{recent.slice(0, 40).map((o) => <option key={o.id} value={o.id}>{o.id} · {custName(s.customers, o.custId)}</option>)}</select></Field></div>
      )}

      {tab === "invoice" && (
        <>
          <div className="no-print mb-3"><PrintButton>Print invoice</PrintButton></div>
          <div className="print-area max-w-[720px] rounded-[var(--radius)] border border-border bg-white p-6 text-black">
            <div className="flex items-start justify-between border-b border-black/20 pb-3">
              <div><div className="font-display text-xl font-bold tracking-[0.2em]">AKOIRAH</div><div className="text-xs">Lab-grown diamond jewellery</div><div className="text-xs">GSTIN: sample 27AAAAA0000A1Z5</div></div>
              <div className="text-right text-sm"><b>Tax invoice</b><div className="font-mono">{doc.id}</div><div>{doc.date}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4 py-3 text-sm">
              <div><div className="text-xs text-black/60">Bill to</div><b>{custName(s.customers, doc.custId)}</b><div>{s.customers.find((c) => c.id === doc.custId)?.city ?? ""}</div></div>
              <div className="text-right"><div className="text-xs text-black/60">Sold at</div>{doc.store}<div>{doc.channel} sale</div></div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-y border-black/30 text-left text-xs"><th className="py-1.5">Piece</th><th>HUID</th><th>Certificate</th><th>Net metal</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {pieces.length ? pieces.map((i) => (
                  <tr key={i!.tag} className="border-b border-black/10"><td className="py-1.5"><div>{i!.name}, {i!.variant}</div><div className="font-mono text-[11px]">{i!.tag}</div></td><td className="font-mono text-xs">{i!.huid}</td><td className="text-xs">{i!.cert}</td><td>{g(i!.net)}</td><td className="text-right">{inr(i!.price)}</td></tr>
                )) : <tr className="border-b border-black/10"><td className="py-1.5" colSpan={4}>{doc.sku ? `${s.skus.find((k) => k.code === doc.sku)?.name ?? doc.sku}, as per order` : "Jewellery as per order"}</td><td className="text-right">{inr(doc.amount)}</td></tr>}
              </tbody>
            </table>
            <div className="ml-auto mt-3 w-64 text-sm">
              <div className="flex justify-between"><span>Taxable value</span><span>{inr(taxable)}</span></div>
              <div className="flex justify-between"><span>GST (3% sample rate)</span><span>{inr(doc.amount - taxable)}</span></div>
              <div className="flex justify-between border-t border-black/30 pt-1 font-bold"><span>Total</span><span>{inr(doc.amount)}</span></div>
              <div className="flex justify-between"><span>Paid</span><span>{inr(doc.paid)}</span></div>
              <div className="flex justify-between font-semibold"><span>Balance</span><span>{inr(doc.amount - doc.paid)}</span></div>
            </div>
            <p className="mt-5 text-[11px] text-black/60">Lifetime exchange available on every piece. Certificates and HUID are listed against each piece. Sample invoice from the AKOIRAH prototype.</p>
          </div>
        </>
      )}

      {tab === "delivery" && (
        <>
          <div className="no-print mb-3"><PrintButton>Print delivery note</PrintButton></div>
          <div className="print-area max-w-[560px] rounded-[var(--radius)] border border-border bg-white p-6 text-black">
            <div className="mb-3 flex justify-between border-b border-black/20 pb-2"><b className="font-display tracking-[0.2em]">AKOIRAH</b><span className="font-mono text-sm">DN-{doc.id.slice(4)}</span></div>
            <Rec rows={[["Deliver to", custName(s.customers, doc.custId)], ["Against invoice", doc.id], ["From", doc.store], ["Pieces", String(Math.max(1, doc.tags.length))], ["Courier", "Insured, signature on delivery"], ["Received by", "______________________"]]} />
          </div>
        </>
      )}
      {tab === "delivery" && <p className="no-print mt-2 text-muted-foreground">The delivery note prints without the screen around it.</p>}
    </>
  );
}
