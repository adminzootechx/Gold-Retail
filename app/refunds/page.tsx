"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { inr } from "../lib/calc";
import { Badge, Btn, PageHeader, Table, Tr } from "../components/ui";
import { NewRefund } from "../components/Create";

export default function Refunds() {
  const { s } = useStore();
  const [adding, setAdding] = useState(false);
  const refunds = s.approvals.filter((a) => a.type === "Refund");
  return (
    <>
      <PageHeader title="Refunds" sub="An approved refund reverses payment and returns the piece through QC.">
        <Btn gold onClick={() => setAdding(true)}>New refund request</Btn>
      </PageHeader>
      <NewRefund open={adding} onClose={() => setAdding(false)} />
      <Table head={["Case", "Piece", "Reason", "Amount", "Status"]} num={[3]}>
        {refunds.map((a) => (
          <Tr key={a.id} num={[3]} cells={[
            <span key="i" className="font-mono text-[12.5px]">{a.ref}</span>, <span key="t" className="font-mono text-[12.5px]">{a.tag ?? "-"}</span>, a.detail, a.value ? inr(a.value) : "-",
            <Badge key="s" kind={a.state === "approved" ? "ok" : a.state === "rejected" ? "bad" : "warn"}>{a.state === "approved" ? "Approved, back in stock" : a.state === "rejected" ? "Rejected" : "Awaiting approval"}</Badge>,
          ]} />
        ))}
      </Table>
      {!refunds.length && <p className="mt-2 text-muted-foreground">No refund has been requested.</p>}
      <p className="mt-3 text-muted-foreground">Approve or reject requests under Security &amp; Approval Matrix, in Pending approvals.</p>
    </>
  );
}
