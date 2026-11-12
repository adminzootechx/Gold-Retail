"use client";
import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useStore } from "../lib/store";
import { ct, g, inr, PUR } from "../lib/calc";
import { Card, PageHeader, Rec, StatusBadge } from "../components/ui";
import { LabelSheet } from "../components/Labels";
import FilesCard from "../components/FilesCard";
import type { Item, State } from "../lib/data";

function events(s: State, it: Item): [string, string][] {
  const j = s.jcs.find((x) => x.id === it.jc)!;
  const e: [string, string][] = [
    ["04 Oct", `Job card ${j.id} opened with ${j.vendor}`],
    ["06 Oct", `Fine gold issued from lot ${it.lot}, ${ct(j.stI)} stones issued to the job`],
    ["18 Oct", "Received at HO and weighed " + g(it.gross)],
    ["18 Oct", it.cert === "None" ? "Stones checked, no certificate required" : "Stones matched to certificate " + it.cert],
    ["19 Oct", "QC passed"],
  ];
  if (it.status === "AtHallmark") return [...e, ["21 Oct", "Sent to the hallmark centre"]];
  e.push(["22 Oct", "Hallmarked, HUID " + it.huid], ["22 Oct", "Re-weighed after hallmark"], ["24 Oct", `Tagged ${it.tag} and placed in HO Vault`]);
  if (it.status === "Reserved") e.push(["09 Nov", "Reserved for order " + it.order]);
  if (it.status === "Sold") e.push(["02 Nov", `Sold on ${it.inv} to ${it.cust}`]);
  if (it.status === "InRepair") e.push(["08 Nov", `Sold on ${it.inv}, now in repair case RP-301`]);
  if (it.status === "OnConsignment") e.push(["05 Nov", `Memo ${it.memo} out to partner`]);
  if (it.status === "InTransit") e.push(["11 Nov", "Transfer from HO to Delhi Store, in transit"]);
  if (it.status === "InStock" && it.loc !== "HO Vault") e.push(["01 Nov", "Transferred to " + it.loc]);
  return e;
}

function Trace() {
  const { s } = useStore();
  const tag = useSearchParams().get("tag");
  const it = s.items.find((i) => i.tag === tag);

  if (!it) {
    return (
      <>
        <PageHeader title="Trace a piece" sub="Search a tag, HUID, certificate number or order in the top bar, or pick one." />
        <Card><div className="flex flex-wrap gap-2">
          {s.items.slice(0, 6).map((i) => <Link key={i.tag} href={"/trace?tag=" + i.tag} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">{i.tag}</Link>)}
        </div></Card>
      </>
    );
  }
  const j = s.jcs.find((x) => x.id === it.jc)!;
  const same = s.items.filter((x) => x.lot === it.lot);
  return (
    <>
      <PageHeader title={`${it.name} · ${it.variant}`} sub={<><span className="font-mono text-[12.5px]">{it.tag}</span> <StatusBadge status={it.status} /></>}>
        <Link href="/inventory" className="rounded-lg border border-border bg-card px-3.5 py-1.5 text-sm font-semibold hover:bg-muted">Back to inventory</Link>
      </PageHeader>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(340px,1fr))] gap-3.5">
        <Card title="Piece">
          <Rec rows={[["SKU", it.sku], ["Gross weight", g(it.gross)], ["Net metal", g(it.net)], ["Fine gold", g(Math.round(it.net * PUR))], ["Stones", ct(it.stones)],
            ["HUID", it.huid], ["Certificate", it.cert], ["Location", it.loc], ["Price", inr(it.price)]]} />
        </Card>
        <Card title="Origin">
          <Rec rows={[["Job card", j.id], ["Vendor", j.vendor], ["Metal lot", it.lot], ["Stones issued to job", ct(j.stI)]]} />
          <h3 className="mb-1.5 mt-4 text-lg font-semibold">Reverse trace</h3>
          <p className="mb-2 text-muted-foreground">{same.length} pieces were made from lot {it.lot}:</p>
          <div className="flex flex-wrap gap-2">
            {same.map((x) => <Link key={x.tag} href={"/trace?tag=" + x.tag} className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted">{x.tag.slice(3)}</Link>)}
          </div>
        </Card>
      </div>
      <div className="mt-3.5"><FilesCard key={it.tag} folder={`certificates/${it.tag}`} title="Certificates and documents" /></div>
      <Card title="Tag label" className="mt-3.5"><LabelSheet items={[it]} /></Card>
      <Card title="Timeline" className="mt-3.5">
        <ul className="border-l-2 border-border pl-3.5">
          {events(s, it).map(([d, t], i) => (
            <li key={i} className="relative pb-3.5 pl-3.5 before:absolute before:-left-[22px] before:top-[5px] before:size-2.5 before:rounded-full before:bg-gold">
              <small className="block text-muted-foreground">{d}</small>{t}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export default function TracePage() {
  return <Suspense fallback={null}><Trace /></Suspense>;
}
