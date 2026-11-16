"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { ct, g } from "../lib/calc";
import { ofKind } from "../lib/records";
import { Btn, PageHeader, Tabs } from "../components/ui";
import { Grid, Kpis, Pill } from "../components/kit";
import { NewPurchaseOrder, NewRequest, NewStock, SetStone } from "../components/Create";

type Tab = "metal" | "stones" | "findings" | "packaging" | "reserved" | "reorder";
const mono = (t: string) => <span key={t} className="font-mono text-[12.5px]">{t}</span>;

export default function RawMaterial() {
  const { s } = useStore();
  const [tab, setTab] = useState<Tab>("metal");
  const [req, setReq] = useState<{ item?: string; qty?: string } | null>(null);
  const [po, setPo] = useState(false);
  const [stock, setStock] = useState(false);
  const [setting, setSetting] = useState("");
  const fine = s.lots.reduce((a, l) => a + l.fine, 0);
  const singles = ofKind(s.records, "stone"), melee = ofKind(s.records, "melee"), colour = ofKind(s.records, "cstone");
  const findings = ofKind(s.records, "finding"), pack = ofKind(s.records, "pack");
  const low = [...findings, ...pack].filter((r) => +r.f.stock < +r.f.reorder);
  const status = (r: { f: Record<string, string> }) => (+r.f.stock < +r.f.reorder ? "Low" : "OK");
  const ask = (r: { f: Record<string, string> }, gold?: boolean) => <Btn key="b" sm gold={gold} onClick={() => setReq({ item: r.f.item, qty: String(Math.max(+r.f.reorder * 2 - +r.f.stock, +r.f.reorder)) + " pcs" })}>Raise request</Btn>;
  const set = (id: string, where: string) => (where === "In vault" ? <Btn key={id} sm onClick={() => setSetting(id)}>Set in a piece</Btn> : "");

  return (
    <>
      <PageHeader title="Raw Material Management" sub="Gold, diamonds, stones, findings and packaging.">
        <Btn onClick={() => setPo(true)}>New purchase order</Btn>
        <Btn onClick={() => setReq({})}>Raise purchase request</Btn>
        <Btn gold onClick={() => setStock(true)}>Receive stock</Btn>
      </PageHeader>
      <NewRequest key={req?.item ?? "new"} open={!!req} onClose={() => setReq(null)} item={req?.item} qty={req?.qty} />
      <NewPurchaseOrder open={po} onClose={() => setPo(false)} />
      <NewStock open={stock} onClose={() => setStock(false)} />
      <SetStone key={setting} open={!!setting} onClose={() => setSetting("")} recId={setting} />
      <Kpis items={[["Fine gold in vault", g(fine), `${s.lots.length} lots`], ["Certified stones", String(singles.length), "tracked one by one"], ["Melee and colour lots", String(melee.length + colour.length), "tracked by weight and pieces"], ["Below reorder level", String(low.length)]]} />
      <Tabs<Tab> tabs={[["metal", "Metal vault"], ["stones", "Diamonds and stones"], ["findings", "Findings"], ["packaging", "Packaging"], ["reserved", "Reservations"], ["reorder", "Reorder alerts"]]} value={tab} onChange={setTab} />

      {tab === "metal" && (
        <Grid head={["Lot", "Purity", "Fine gold balance", "Source", "Pieces made"]} num={[2, 4]}
          rows={s.lots.map((l) => [mono(l.id), "18K (75%)", g(l.fine), l.id === "ML-0925" ? "GRN-0457" : "GRN-0441", s.items.filter((i) => i.lot === l.id).length])} />
      )}
      {tab === "stones" && (
        <>
          <h3 className="mb-2 text-lg font-semibold">Certified diamonds</h3>
          <Grid head={["Report no.", "Shape", "Weight", "Colour", "Clarity", "Where", ""]} rows={singles.map((r) => [mono(r.f.no), r.f.shape, r.f.weight, r.f.colour, r.f.clarity, r.f.where, set(r.id, r.f.where)])} />
          <h3 className="mb-2 mt-8 text-lg font-semibold">Melee lots</h3>
          <Grid head={["Lot", "Type", "Pieces", "Weight", "Grade"]} num={[2, 3]} rows={melee.map((r) => [mono(r.f.lot), r.f.type, r.f.pcs + " pcs", r.f.ct + " ct", r.f.grade])} />
          <h3 className="mb-2 mt-8 text-lg font-semibold">Colour stones</h3>
          <Grid head={["Lot", "Stone", "Pieces", "Weight", "Where", ""]} num={[2, 3]} rows={colour.map((r) => [mono(r.f.lot), r.f.type, r.f.pcs + " pcs", r.f.ct + " ct", r.f.where, set(r.id, r.f.where)])} />
        </>
      )}
      {tab === "findings" && <Grid head={["Item", "In stock", "Reorder level", "Status", ""]} num={[1, 2]} rows={findings.map((r) => [r.f.item, r.f.stock + " pcs", r.f.reorder + " pcs", <Pill key="p">{status(r)}</Pill>, status(r) === "Low" ? ask(r) : ""])} />}
      {tab === "packaging" && <Grid head={["Item", "In stock", "Reorder level", "Status", ""]} num={[1, 2]} rows={pack.map((r) => [r.f.item, r.f.stock + " pcs", r.f.reorder + " pcs", <Pill key="p">{status(r)}</Pill>, status(r) === "Low" ? ask(r) : ""])} />}
      {tab === "reserved" && (
        <Grid head={["Job card", "Vendor", "Fine gold reserved", "Stones reserved", "Status"]} num={[2, 3]}
          rows={s.jcs.filter((j) => j.state !== "Closed").map((j) => [j.id, j.vendor, g(j.issued), ct(j.stI), <Pill key="p">{j.state === "At vendor" ? "Issued" : "Received"}</Pill>])} />
      )}
      {tab === "reorder" && (
        <>
          <Grid head={["Item", "In stock", "Reorder level", "Action", ""]} num={[1, 2]} rows={low.map((r) => [r.f.item, r.f.stock + " pcs", r.f.reorder + " pcs", <Pill key="p">Low, raise PR</Pill>, ask(r, true)])} />
          {!low.length && <p className="mt-2 text-muted-foreground">Everything is above its reorder level.</p>}
        </>
      )}
    </>
  );
}
