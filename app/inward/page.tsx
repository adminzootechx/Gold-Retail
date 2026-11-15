"use client";
import { useState } from "react";
import Link from "../components/Go";
import { useStore } from "../lib/store";
import { INWARD_STEPS, inwardStep, inwardTag } from "../lib/actions";
import { linkCert, receiveHallmark, receivePieces, sendHallmark } from "../lib/actions3";
import { g } from "../lib/calc";
import { Badge, Btn, Card, PageHeader, Step, Tabs } from "../components/ui";
import { FormCard, Grid, Pill } from "../components/kit";
import { LabelSheet } from "../components/Labels";
import type { Inward } from "../lib/data";

type Tab = "receive" | "qc" | "hallmark" | "certs" | "tags";

export default function InwardPage() {
  const { s, act } = useStore();
  const [tab, setTab] = useState<Tab>("qc");

  const card = (p: Inward) => {
    const done = (i: number) => !!p.done[i] || (i === 4 && !p.need);
    const next = [0, 1, 2, 3, 4].find((i) => !done(i));
    const all = next === undefined;
    return (
      <Card key={p.id}>
        <div className="mb-2.5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <span className="text-muted-foreground">{p.id} · {p.jc} · {p.variant} · {g(p.rew ?? p.gross)}</span>
          </div>
          {p.tag && <Badge kind="ok">Tagged</Badge>}
        </div>
        <div className="flex flex-col gap-2">
          {INWARD_STEPS.map((label, i) => {
            const isNext = i === next && !p.tag;
            const note = i === 2 && p.huid ? "HUID " + p.huid : i === 3 && p.rew ? "Now " + g(p.rew) : i === 4 && !p.need ? "Not required for this SKU" : "";
            return (
              <Step key={label} done={done(i)} next={isNext} action={isNext ? <Btn gold sm onClick={() => act((d) => inwardStep(d, p.id))}>Mark done</Btn> : undefined}>
                <p>{label}</p>
                {note && <small className="block text-muted-foreground">{note}</small>}
              </Step>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {p.tag ? (
            <>
              <span className="font-mono text-[12.5px]">{p.tag}</span>
              <Link href={"/trace?tag=" + p.tag} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">View trace</Link>
            </>
          ) : (
            <>
              <Btn gold disabled={!all} onClick={() => act((d) => inwardTag(d, p.id))}>Generate tag</Btn>
              <span className="text-muted-foreground">{all ? "All checks complete." : "No tag until every step is done."}</span>
            </>
          )}
        </div>
      </Card>
    );
  };

  const tagged = s.items.filter((i) => i.status !== "Sold").slice(-12).reverse();

  return (
    <>
      <PageHeader title="Inward" sub="Receive, match, QC, hallmark, re-weigh, then tag." />
      <Tabs<Tab> tabs={[["receive", "Receive"], ["qc", "QC and tagging"], ["hallmark", "Hallmark"], ["certs", "Certificates"], ["tags", "Tag print queue"]]} value={tab} onChange={setTab} />

      {tab === "receive" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1.2fr_1fr]">
          <Grid head={["Job card", "Vendor", "Expected", "Received", "Status"]} num={[2, 3]}
            rows={s.jcs.map((j) => [j.id, j.vendor, j.qty, j.state === "At vendor" ? 0 : j.qty, <Pill key="s">{j.state === "At vendor" ? "At vendor" : j.state === "Closed" ? "Closed" : "Received"}</Pill>])} />
          <FormCard title="Receive pieces" cta="Record receipt" fields={[
            { id: "jc", label: "Job card", type: "select", options: s.jcs.map((j) => j.id) },
            { id: "n", label: "Pieces", type: "number", value: "6" },
            { id: "w", label: "Total gross weight (mg)", type: "number", value: "31800" },
          ]} onSubmit={(v) => act((d) => receivePieces(d, v.jc, +v.n, +v.w))} />
        </div>
      )}

      {tab === "qc" && <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3.5">{s.inw.map(card)}</div>}

      {tab === "hallmark" && (
        <>
          <Grid head={["Piece", "HUID", "Where", "Status", ""]}
            rows={[
              ...s.inw.filter((p) => p.done[1] && !p.tag).map((p) => [p.id, p.huid ?? "Pending", "HO", <Pill key="a">{p.huid ? "Received" : p.sent ? "At hallmark centre" : "Pending"}</Pill>, p.huid || p.sent ? "" : <Btn key="b" sm gold onClick={() => act((d) => sendHallmark(d, p.id))}>Send out</Btn>]),
              ...s.items.filter((i) => i.status === "AtHallmark").map((i) => [i.tag, i.huid, "Hallmark centre", <Pill key={i.tag}>At hallmark</Pill>, <Btn key="r" sm onClick={() => act((d) => receiveHallmark(d, i.tag))}>Receive back</Btn>]),
            ]} />
          <p className="mt-2 text-[12.5px] text-muted-foreground">Every piece is re-weighed when it returns, because hallmarking removes a little metal.</p>
        </>
      )}

      {tab === "certs" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1.3fr_1fr]">
          <Grid head={["Tag", "Certificate", "Stones", "HUID"]} rows={s.items.filter((i) => i.cert !== "None").map((i) => [<span key="t" className="font-mono text-[12.5px]">{i.tag}</span>, i.cert, (i.stones / 100).toFixed(2) + " ct", i.huid])} />
          <FormCard title="Link a certificate" cta="Link certificate" fields={[
            { id: "tag", label: "Tag", type: "select", options: s.items.map((i) => i.tag) },
            { id: "lab", label: "Lab", type: "select", options: ["IGI", "SGL"] },
            { id: "no", label: "Report number", placeholder: "LG6120999" },
          ]} onSubmit={(v) => act((d) => linkCert(d, v.tag, v.lab, v.no))} />
        </div>
      )}

      {tab === "tags" && <LabelSheet items={tagged} />}
    </>
  );
}
