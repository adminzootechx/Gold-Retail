"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "../lib/store";
import { createJobCard } from "../lib/actions2";
import { PUR, g, inr } from "../lib/calc";
import { PageHeader, Tabs } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";
import { VENDORS } from "../lib/mock";

type Tab = "mrp" | "requirement" | "allocation" | "cards";
const MIN_STOCK: Record<string, number> = { "AK-RNG-014": 3, "AK-PND-007": 3, "AK-EAR-021": 2, "AK-BNG-003": 1, "AK-NCK-009": 2 };

export default function Planning() {
  const { s, act } = useStore();
  const [tab, setTab] = useState<Tab>("mrp");

  const rows = s.skus.flatMap((k) => k.variants.map((v) => {
    const demand = s.orders.filter((o) => o.sku === k.code && o.variant === v && o.state < 7).length;
    const stock = s.items.filter((i) => i.sku === k.code && i.variant === v && i.status === "InStock").length;
    const wip = s.jcs.filter((j) => j.sku === k.code && j.state === "At vendor").reduce((a, j) => a + j.qty, 0);
    const minS = MIN_STOCK[k.code] ?? 1;
    const need = Math.max(0, demand + minS - stock - wip);
    return { k, v, demand, minS, stock, wip, need };
  }));
  const refNet = (sku: string) => (s.items.find((i) => i.sku === sku)?.net ?? 4000) * PUR;
  const need = rows.filter((r) => r.need > 0);
  const totalGold = need.reduce((a, r) => a + r.need * refNet(r.k.code), 0);

  return (
    <>
      <PageHeader title="Production planning" sub="Requirement = open orders + minimum stock, less stock on hand and work already at vendors." />
      <Kpis items={[["Variants to make", String(need.length)], ["Pieces to make", String(need.reduce((a, r) => a + r.need, 0))], ["Fine gold needed", g(Math.round(totalGold))], ["Open job cards", String(s.jcs.filter((j) => j.state !== "Closed").length)]]} />
      <Tabs<Tab> tabs={[["mrp", "Demand vs stock"], ["requirement", "Material requirement"], ["allocation", "Vendor allocation"], ["cards", "Create job card"]]} value={tab} onChange={setTab} />

      {tab === "mrp" && (
        <Grid head={["SKU", "Variant", "Open orders", "Minimum", "In stock", "At vendor", "To make"]} num={[2, 3, 4, 5]}
          rows={rows.map((r) => [r.k.code, r.v, r.demand, r.minS, r.stock, r.wip, r.need > 0 ? <Pill key="n">{`Low, make ${r.need}`}</Pill> : <Pill key="n">On track</Pill>])} />
      )}

      {tab === "requirement" && (
        <Grid head={["SKU", "Variant", "Pieces", "Fine gold", "Stones", "Findings"]} num={[2, 3, 4, 5]}
          rows={need.map((r) => [r.k.code, r.v, r.need, g(Math.round(r.need * refNet(r.k.code))), (((s.items.find((i) => i.sku === r.k.code)?.stones ?? 50) * r.need) / 100).toFixed(2) + " ct", r.need * 6 + " pcs"])} />
      )}

      {tab === "allocation" && (
        <Grid head={["Vendor", "City", "Work", "On time", "Wastage", "Open cards", "Rating"]} num={[3, 4, 5]}
          rows={VENDORS.map((v) => [v.name, v.city, v.work, v.onTime + "%", v.wastage + "%", s.jcs.filter((j) => j.vendor === v.name && j.state !== "Closed").length, <Pill key="r">{v.rating === "A" ? "Active, A" : "Active, B"}</Pill>])} />
      )}

      {tab === "cards" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <FormCard title="Create a job card" cta="Create and reserve gold"
            fields={[
              { id: "vendor", label: "Vendor", type: "select", options: VENDORS.map((v) => v.name) },
              { id: "sku", label: "SKU", type: "select", options: s.skus.map((k) => k.code) },
              { id: "qty", label: "Quantity", type: "number", value: "4" },
            ]}
            onSubmit={(v) => act((d) => createJobCard(d, v.vendor, v.sku, Math.max(1, +v.qty || 1)))} />
          <div>
            <h3 className="mb-2 text-lg font-semibold">Latest job cards</h3>
            <Grid head={["Card", "Vendor", "SKU", "Qty", "Fine gold", "Status"]} num={[3, 4]}
              rows={s.jcs.slice(0, 5).map((j) => [<Link key="i" href="/job-work" className="font-mono text-[12.5px] text-gold underline">{j.id}</Link>, j.vendor, j.sku, j.qty, g(j.issued), <Pill key="s">{j.state}</Pill>])} />
            <p className="mt-2 text-[12.5px] text-muted-foreground">Gold is reserved from the vault when a card is created. Total issued at today&apos;s rate: {inr(s.jcs.reduce((a, j) => a + (j.issued / 1000) * 13250, 0))}.</p>
          </div>
        </div>
      )}
    </>
  );
}
