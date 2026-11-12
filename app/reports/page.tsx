"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { ct, g, inr, jcCalc, PUR } from "../lib/calc";
import { Btn, PageHeader } from "../components/ui";
import { Grid } from "../components/kit";
import { AP } from "../lib/mock";
import { ageBucket, custName, receivables } from "../lib/stats";
import { REPAIR_STEPS } from "../lib/actions";
import type { State } from "../lib/data";

interface Report { id: string; name: string; head: string[]; rows: (s: State) => (string | number)[][] }
const REPORTS: Report[] = [
  { id: "stock", name: "Stock statement", head: ["Tag", "Piece", "Variant", "Location", "Status", "Price"], rows: (s) => s.items.filter((i) => i.status !== "Sold").map((i) => [i.tag, i.name, i.variant, i.loc, i.status, inr(i.price)]) },
  { id: "gold", name: "Gold ledger", head: ["Lot", "Fine gold balance", "Pieces made"], rows: (s) => s.lots.map((l) => [l.id, g(l.fine), s.items.filter((i) => i.lot === l.id).length]) },
  { id: "stone", name: "Stone ledger", head: ["Job card", "Issued", "Set", "Returned", "Difference"], rows: (s) => s.jcs.map((j) => [j.id, ct(j.stI), ct(j.stSet), ct(j.stRet), ct(jcCalc(j).stDiff)]) },
  { id: "vendor", name: "Vendor reconciliation", head: ["Job card", "Vendor", "Issued", "In pieces", "Scrap", "Unreconciled"], rows: (s) => s.jcs.map((j) => [j.id, j.vendor, g(j.issued), g(j.pieces), g(j.scrap), g(jcCalc(j).unrec)]) },
  { id: "jobcards", name: "Job card register", head: ["Job card", "Vendor", "SKU", "Qty", "State"], rows: (s) => s.jcs.map((j) => [j.id, j.vendor, j.sku, j.qty, j.state]) },
  { id: "huid", name: "HUID register", head: ["HUID", "Tag", "Fine gold", "Location"], rows: (s) => s.items.map((i) => [i.huid, i.tag, g(Math.round(i.net * PUR)), i.loc]) },
  { id: "cert", name: "Certificate register", head: ["Certificate", "Tag", "Stones", "Status"], rows: (s) => s.items.filter((i) => i.cert !== "None").map((i) => [i.cert, i.tag, ct(i.stones), i.status]) },
  { id: "sales", name: "Sales register", head: ["Invoice", "Date", "Channel", "Customer", "Store", "Amount", "Paid"], rows: (s) => s.invoices.map((v) => [v.id, v.date, v.channel, custName(s.customers, v.custId), v.store, inr(v.amount), inr(v.paid)]) },
  { id: "repairs", name: "Repair register", head: ["Case", "Piece", "Issue", "Step", "Quote"], rows: (s) => s.repairs.map((r) => [r.id, r.tag, r.issue, REPAIR_STEPS[r.state], inr(r.quote)]) },
  { id: "exchange", name: "Exchange and refund register", head: ["Request", "Type", "Reference", "Value", "State"], rows: (s) => s.approvals.filter((a) => a.type === "Refund" || a.type === "Exchange valuation").map((a) => [a.id, a.type, a.ref, a.value ? inr(a.value) : "", a.state]) },
  { id: "consign", name: "Consignment status", head: ["Memo", "Direction", "Party", "Pieces", "State"], rows: (s) => s.memos.map((m) => [m.id, m.dir, m.party, m.tags.length, m.state]) },
  { id: "ar", name: "Receivable ageing", head: ["Party", "Amount", "Age", "Invoice"], rows: (s) => receivables(s.invoices).map((v) => [custName(s.customers, v.custId), inr(v.amount - v.paid), ageBucket(v.date), v.id]) },
  { id: "ap", name: "Payable ageing", head: ["Party", "Amount", "Age", "Note"], rows: () => AP.map((r) => [r.party, inr(r.due), r.age, r.note]) },
  { id: "approvals", name: "Approval log", head: ["Request", "Type", "Reference", "Raised by", "State"], rows: (s) => s.approvals.map((a) => [a.id, a.type, a.ref, a.by, a.state]) },
  { id: "audit", name: "Audit trail", head: ["When", "Who", "What"], rows: (s) => s.log.map((l) => [l.t, l.u, l.text]) },
];

const toCsv = (head: string[], rows: (string | number)[][]) =>
  [head, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");

export default function Reports() {
  const { s, say } = useStore();
  const [id, setId] = useState("stock");
  const [q, setQ] = useState("");
  const r = REPORTS.find((x) => x.id === id)!;
  const rows = r.rows(s).filter((row) => !q || row.some((c) => String(c).toLowerCase().includes(q.toLowerCase())));

  const download = () => {
    const url = URL.createObjectURL(new Blob([toCsv(r.head, rows)], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `akoirah-${r.id}.csv`; a.click();
    URL.revokeObjectURL(url);
    say(`${r.name} exported, ${rows.length} rows`);
  };

  return (
    <>
      <PageHeader title="Reports" sub="Fifteen reports from the ledger. Filter the rows, then export to CSV.">
        <input aria-label="Filter rows" placeholder="Filter rows" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 rounded-lg border border-border bg-card px-3" />
        <Btn gold onClick={download}>Export CSV</Btn>
      </PageHeader>
      <div className="grid items-start gap-3.5 lg:grid-cols-[240px_1fr]">
        <nav aria-label="Reports" className="flex flex-col gap-0.5 rounded-[var(--radius)] border border-border bg-card p-2">
          {REPORTS.map((x) => (
            <button key={x.id} onClick={() => setId(x.id)} className={"rounded-lg px-2.5 py-1.5 text-left font-medium " + (x.id === id ? "bg-gold-light text-gold" : "hover:bg-muted")}>{x.name}</button>
          ))}
        </nav>
        <div>
          <h2 className="mb-2 text-xl font-semibold">{r.name} <span className="text-sm font-normal text-muted-foreground">{rows.length} rows</span></h2>
          <Grid head={r.head} rows={rows} />
        </div>
      </div>
    </>
  );
}
