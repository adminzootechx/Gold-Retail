"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "../lib/store";
import { REPAIR_STEPS, repairNext, submitExchange } from "../lib/actions";
import { exchange, inr } from "../lib/calc";
import { Badge, Btn, Card, Field, PageHeader, Rec, Table, Tabs, Tr, inputCls, type Kind } from "../components/ui";

type Tab = "repairs" | "exchange" | "refunds" | "credit";

export default function AfterSales() {
  const { s, act } = useStore();
  const [tab, setTab] = useState<Tab>("repairs");
  const [tag, setTag] = useState("AK-RNG-014-0005");
  const [ded, setDed] = useState(10);
  const [stone, setStone] = useState(40);
  const owned = s.items.filter((i) => i.cust);
  const it = s.items.find((i) => i.tag === tag) ?? owned[0];
  const e = exchange(it, stone, ded);
  const refund = s.approvals.find((a) => a.ref === "RF-88")!;
  const rk: [string, Kind] = refund.state === "pending" ? ["Awaiting approval", "warn"] : refund.state === "approved" ? ["Approved, return via QC", "ok"] : ["Rejected", "bad"];

  return (
    <>
      <PageHeader title="Repairs, exchange and refunds" sub={"Every case starts from a tag or invoice and stays on the piece’s history."} />
      <Tabs<Tab> tabs={[["repairs", "Repairs"], ["exchange", "Lifetime exchange"], ["refunds", "Refunds"], ["credit", "Credit notes"]]} value={tab} onChange={setTab} />

      {tab === "repairs" && (
        <Table head={["Case", "Piece", "Issue", "Step", "Quote", ""]} num={[4]}>
          {s.repairs.map((r) => (
            <Tr key={r.id} num={[4]} cells={[
              <span key="i" className="font-mono text-[12.5px]">{r.id}</span>,
              <Link key="t" href={"/trace?tag=" + r.tag} className="font-mono text-[12.5px] text-primary underline">{r.tag}</Link>,
              r.issue, <Badge key="s" kind={r.state === 7 ? "ok" : "gold"}>{REPAIR_STEPS[r.state]}</Badge>, inr(r.quote),
              r.state < 7 ? <Btn key="b" gold sm onClick={() => act((d) => repairNext(d, r.id))}>Next step</Btn> : "",
            ]} />
          ))}
        </Table>
      )}

      {tab === "exchange" && (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <Card title="Valuation sheet">
            <Field label="Piece, looked up by tag" htmlFor="extag">
              <select id="extag" className={inputCls} value={it.tag} onChange={(x) => setTag(x.target.value)}>{owned.map((i) => <option key={i.tag}>{i.tag}</option>)}</select>
            </Field>
            <Field label={`Deduction: ${ded}%`} htmlFor="exded"><input id="exded" type="range" min={0} max={30} value={ded} onChange={(x) => setDed(+x.target.value)} className="h-6" /></Field>
            <Field label={`Stone credit: ${stone}% of stone value`} htmlFor="exst"><input id="exst" type="range" min={0} max={100} value={stone} onChange={(x) => setStone(+x.target.value)} className="h-6" /></Field>
            <p className="text-[12.5px] text-muted-foreground">Policy values are placeholders to be confirmed with AKOIRAH.</p>
          </Card>
          <Card title="Credit">
            <Rec rows={[
              ["Original price (locked at sale)", inr(it.price)],
              [`Metal: ${e.fine.toFixed(3)} g fine at today's rate`, inr(e.metal)],
              [`Stones at ${stone}% of ${inr(e.stoneFull)}`, inr(e.stone)],
              ["Subtotal", inr(e.sub)],
              [`Deduction ${ded}%`, "-" + inr(e.deduction)],
              ["Credit note against new sale", inr(e.credit), true],
            ]} />
            <div className="mt-3"><Btn gold onClick={() => act((d) => submitExchange(d, it.tag))}>Submit for approval</Btn></div>
          </Card>
        </div>
      )}

      {tab === "refunds" && (
        <>
          <Table head={["Case", "Piece", "Customer", "Reason", "Amount", "Status"]} num={[4]}>
            <Tr num={[4]} cells={[<span key="i" className="font-mono text-[12.5px]">RF-88</span>, "AK-PND-007-0003", "Rohan Mehta", "Wrong length", inr(64000), <Badge key="s" kind={rk[1]}>{rk[0]}</Badge>]} />
          </Table>
          <p className="mt-3 text-muted-foreground">An approved refund reverses payment to the original mode. The piece returns through QC under the same item record.</p>
        </>
      )}

      {tab === "credit" && (
        <Table head={["Credit note", "Against", "Customer", "Amount", "Status"]} num={[3]}>
          <Tr num={[3]} cells={["CN-0207", "INV-3244", "Sana Qureshi", inr(18400), <Badge key="a" kind="ok">Approved</Badge>]} />
          <Tr num={[3]} cells={["CN-0208", "RF-88", "Rohan Mehta", inr(64000), <Badge key="b" kind={rk[1]}>{rk[0]}</Badge>]} />
        </Table>
      )}
    </>
  );
}
