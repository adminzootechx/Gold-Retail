"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { RATE24, g, inr } from "../lib/calc";
import { Bars, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";
import { AP, GOLD_RATES, VENDORS } from "../lib/mock";
import { ageBucket, custName, receivables } from "../lib/stats";

type Tab = "rate" | "ar" | "ap" | "ledger" | "voucher" | "credit" | "daybook";
const sum = (a: { due: number }[]) => a.reduce((x, r) => x + r.due, 0);
const byAge = (a: { due: number; age: string }[]): [string, number][] => ["0-30", "31-60", "61-90+"].map((b) => [b + " days", a.filter((r) => r.age === b).reduce((x, r) => x + r.due, 0)]);

export default function Finance() {
  const { s, say } = useStore();
  const [tab, setTab] = useState<Tab>("rate");
  const [vendor, setVendor] = useState(VENDORS[0].name);
  const AR = receivables(s.invoices).map((v) => ({ party: custName(s.customers, v.custId), due: v.amount - v.paid, age: ageBucket(v.date), note: v.id }));

  return (
    <>
      <PageHeader title="Finance and accounts" sub="Daily gold rate, receivables and payables, vendor ledger, vouchers, credit notes and the day book." />
      <Tabs<Tab> tabs={[["rate", "Gold rate"], ["ar", "Receivables"], ["ap", "Payables"], ["ledger", "Vendor ledger"], ["voucher", "Receipts and payments"], ["credit", "Credit notes"], ["daybook", "Day book"]]} value={tab} onChange={setTab} />

      {tab === "rate" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-3.5">
            <Card title="Today"><Rec rows={[["24K per gram", inr(RATE24)], ["18K per gram", inr(RATE24 * 0.75), true]]} /></Card>
            <FormCard title="Update rate" cta="Save rate" fields={[{ id: "r", label: "24K rate per gram", type: "number", value: String(RATE24) }]} onSubmit={(v) => say(`Rate of ${inr(+v.r)} saved for today (prototype)`)} />
          </div>
          <Grid head={["Date", "24K / g", "18K / g", "Source"]} num={[1, 2]} rows={GOLD_RATES} />
        </div>
      )}

      {tab === "ar" && (
        <>
          <Kpis items={[["Receivable", inr(sum(AR))], ["Overdue over 60 days", inr(AR.filter((r) => r.age === "61-90+").reduce((x, r) => x + r.due, 0))]]} />
          <div className="grid items-start gap-3.5 lg:grid-cols-[1.4fr_1fr]">
            <Grid head={["Party", "Amount", "Age", "Note"]} num={[1]} rows={AR.map((r) => [r.party, inr(r.due), <Pill key="a">{r.age === "61-90+" ? "Overdue " + r.age : "Due " + r.age}</Pill>, r.note])} />
            <Card title="Ageing"><Bars data={byAge(AR)} fmt={(v) => inr(v / 1000).replace("₹", "") + "k"} /></Card>
          </div>
        </>
      )}

      {tab === "ap" && (
        <>
          <Kpis items={[["Payable", inr(sum(AP))], ["Due this week", inr(AP.filter((r) => r.age === "0-30").reduce((x, r) => x + r.due, 0))]]} />
          <div className="grid items-start gap-3.5 lg:grid-cols-[1.4fr_1fr]">
            <Grid head={["Party", "Amount", "Age", "Note"]} num={[1]} rows={AP.map((r) => [r.party, inr(r.due), <Pill key="a">{r.age === "61-90+" ? "Overdue " + r.age : "Due " + r.age}</Pill>, r.note])} />
            <Card title="Ageing"><Bars data={byAge(AP)} fmt={(v) => inr(v / 1000).replace("₹", "") + "k"} /></Card>
          </div>
        </>
      )}

      {tab === "ledger" && (
        <>
          <div className="mb-3.5 max-w-xs"><Field label="Vendor" htmlFor="vl"><select id="vl" className={inputCls} value={vendor} onChange={(e) => setVendor(e.target.value)}>{VENDORS.map((v) => <option key={v.name}>{v.name}</option>)}</select></Field></div>
          <Grid head={["Date", "Entry", "Reference", "Gold", "Amount"]} num={[3, 4]}
            rows={s.jcs.filter((j) => j.vendor === vendor).flatMap((j) => [
              ["04 Oct", "Gold issued", j.id, "+" + g(j.issued), "-"],
              ...(j.pieces ? [["18 Oct", "Pieces and scrap returned", j.id, "-" + g(j.pieces + j.scrap), "-"], ["19 Oct", "Making charges billed", j.id, "-", inr(j.qty * 3500)]] : []),
            ])} />
        </>
      )}

      {tab === "voucher" && (
        <FormCard className="max-w-[560px]" title="Receipt or payment" cta="Post voucher" fields={[
          { id: "type", label: "Type", type: "select", options: ["Receipt", "Payment"] },
          { id: "party", label: "Party", value: "Corporate Gifting Co." },
          { id: "amt", label: "Amount", type: "number", value: "840000" },
          { id: "mode", label: "Mode", type: "select", options: ["Bank transfer", "UPI", "Cash", "Cheque"] },
        ]} onSubmit={(v) => say(`${v.type} of ${inr(+v.amt)} from ${v.party} posted (prototype)`)} />
      )}

      {tab === "credit" && (
        <Grid head={["Credit note", "Against", "Customer", "Amount", "Status"]} num={[3]}
          rows={[
            ...s.approvals.filter((a) => a.type === "Refund" || a.type === "Exchange valuation").map((a) => ["CN-" + a.id.slice(3), a.ref, a.detail, a.value ? inr(a.value) : "At valuation", <Pill key={a.id}>{a.state === "approved" ? "Approved" : a.state === "rejected" ? "Rejected" : "Pending"}</Pill>]),
            ["CN-0207", "INV-3244", "Sana Qureshi", inr(18400), <Pill key="x">Approved</Pill>],
          ]} />
      )}

      {tab === "daybook" && (
        <Grid head={["When", "Entry"]} rows={s.log.slice(0, 14).map((l) => [l.t, l.text])} />
      )}
    </>
  );
}
