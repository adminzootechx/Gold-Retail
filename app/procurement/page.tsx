"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { createPO } from "../lib/actions2";
import { decidePr, orderedMg, passQc, postGrn, raisePr } from "../lib/actions3";
import { ofKind } from "../lib/records";
import { inr } from "../lib/calc";
import { Btn, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Pill } from "../components/kit";
import { NewPurchaseOrder, NewRequest } from "../components/Create";
import { SUPPLIERS } from "../lib/mock";

type Tab = "pr" | "po" | "grn" | "qc" | "bill";

export default function Procurement() {
  const { s, act } = useStore();
  const canDecide = s.role === "Founder" || s.role === "Production manager";
  const [tab, setTab] = useState<Tab>("pr");
  const [req, setReq] = useState(false);
  const [newPo, setNewPo] = useState(false);
  const open = s.pos.filter((p) => p.state === "Sent");
  const [po, setPo] = useState("PO-3312");
  const cur = s.pos.find((p) => p.id === po && p.state === "Sent") ?? open[0];
  const ordered = cur ? orderedMg(cur.qty) : 0;
  const [gotIn, setGot] = useState<number | null>(null);
  const got = gotIn ?? Math.round(ordered * 0.9972);
  const diff = got - ordered;
  const grns = ofKind(s.records, "grn");
  const waiting = grns.filter((x) => !s.records.some((q) => q.kind === "qc" && q.f.grn === x.id));
  const [grn, setGrn] = useState("");
  const [checks, setChecks] = useState({ purity: false, certs: false, count: false });

  return (
    <>
      <PageHeader title="Procurement" sub="Request, order, receive, QC and bill match.">
        <Btn onClick={() => setReq(true)}>Raise purchase request</Btn>
        <Btn gold onClick={() => setNewPo(true)}>New purchase order</Btn>
      </PageHeader>
      <NewRequest open={req} onClose={() => setReq(false)} />
      <NewPurchaseOrder open={newPo} onClose={() => setNewPo(false)} />
      <Tabs<Tab> tabs={[["pr", "Purchase requests"], ["po", "Purchase orders"], ["grn", "GRN and weighing"], ["qc", "Inward QC"], ["bill", "Bill match"]]} value={tab} onChange={setTab} />

      {tab === "pr" && (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.7fr]">
          <FormCard title="Raise a request" cta="Raise request" fields={[
            { id: "item", label: "Item", placeholder: "Round 1.0 mm melee, VS-EF" },
            { id: "qty", label: "Quantity", value: "10 pcs" },
            { id: "reason", label: "Reason", value: "Below reorder level" },
          ]} onSubmit={(v) => act((d) => raisePr(d, v.item, v.qty, v.reason))} />
          <Grid head={["Request", "Item", "Quantity", "Raised by", "Reason", "Status", ""]}
            rows={ofKind(s.records, "pr").map((p) => [p.id, p.f.item, p.f.qty, p.f.from, p.f.reason, <Pill key="s">{p.f.status}</Pill>,
              p.f.status === "Pending" && canDecide && p.f.from !== s.role ? <span key="b" className="flex gap-2"><Btn sm gold onClick={() => act((d) => decidePr(d, p.id, "Approved"))}>Approve</Btn><Btn sm onClick={() => act((d) => decidePr(d, p.id, "Rejected"))}>Reject</Btn></span> : ""])} />
        </div>
      )}

      {tab === "po" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_1.3fr]">
          <FormCard title="PO builder" cta="Create purchase order" fields={[
            { id: "supplier", label: "Supplier", type: "select", options: SUPPLIERS },
            { id: "what", label: "Item", value: "Fine gold 999" },
            { id: "qty", label: "Quantity", value: "100.000 g" },
            { id: "value", label: "Value (rupees)", type: "number", value: "1325000" },
          ]} onSubmit={(v) => act((d) => createPO(d, v.supplier, v.what, v.qty, +v.value || 0))} />
          <Grid head={["PO", "Supplier", "Item", "Value", "Status"]} num={[3]}
            rows={s.pos.map((p) => [<span key="i" className="font-mono text-[12.5px]">{p.id}</span>, p.supplier, p.what, inr(p.value), <Pill key="s">{p.state}</Pill>])} />
        </div>
      )}

      {tab === "grn" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card title="Receive against a purchase order">
            <Field label="Purchase order" htmlFor="grn-po">
              <select id="grn-po" className={inputCls} value={cur?.id ?? ""} onChange={(e) => { setPo(e.target.value); setGot(null); }}>
                {open.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.supplier} · {p.what}</option>)}
              </select>
            </Field>
            {ordered > 0 ? (
              <>
                <Field label="Ordered weight (mg)" htmlFor="ord"><input id="ord" disabled value={ordered} className={inputCls} /></Field>
                <Field label="Weighed on receipt (mg)" htmlFor="got"><input id="got" type="number" value={got} onChange={(e) => setGot(+e.target.value)} className={inputCls} /></Field>
              </>
            ) : cur && <p className="mb-3 text-muted-foreground">Count the pieces on receipt: {cur.qty} ordered.</p>}
            <Btn gold disabled={!cur} onClick={() => { act((d) => postGrn(d, cur!.id, got)); setGot(null); }}>Save goods receipt</Btn>
            {!open.length && <p className="mt-2 text-muted-foreground">Nothing is waiting to be received. Send a purchase order first.</p>}
          </Card>
          <Card title="Weight check">
            {ordered > 0 ? (
              <>
                <Rec rows={[["Ordered", (ordered / 1000).toFixed(3) + " g"], ["Received", (got / 1000).toFixed(3) + " g"], ["Difference", (diff / 1000).toFixed(3) + " g", true]]} />
                <div className="mt-3">{Math.abs(diff) > 500 ? <Pill>Variance, raise with supplier</Pill> : <Pill>Matched within tolerance</Pill>}</div>
                <p className="mt-3 text-muted-foreground">Saving creates a metal lot with the received fine gold at 999 purity.</p>
              </>
            ) : <p className="text-muted-foreground">Weight is checked for metal orders. Other items are checked by count.</p>}
          </Card>
          <div className="lg:col-span-2"><Grid head={["Receipt", "Date", "Purchase order", "Supplier", "Ordered", "Received", "Result", "Metal lot"]}
            rows={grns.map((x) => [x.id, x.date, x.f.po, x.f.supplier, x.f.ordered, x.f.received, <Pill key="r">{x.f.result}</Pill>, x.f.lot])} /></div>
        </div>
      )}

      {tab === "qc" && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card title="Inward QC checklist">
            <Field label="Goods receipt" htmlFor="qc-grn">
              <select id="qc-grn" className={inputCls} value={waiting.some((x) => x.id === grn) ? grn : waiting[0]?.id ?? ""} onChange={(e) => setGrn(e.target.value)}>
                {waiting.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.f.supplier}</option>)}
              </select>
            </Field>
            {([["purity", "Purity tested"], ["certs", "Certificates match the stones"], ["count", "Piece count verified"]] as const).map(([k, l]) => (
              <label key={k} className="mb-2.5 flex items-center gap-2.5">
                <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} className="size-4 accent-[var(--gold)]" />{l}
              </label>
            ))}
            <Btn gold disabled={!waiting.length || !Object.values(checks).every(Boolean)} onClick={() => { act((d) => passQc(d, waiting.some((x) => x.id === grn) ? grn : waiting[0].id)); setChecks({ purity: false, certs: false, count: false }); }}>Pass QC</Btn>
            {!waiting.length && <p className="mt-2 text-muted-foreground">Every goods receipt has passed QC.</p>}
          </Card>
          <Grid head={["QC", "Receipt", "Result", "Date", "By"]} rows={ofKind(s.records, "qc").map((x) => [x.id, x.f.grn, <Pill key="r">{x.f.result}</Pill>, x.date, x.by])} />
        </div>
      )}

      {tab === "bill" && (
        <Grid head={["Receipt", "Purchase order", "Supplier", "Ordered", "Received", "Billed", "Result"]} num={[3, 4, 5]}
          rows={grns.map((x) => [x.id, x.f.po, x.f.supplier, x.f.ordered, x.f.received, x.f.ordered, <Pill key="r">{x.f.result === "Matched" ? "Matched" : "Variance, billed more than received"}</Pill>])} />
      )}

    </>
  );
}
