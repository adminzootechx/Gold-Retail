"use client";
import { useStore } from "../lib/store";
import { decide } from "../lib/actions";
import { inr } from "../lib/calc";
import { Badge, Btn, PageHeader, Table, Tr } from "../components/ui";

export default function Approvals() {
  const { s, act } = useStore();
  return (
    <>
      <PageHeader title="Approvals" sub="Anything above its limit waits here. Nobody approves their own request." />
      <Table head={["Request", "Type", "Reference", "Raised by", "Detail", "Value", "Decision"]} num={[5]}>
        {s.approvals.map((a) => (
          <Tr key={a.id} num={[5]} cells={[
            <span key="i" className="font-mono text-[12.5px]">{a.id}</span>, a.type, a.ref, a.by, a.detail, a.value ? inr(a.value) : "-",
            a.state !== "pending" ? <Badge key="d" kind={a.state === "approved" ? "ok" : "bad"}>{a.state === "approved" ? "Approved" : "Rejected"}</Badge>
            : a.by === s.role ? <span key="d" className="text-muted-foreground">Your own request</span>
            : <span key="d" className="flex gap-1.5">
                <Btn gold sm onClick={() => act((d) => decide(d, a.id, "approved"))}>Approve</Btn>
                <Btn sm onClick={() => act((d) => decide(d, a.id, "rejected"))}>Reject</Btn>
              </span>,
          ]} />
        ))}
      </Table>
    </>
  );
}
