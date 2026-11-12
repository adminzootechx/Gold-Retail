"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { ct, g } from "../lib/calc";
import { PageHeader, Tabs } from "../components/ui";
import { Grid, Kpis, Pill } from "../components/kit";

type Tab = "metal" | "stones" | "findings" | "packaging" | "reserved" | "reorder";

const SINGLES = [
  ["IGI LG6120451", "Round", "0.70 ct", "E", "VS1", "Set in AK-RNG-014-0001"],
  ["IGI LG6120470", "Round", "0.72 ct", "F", "VS1", "In vault"],
  ["IGI LG6120471", "Oval", "1.01 ct", "E", "VVS2", "In vault"],
  ["SGL 77140", "Round", "0.50 ct", "G", "VS2", "Reserved JC-2412"],
];
const MELEE = [["ML-S-118", "Round 1.0 mm", "412 pcs", "4.12 ct", "VS-EF"], ["ML-S-121", "Round 1.3 mm", "260 pcs", "5.20 ct", "VS-EF"], ["ML-S-124", "Baguette", "90 pcs", "1.35 ct", "VS-FG"]];
const FINDINGS = [["Prong settings 18K", "1,240 pcs", "400 pcs", "OK"], ["Bails 18K", "180 pcs", "200 pcs", "Low"], ["Clasps (lobster)", "320 pcs", "150 pcs", "OK"], ["Earring posts 18K", "90 pcs", "300 pcs", "Low"]];
const PACK = [["Ring box, black", "460 pcs", "150 pcs", "OK"], ["Pendant pouch", "210 pcs", "100 pcs", "OK"], ["Gift sleeve", "75 pcs", "200 pcs", "Low"]];

export default function RawMaterial() {
  const { s } = useStore();
  const [tab, setTab] = useState<Tab>("metal");
  const fine = s.lots.reduce((a, l) => a + l.fine, 0);
  const reorder = [...FINDINGS, ...PACK].filter((r) => r[3] === "Low");

  return (
    <>
      <PageHeader title="Raw material" sub="Metal by lot, certified stones one by one, melee by lot, findings and packaging." />
      <Kpis items={[["Fine gold in vault", g(fine), `${s.lots.length} lots`], ["Certified stones", String(SINGLES.length), "tracked one by one"], ["Melee lots", String(MELEE.length), "tracked by weight and pieces"], ["Below reorder level", String(reorder.length)]]} />
      <Tabs<Tab> tabs={[["metal", "Metal vault"], ["stones", "Stone register"], ["findings", "Findings"], ["packaging", "Packaging"], ["reserved", "Reservations"], ["reorder", "Reorder alerts"]]} value={tab} onChange={setTab} />

      {tab === "metal" && (
        <Grid head={["Lot", "Purity", "Fine gold balance", "Source", "Pieces made"]} num={[2, 4]}
          rows={s.lots.map((l) => [<span key="l" className="font-mono text-[12.5px]">{l.id}</span>, "18K (75%)", g(l.fine), l.id === "ML-0925" ? "GRN-0457" : "GRN-0441", s.items.filter((i) => i.lot === l.id).length])} />
      )}
      {tab === "stones" && (
        <>
          <h3 className="mb-2 text-lg font-semibold">Certified singles</h3>
          <Grid head={["Report no.", "Shape", "Weight", "Colour", "Clarity", "Where"]} rows={SINGLES.map((r) => [<span key="a" className="font-mono text-[12.5px]">{r[0]}</span>, ...r.slice(1)])} />
          <h3 className="mb-2 mt-5 text-lg font-semibold">Melee lots</h3>
          <Grid head={["Lot", "Type", "Pieces", "Weight", "Grade"]} num={[2, 3]} rows={MELEE} />
        </>
      )}
      {tab === "findings" && <Grid head={["Item", "In stock", "Reorder level", "Status"]} num={[1, 2]} rows={FINDINGS.map((r) => [r[0], r[1], r[2], <Pill key="p">{r[3]}</Pill>])} />}
      {tab === "packaging" && <Grid head={["Item", "In stock", "Reorder level", "Status"]} num={[1, 2]} rows={PACK.map((r) => [r[0], r[1], r[2], <Pill key="p">{r[3]}</Pill>])} />}
      {tab === "reserved" && (
        <Grid head={["Job card", "Vendor", "Fine gold reserved", "Stones reserved", "Status"]} num={[2, 3]}
          rows={s.jcs.filter((j) => j.state !== "Closed").map((j) => [j.id, j.vendor, g(j.issued), ct(j.stI), <Pill key="p">{j.state === "At vendor" ? "Issued" : "Received"}</Pill>])} />
      )}
      {tab === "reorder" && <Grid head={["Item", "In stock", "Reorder level", "Action"]} rows={reorder.map((r) => [r[0], r[1], r[2], <Pill key="p">Low, raise PR</Pill>])} />}
    </>
  );
}
