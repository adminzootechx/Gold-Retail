"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { PUR, RATE24, STONE_PER_CT, inr } from "../lib/calc";
import { Badge, Btn, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { Grid } from "../components/kit";

type Tab = "variants" | "bom" | "pricing" | "cert";

export default function Products() {
  const { s, say } = useStore();
  const [code, setCode] = useState("AK-RNG-014");
  const [tab, setTab] = useState<Tab>("variants");
  const [making, setMaking] = useState(21000);
  const [margin, setMargin] = useState(22);
  const [bom, setBom] = useState({ gold: 3.84, centre: 0.7, melee: 0.24, findings: 6, pack: 1 });
  const [certs, setCerts] = useState({ igi: true, sgl: false, huid: true });
  const k = s.skus.find((x) => x.code === code) ?? s.skus[0];
  const ref = s.items.find((i) => i.sku === k.code);
  const fine = ref ? (ref.net * PUR) / 1000 : 3.8;
  const stones = ref ? ref.stones / 100 : 0.9;
  const metal = fine * RATE24, stoneV = stones * STONE_PER_CT;
  const cost = metal + stoneV + making;
  const price = cost * (1 + margin / 100);
  const bomCost = bom.gold * RATE24 + (bom.centre + bom.melee) * STONE_PER_CT + bom.findings * 320 + bom.pack * 450;

  return (
    <>
      <PageHeader title="Products and SKUs" sub="Master SKUs with variants, BOM, pricing formula and certification needs." />
      <Grid head={["SKU", "Name", "Design", "Variants", "Certificate"]} sel={s.skus.indexOf(k)} onRow={(i) => setCode(s.skus[i].code)}
        rows={s.skus.map((x) => [<span key="c" className="font-mono text-[12.5px]">{x.code}</span>, x.name, x.design,
          <span key="v" className="flex gap-1">{x.variants.map((v) => <Badge key={v} kind="gold">{v}</Badge>)}</span>, x.cert])} />

      <h2 className="mb-2 mt-5 text-xl font-semibold">{k.name} <span className="font-mono text-sm font-normal text-muted-foreground">{k.code}</span></h2>
      <Tabs<Tab> tabs={[["variants", "Variants"], ["bom", "Bill of materials"], ["pricing", "Pricing formula"], ["cert", "Certification"]]} value={tab} onChange={setTab} />

      {tab === "variants" && (
        <Grid head={["Variant", "Metal", "Colour", "Stone grade", "Sizes", "Indicative price"]} num={[5]}
          rows={k.variants.map((v) => [v, "18K gold", v.replace("18K ", ""), "VS-EF lab-grown", "Size is set on the piece", inr(cost * (1 + 0.22))])} />
      )}

      {tab === "bom" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1.2fr_1fr]">
          <Card title="Bill of materials, per piece">
            {([["gold", "Fine gold (g)"], ["centre", "Centre stone (ct)"], ["melee", "Melee stones (ct)"], ["findings", "Findings (pcs)"], ["pack", "Packaging (set)"]] as const).map(([key, label]) => (
              <Field key={key} label={label} htmlFor={"bom-" + key}>
                <input id={"bom-" + key} type="number" step="0.01" value={bom[key]} onChange={(e) => setBom({ ...bom, [key]: +e.target.value })} className={inputCls} />
              </Field>
            ))}
          </Card>
          <Card title="Material cost">
            <Rec rows={[["Fine gold", inr(bom.gold * RATE24)], ["Stones", inr((bom.centre + bom.melee) * STONE_PER_CT)], ["Findings", inr(bom.findings * 320)], ["Packaging", inr(bom.pack * 450)], ["Material cost", inr(bomCost), true]]} />
            <div className="mt-3"><Btn gold onClick={() => say("BOM saved (prototype, not stored)")}>Save BOM</Btn></div>
          </Card>
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <Card title="Formula">
            <p className="mb-3 text-muted-foreground">Price = metal at day rate + stones + making, plus margin. The price is locked when payment is taken.</p>
            <Field label="Making charge (rupees)" htmlFor="mk"><input id="mk" type="number" value={making} onChange={(e) => setMaking(+e.target.value)} className={inputCls} /></Field>
            <Field label={`Margin: ${margin}%`} htmlFor="mg"><input id="mg" type="range" min={0} max={50} value={margin} onChange={(e) => setMargin(+e.target.value)} className="h-6" /></Field>
            <Btn gold onClick={() => say("Pricing rule saved (prototype, not stored)")}>Save rule</Btn>
          </Card>
          <Card title="Live example">
            <Rec rows={[[`Metal: ${fine.toFixed(3)} g × ${inr(RATE24)}`, inr(metal)], [`Stones: ${stones.toFixed(2)} ct`, inr(stoneV)], ["Making", inr(making)], ["Cost", inr(cost)], [`Margin ${margin}%`, inr(price - cost)], ["Selling price", inr(price), true]]} />
          </Card>
        </div>
      )}

      {tab === "cert" && (
        <Card title="Certification requirements" className="max-w-[520px]">
          {([["igi", "IGI jewellery report"], ["sgl", "SGL report"], ["huid", "BIS hallmark with HUID"]] as const).map(([key, label]) => (
            <label key={key} className="mb-2.5 flex items-center gap-2.5">
              <input type="checkbox" checked={certs[key]} onChange={(e) => setCerts({ ...certs, [key]: e.target.checked })} className="size-4 accent-[var(--gold)]" />
              {label}
            </label>
          ))}
          <p className="mb-3 text-[12.5px] text-muted-foreground">A tag cannot be generated at HO inward until every required item is recorded.</p>
          <Btn gold onClick={() => say("Requirements saved (prototype, not stored)")}>Save requirements</Btn>
        </Card>
      )}
    </>
  );
}
