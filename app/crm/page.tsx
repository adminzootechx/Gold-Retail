"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { sendCampaign } from "../lib/actions2";
import { inr } from "../lib/calc";
import { customerTotals } from "../lib/stats";
import { Card, PageHeader, Rec, Tabs } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";

type Tab = "customers" | "segments" | "campaign" | "log";
type Row = ReturnType<typeof customerTotals>[number];
const SEGMENTS: [string, (c: Row) => boolean][] = [
  ["HNI customers", (c) => c.segment === "HNI"],
  ["Repeat buyers", (c) => c.segment === "Repeat" || c.orders >= 3],
  ["Online buyers", (c) => c.segment === "Online"],
  ["Corporate", (c) => c.segment === "Corporate"],
  ["Occasion in the next 60 days", (c) => c.occasion !== "None"],
];

export default function Crm() {
  const { s, act } = useStore();
  const [tab, setTab] = useState<Tab>("customers");
  const [sel, setSel] = useState(0);
  const rows = customerTotals(s.invoices, s.customers).sort((a, b) => b.spend - a.spend);
  const c = rows[Math.min(sel, rows.length - 1)];
  const bought = s.items.filter((i) => i.cust === c.name);
  const count = (seg: string) => rows.filter(SEGMENTS.find((x) => x[0] === seg)![1]).length;

  return (
    <>
      <PageHeader title="CRM & Marketing" sub="Customers, segments and campaigns." />
      <Tabs<Tab> tabs={[["customers", "Customers"], ["segments", "Segments"], ["campaign", "Campaign builder"], ["log", "Message log"]]} value={tab} onChange={setTab} />

      {tab === "customers" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1.2fr_1fr]">
          <Grid head={["Customer", "City", "Segment", "Invoices", "Spend", "Balance"]} num={[3, 4, 5]} sel={sel} onRow={setSel}
            rows={rows.map((x) => [x.name, x.city, <Pill key="s">{x.segment}</Pill>, x.orders, inr(x.spend), x.due ? inr(x.due) : "-"])} />
          <Card title={c.name}>
            <Rec rows={[["Customer id", c.id], ["City", c.city], ["Segment", c.segment], ["Last purchase", c.last || "-"], ["Next occasion", c.occasion], ["Likes", c.pref], ["Balance due", c.due ? inr(c.due) : "None"], ["Lifetime spend", inr(c.spend), true]]} />
            <h3 className="mb-1.5 mt-4 font-semibold">Tagged pieces on record</h3>
            {bought.length ? <ul className="list-disc pl-[18px]">{bought.map((i) => <li key={i.tag}><span className="font-mono text-[12.5px]">{i.tag}</span> · {i.name}</li>)}</ul> : <p className="text-muted-foreground">No tagged pieces linked to this customer yet.</p>}
          </Card>
        </div>
      )}

      {tab === "segments" && (
        <>
          <Kpis items={SEGMENTS.slice(0, 4).map(([n]) => [n, String(count(n))] as [string, string])} />
          <Grid head={["Segment", "Customers", "Rule"]} num={[1]} rows={SEGMENTS.map(([n]) => [n, count(n), "Saved filter on customer data"])} />
        </>
      )}

      {tab === "campaign" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <FormCard title="Campaign builder" cta="Send campaign" fields={[
            { id: "channel", label: "Channel", type: "select", options: ["WhatsApp", "Email", "SMS"] },
            { id: "segment", label: "Segment", type: "select", options: SEGMENTS.map(([n]) => n) },
            { id: "text", label: "Message", type: "textarea", value: "A small thank-you from AKOIRAH. Visit us this month for a private viewing." },
          ]} onSubmit={(v) => { act((d) => sendCampaign(d, v.channel as "WhatsApp" | "Email" | "SMS", v.segment, v.text, count(v.segment))); setTab("log"); }} />
          <p className="text-muted-foreground">Messages are logged here and not sent yet.</p>
        </div>
      )}

      {tab === "log" && (
        <Grid head={["Sent", "Channel", "Segment", "Customers", "Message"]} num={[3]}
          rows={s.messages.map((m) => [m.t, m.channel, m.segment, m.count, m.text])} />
      )}
    </>
  );
}
