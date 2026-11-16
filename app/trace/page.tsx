"use client";
import { Suspense } from "react";
import Link from "../components/Go";
import { useSearchParams } from "next/navigation";
import { useStore } from "../lib/store";
import { ct, g, inr, PUR } from "../lib/calc";
import { REPAIR_STEPS } from "../lib/steps";
import { ofKind, forSku } from "../lib/records";
import { Badge, Card, PageHeader, Rec, StatusBadge } from "../components/ui";
import { Grid } from "../components/kit";
import { LabelSheet } from "../components/Labels";
import FilesCard from "../components/FilesCard";
import type { Item, State } from "../lib/data";

/** The piece's history. Pieces made in the app carry every event as it happened. Sample pieces start with a sample history up to tagging, then show real events. */
function events(s: State, it: Item): [string, string][] {
  const j = s.jcs.find((x) => x.id === it.jc);
  const real = it.ev ?? [];
  if (it.real || !j) return real;
  const e: [string, string][] = [
    ["04 Oct", `Job card ${j.id} opened with ${j.vendor}`],
    ["06 Oct", `Fine gold issued from lot ${it.lot}, ${ct(j.stI)} stones issued to the job`],
    ["18 Oct", "Received at HO and weighed " + g(it.gross)],
    ["18 Oct", it.cert === "None" ? "Stones checked, no certificate required" : "Stones matched to certificate " + it.cert],
    ["19 Oct", "QC passed"],
  ];
  if (it.status === "AtHallmark") return [...e, ["21 Oct", "Sent to the hallmark centre"], ...real];
  e.push(["22 Oct", "Hallmarked, HUID " + it.huid], ["22 Oct", "Re-weighed after hallmark"], ["24 Oct", `Tagged ${it.tag} and placed in HO Vault`]);
  // Where a sample piece is now, before anything recorded in the app.
  if (!real.length) {
    if (it.status === "Reserved") e.push(["09 Nov", "Reserved for order " + it.order]);
    if (it.status === "Sold") e.push(["02 Nov", `Sold on ${it.inv} to ${it.cust}`]);
    if (it.status === "InRepair") e.push(["08 Nov", `Sold on ${it.inv}, now in repair case RP-301`]);
    if (it.status === "OnConsignment") e.push(["05 Nov", `Memo ${it.memo} out to partner`]);
    if (it.status === "InTransit") e.push(["11 Nov", "Transfer from HO to Delhi Store, in transit"]);
    if (it.status === "InStock" && it.loc !== "HO Vault") e.push(["01 Nov", "Transferred to " + it.loc]);
  }
  return [...e, ...real];
}

function Trace() {
  const { s } = useStore();
  const tag = useSearchParams().get("tag");
  const it = s.items.find((i) => i.tag === tag);

  if (!it) {
    return (
      <>
        <PageHeader title="Mandatory Traceability" sub="Search a tag, HUID, certificate or order." />
        <Card><div className="flex flex-wrap gap-2">
          {s.items.slice(0, 6).map((i) => <Link key={i.tag} href={"/trace?tag=" + i.tag} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">{i.tag}</Link>)}
        </div></Card>
      </>
    );
  }
  const j = s.jcs.find((x) => x.id === it.jc);
  const same = s.items.filter((x) => x.lot === it.lot);
  const stones = [...ofKind(s.records, "stone"), ...ofKind(s.records, "cstone")].filter((r) => r.f.where.includes(it.tag));
  const bom = forSku(s.records, "bom", it.sku);
  const web = s.orders.filter((o) => o.item === it.tag || it.order === o.id);
  const hni = ofKind(s.records, "hni").filter((r) => r.f.item === it.tag);
  const repairs = s.repairs.filter((r) => r.tag === it.tag);
  const cases = s.approvals.filter((a) => a.tag === it.tag || (a.type === "Exchange valuation" && a.ref === it.tag));
  const audit = s.log.filter((l) => l.text.includes(it.tag));
  const inv = s.invoices.find((v) => v.id === it.inv);
  const own = web.length + hni.length + (inv ? 1 : 0);
  return (
    <>
      <PageHeader title={`${it.name} · ${it.variant}`} sub={<><span className="font-mono text-[12.5px]">{it.tag}</span> <StatusBadge status={it.status} /></>}>
        <Link href="/inventory" className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted">Back to inventory</Link>
      </PageHeader>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-6">
        <Card title="Piece">
          <Rec rows={[["SKU", it.sku], ["Gross weight", g(it.gross)], ["Net metal", g(it.net)], ["Fine gold", g(Math.round(it.net * PUR))], ["Stones", ct(it.stones)],
            ["HUID", it.huid], ["Certificate", it.cert], ["Location", it.loc], ["Price", inr(it.price)]]} />
        </Card>
        <Card title="Gold and job worker">
          <Rec rows={[["Job card", j?.id ?? it.jc], ["Job worker", j?.vendor ?? "-"], ["Metal lot", it.lot], ["Stones issued to job", j ? ct(j.stI) : "-"]]} />
          <h3 className="mb-1.5 mt-4 text-lg font-semibold">Reverse trace</h3>
          <p className="mb-2 text-muted-foreground">{same.length} pieces were made from lot {it.lot}:</p>
          <div className="flex flex-wrap gap-2">
            {same.map((x) => <Link key={x.tag} href={"/trace?tag=" + x.tag} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">{x.tag.slice(3)}</Link>)}
          </div>
        </Card>
        <Card title="Diamonds and colour stones">
          {stones.length ? (
            <ul className="flex flex-col gap-2">
              {stones.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <Badge kind={r.kind === "stone" ? "info" : "gold"}>{r.kind === "stone" ? "Certified diamond" : "Colour stone"}</Badge>
                  <span className="font-mono text-[12.5px]">{r.f.no ?? r.f.lot}</span>
                  <span className="text-muted-foreground">{r.kind === "stone" ? `${r.f.weight}, ${r.f.shape}, ${r.f.colour} ${r.f.clarity}` : `${r.f.type}, ${r.f.ct} ct`}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-muted-foreground">{it.cert === "None" ? "No certified stone on this piece." : `Certificate ${it.cert}. This stone is not yet linked to a register entry.`}</p>}
          {bom && <p className="mt-3 text-muted-foreground">Melee per the bill of materials: {bom.f.melee} ct.</p>}
        </Card>
        <Card title="Customer orders">
          {own ? (
            <ul className="flex flex-col gap-1.5">
              {inv && <li>Invoice <span className="font-mono text-[12.5px]">{inv.id}</span>, {inr(inv.amount)}, {inv.channel}</li>}
              {web.map((o) => <li key={o.id}>Online order <span className="font-mono text-[12.5px]">{o.id}</span> for {o.cust}</li>)}
              {hni.map((r) => <li key={r.id}>High-value order <span className="font-mono text-[12.5px]">{r.id}</span> for {r.f.cust}, {r.f.state.toLowerCase()}</li>)}
            </ul>
          ) : <p className="text-muted-foreground">No customer order yet.</p>}
        </Card>
        <Card title="Repairs, exchanges and refunds">
          {repairs.length + cases.length ? (
            <ul className="flex flex-col gap-1.5">
              {repairs.map((r) => <li key={r.id}>Repair <span className="font-mono text-[12.5px]">{r.id}</span>: {r.issue}, {REPAIR_STEPS[r.state].toLowerCase()}</li>)}
              {cases.map((a) => <li key={a.id}>{a.type === "Refund" ? "Refund" : "Lifetime exchange"} <span className="font-mono text-[12.5px]">{a.ref}</span>, {a.state}</li>)}
            </ul>
          ) : <p className="text-muted-foreground">No repair, exchange or refund on this piece.</p>}
        </Card>
      </div>
      <div className="mt-6"><FilesCard key={it.tag} folder={`certificates/${it.tag}`} title="Certificates and documents" /></div>
      <Card title="Tag label" className="mt-6"><LabelSheet items={[it]} /></Card>
      <Card title="Timeline" className="mt-6">
        <ul className="border-l-2 border-border pl-3.5">
          {events(s, it).map(([d, t], i) => (
            <li key={i} className="relative pb-3.5 pl-3.5 before:absolute before:-left-[22px] before:top-[5px] before:size-2.5 before:rounded-full before:bg-gold">
              <small className="block text-muted-foreground">{d}</small>{t}
            </li>
          ))}
        </ul>
      </Card>
      <h2 className="mb-3 mt-10 text-xl font-semibold">Audit trail</h2>
      <Grid head={["When", "Who", "What"]} rows={audit.map((l) => [l.t, l.u, l.text])} />
      {!audit.length && <p className="mt-2 text-muted-foreground">Nothing has been recorded against this tag yet.</p>}
    </>
  );
}

export default function TracePage() {
  return <Suspense fallback={null}><Trace /></Suspense>;
}
