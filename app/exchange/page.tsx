"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { submitExchange } from "../lib/actions";
import { exchange, inr } from "../lib/calc";
import { Badge, Btn, Card, Field, PageHeader, Rec, Table, Tr, inputCls } from "../components/ui";

export default function LifetimeExchange() {
  const { s, act } = useStore();
  const [tag, setTag] = useState("AK-RNG-014-0005");
  const [ded, setDed] = useState(10);
  const [stone, setStone] = useState(40);
  const owned = s.items.filter((i) => i.cust);
  const it = s.items.find((i) => i.tag === tag) ?? owned[0];
  const e = exchange(it, stone, ded);
  const cases = s.approvals.filter((a) => a.type === "Exchange valuation");

  return (
    <>
      <PageHeader title="Lifetime Exchange" sub="Value a piece against today's gold rate and issue a credit note." />
      <div className="grid items-start gap-6 lg:grid-cols-2">
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
      <h2 className="mb-3 mt-10 text-xl font-semibold">Exchange cases</h2>
      <Table head={["Request", "Piece", "Detail", "Status"]}>
        {cases.map((a) => <Tr key={a.id} cells={[a.id, <span key="t" className="font-mono text-[12.5px]">{a.ref}</span>, a.detail, <Badge key="s" kind={a.state === "approved" ? "ok" : a.state === "rejected" ? "bad" : "warn"}>{a.state === "approved" ? "Approved" : a.state === "rejected" ? "Rejected" : "Awaiting approval"}</Badge>]} />)}
      </Table>
      {!cases.length && <p className="mt-2 text-muted-foreground">No exchange has been submitted yet.</p>}
    </>
  );
}
