"use client";
import { useState } from "react";
import Link from "../components/Go";
import { useStore } from "../lib/store";
import { REPAIR_STEPS, repairNext } from "../lib/actions";
import { inr } from "../lib/calc";
import { Badge, Btn, PageHeader, Table, Tr } from "../components/ui";
import { NewRepair } from "../components/Create";

export default function Repairs() {
  const { s, act } = useStore();
  const [adding, setAdding] = useState(false);
  return (
    <>
      <PageHeader title="Repairs" sub="Every case starts from a tag, so the history stays on the piece.">
        <Btn gold onClick={() => setAdding(true)}>New repair</Btn>
      </PageHeader>
      <NewRepair open={adding} onClose={() => setAdding(false)} />
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
    </>
  );
}
