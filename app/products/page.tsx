"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { PUR, RATE24, STONE_PER_CT, inr } from "../lib/calc";
import { Badge, Btn, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { Grid, Pill } from "../components/kit";
import { saveBom, saveCertReq, savePrice } from "../lib/actions3";
import { forSku, ofKind } from "../lib/records";

type Tab = "variants" | "bom" | "pricing" | "cert";

export default function Products() {
  const { s, act } = useStore();
  const [code, setCode] = useState("AK-RNG-014");
  const [tab, setTab] = useState<Tab>("variants");
  const [dm, setDm] = useState<Record<string, number>>({});
  const [db, setDb] = useState<Record<string, Record<string, number>>>({});
  const [dc, setDc] = useState<Record<string, { igi: boolean; sgl: boolean; huid: boolean }>>({});
  const k = s.skus.find((x) => x.code === code) ?? s.skus[0];
  // What is saved for this SKU is the starting point; edits stay in the form until saved.
  const sb = forSku(s.records, "bom", k.code), sp = forSku(s.records, "price", k.code), sc = forSku(s.records, "certreq", k.code);
  const bom: Record<string, number> = db[k.code] ?? { gold: +(sb?.f.gold ?? 3.84), centre: +(sb?.f.centre ?? 0.7), melee: +(sb?.f.melee ?? 0.24), findings: +(sb?.f.findings ?? 6), pack: +(sb?.f.pack ?? 1) };
  const making = dm[k.code + "m"] ?? +(sp?.f.making ?? 21000);
  const margin = dm[k.code + "g"] ?? +(sp?.f.margin ?? 22);
  const certs = dc[k.code] ?? { igi: sc?.f.igi !== "no", sgl: sc?.f.sgl === "yes", huid: sc?.f.huid !== "no" };
  const setBom = (b: Record<string, number>) => setDb({ ...db, [k.code]: b });
  const setMaking = (v: number) => setDm({ ...dm, [k.code + "m"]: v });
  const setMargin = (v: number) => setDm({ ...dm, [k.code + "g"]: v });
  const setCerts = (c: { igi: boolean; sgl: boolean; huid: boolean }) => setDc({ ...dc, [k.code]: c });
  const history = (kind: "bom" | "price" | "certreq") => ofKind(s.records, kind).filter((x) => x.f.sku === k.code);
  const ref = s.items.find((i) => i.sku === k.code);
  const fine = ref ? (ref.net * PUR) / 1000 : 3.8;
  const stones = ref ? ref.stones / 100 : 0.9;
  const metal = fine * RATE24, stoneV = stones * STONE_PER_CT;
  const cost = metal + stoneV + making;
  const price = cost * (1 + margin / 100);
  const bomCost = bom.gold * RATE24 + (bom.centre + bom.melee) * STONE_PER_CT + bom.findings * 320 + bom.pack * 450;

  return (
    <>
      <PageHeader title="Product Master & SKU Management" sub="SKUs, variants, BOM, pricing and certificates." />
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
            <div className="mt-3"><Btn gold onClick={() => act((d) => saveBom(d, k.code, bom))}>Save BOM</Btn></div>
          </Card>
          <div className="lg:col-span-2"><Grid head={["Version", "Saved", "By", "Gold (g)", "Centre (ct)", "Melee (ct)", "Findings", "Pack"]} num={[3, 4, 5, 6, 7]}
            rows={history("bom").map((x) => [<Pill key="v">{"v" + x.f.v}</Pill>, x.date, x.by, x.f.gold, x.f.centre, x.f.melee, x.f.findings, x.f.pack])} /></div>
        </div>
      )}

      {tab === "pricing" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <Card title="Formula">
            <p className="mb-3 text-muted-foreground">Price = metal at day rate + stones + making, plus margin. The price is locked when payment is taken.</p>
            <Field label="Making charge (rupees)" htmlFor="mk"><input id="mk" type="number" value={making} onChange={(e) => setMaking(+e.target.value)} className={inputCls} /></Field>
            <Field label={`Margin: ${margin}%`} htmlFor="mg"><input id="mg" type="range" min={0} max={50} value={margin} onChange={(e) => setMargin(+e.target.value)} className="h-6" /></Field>
            <Btn gold onClick={() => act((d) => savePrice(d, k.code, making, margin))}>Save rule</Btn>
          </Card>
          <Card title="Live example">
            <Rec rows={[[`Metal: ${fine.toFixed(3)} g × ${inr(RATE24)}`, inr(metal)], [`Stones: ${stones.toFixed(2)} ct`, inr(stoneV)], ["Making", inr(making)], ["Cost", inr(cost)], [`Margin ${margin}%`, inr(price - cost)], ["Selling price", inr(price), true]]} />
          </Card>
        </div>
      )}
      {tab === "pricing" && (
        <div className="mt-3.5"><Grid head={["Version", "Saved", "By", "Making charge", "Margin"]} num={[3, 4]}
          rows={history("price").map((x) => [<Pill key="v">{"v" + x.f.v}</Pill>, x.date, x.by, inr(+x.f.making), x.f.margin + "%"])} /></div>
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
          <Btn gold onClick={() => act((d) => saveCertReq(d, k.code, certs.igi, certs.sgl, certs.huid))}>Save requirements</Btn>
        </Card>
      )}
      {tab === "cert" && (
        <div className="mt-3.5"><Grid head={["Version", "Saved", "By", "IGI report", "SGL report", "Hallmark HUID"]}
          rows={history("certreq").map((x) => [<Pill key="v">{"v" + x.f.v}</Pill>, x.date, x.by, x.f.igi === "yes" ? "Required" : "No", x.f.sgl === "yes" ? "Required" : "No", x.f.huid === "yes" ? "Required" : "No"])} /></div>
      )}
    </>
  );
}
