"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { createPO } from "../lib/actions2";
import { inr } from "../lib/calc";
import { Btn, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Pill } from "../components/kit";
import { SUPPLIERS } from "../lib/mock";

type Tab = "pr" | "po" | "grn" | "qc" | "bill";

export default function Procurement() {
  const { s, act, say } = useStore();
  const [tab, setTab] = useState<Tab>("pr");
  const ordered = 500000;
  const [got, setGot] = useState(498620);
  const [checks, setChecks] = useState({ purity: true, certs: true, count: false });
  const diff = got - ordered;

  return (
    <>
      <PageHeader title="Procurement" sub="Purchase request, PO, goods receipt with weighing, inward QC and bill matching." />
      <Tabs<Tab> tabs={[["pr", "Purchase requests"], ["po", "Purchase orders"], ["grn", "GRN and weighing"], ["qc", "Inward QC"], ["bill", "Bill match"]]} value={tab} onChange={setTab} />

      {tab === "pr" && (
        <Grid head={["Request", "Item", "Quantity", "Raised by", "Reason", "Status"]}
          rows={[
            ["PR-908", "Round 1.0 mm melee, VS-EF", "14.00 ct", "Production", "Below minimum for JC-2412", <Pill key="a">Approved</Pill>],
            ["PR-909", "Bails 18K", "300 pcs", "Production", "Reorder alert", <Pill key="b">Pending</Pill>],
            ["PR-910", "Gift sleeves", "400 pcs", "Store", "Below reorder level", <Pill key="c">Pending</Pill>],
          ]} />
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
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <Card title="Receive against PO-3312, fine gold 999">
            <Field label="Ordered weight (mg)" htmlFor="ord"><input id="ord" disabled value={ordered} className={inputCls} /></Field>
            <Field label="Weighed on receipt (mg)" htmlFor="got"><input id="got" type="number" value={got} onChange={(e) => setGot(+e.target.value)} className={inputCls} /></Field>
            <Btn gold onClick={() => say("GRN-0458 saved, metal lot created (prototype)")}>Save GRN</Btn>
          </Card>
          <Card title="Weight check">
            <Rec rows={[["Ordered", (ordered / 1000).toFixed(3) + " g"], ["Received", (got / 1000).toFixed(3) + " g"], ["Difference", (diff / 1000).toFixed(3) + " g", true]]} />
            <div className="mt-3">{Math.abs(diff) > 500 ? <Pill>Variance, raise with supplier</Pill> : <Pill>Matched within tolerance</Pill>}</div>
          </Card>
        </div>
      )}

      {tab === "qc" && (
        <Card title="Inward QC checklist, GRN-0458" className="max-w-[520px]">
          {([["purity", "Purity tested at 999"], ["certs", "Certificates match the stones"], ["count", "Piece count verified"]] as const).map(([k, l]) => (
            <label key={k} className="mb-2.5 flex items-center gap-2.5">
              <input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} className="size-4 accent-[var(--gold)]" />{l}
            </label>
          ))}
          <Btn gold disabled={!Object.values(checks).every(Boolean)} onClick={() => say("QC passed, stock released to the vault (prototype)")}>Pass QC</Btn>
        </Card>
      )}

      {tab === "bill" && (
        <Grid head={["PO", "Ordered", "Received", "Billed", "Result"]} num={[1, 2, 3]}
          rows={[["PO-3312", "500.000 g", "498.620 g", "500.000 g", <Pill key="a">Variance, billed more than received</Pill>], ["PO-3305", "200 pcs", "200 pcs", "200 pcs", <Pill key="b">Matched</Pill>]]} />
      )}
    </>
  );
}
