"use client";
import { useStore } from "../lib/store";
import { PageHeader, Table, Tr } from "../components/ui";

export default function Audit() {
  const { s } = useStore();
  return (
    <>
      <PageHeader title="Audit log" sub="Who did what, and when. Every action in this prototype writes here." />
      <Table head={["When", "Who", "What"]}>
        {s.log.map((l, i) => <Tr key={i} cells={[l.t, l.u, l.text]} />)}
      </Table>
    </>
  );
}
