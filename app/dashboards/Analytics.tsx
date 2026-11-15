"use client";
import { Suspense, useSyncExternalStore } from "react";
import Link from "../components/Go";
import { ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../lib/store";
import { Btn, Card, cx, tabKeys } from "../components/ui";
import { Grid, Kpis } from "../components/kit";
import { build, type Chart, type Dash, type Filter } from "./build";
import type { Channel } from "../lib/data";

// Teal carries the data. Gold-dark is the second series. Every colour is at least 3:1 against white.
const COLORS = ["#043544", "#a37a14", "#4f8a99", "#7a8a90", "#2f7d4f", "#8a5a14"];
const legend = { iconType: "circle" as const, wrapperStyle: { fontSize: 13 }, formatter: (v: string) => <span style={{ color: "var(--foreground)" }}>{v}</span> };
const calmQuery = "(prefers-reduced-motion: reduce)";
const useCalm = () => useSyncExternalStore((f) => { const m = window.matchMedia(calmQuery); m.addEventListener("change", f); return () => m.removeEventListener("change", f); }, () => window.matchMedia(calmQuery).matches, () => false);
const tick = { fill: "var(--muted-foreground)", fontSize: 12 };

export function ChartView({ c }: { c: Chart }) {
  const calm = useCalm();
  const draw = { isAnimationActive: !calm, animationDuration: 650, animationEasing: "ease-out" as const };
  const keys = c.keys ?? ["v"];
  const axes = (
    <>
      <CartesianGrid stroke="var(--border)" vertical={false} />
      <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} interval={0} />
      <YAxis tick={tick} axisLine={false} tickLine={false} width={44} />
      <Tooltip cursor={{ fill: "var(--muted)" }} />
    </>
  );
  const empty = !c.data.length || c.data.every((r) => keys.every((k) => !r[k]));
  return (
    <Card title={c.title}>
      <div role="img" aria-label={c.title} className="h-[250px] w-full">
        {empty ? <p className="grid h-full place-items-center text-muted-foreground">Nothing to show for this filter.</p> : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {c.kind === "donut" ? (
              <PieChart accessibilityLayer={false}>
                <Pie data={c.data} dataKey="v" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2} stroke="var(--card)" {...draw}>
                  {c.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend {...legend} />
              </PieChart>
            ) : c.kind === "hbar" ? (
              <BarChart accessibilityLayer={false} data={c.data} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={tick} axisLine={false} tickLine={false} width={110} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="v" fill="var(--primary)" radius={[0, 6, 6, 0]} {...draw} />
              </BarChart>
            ) : c.kind === "line" ? (
              <LineChart accessibilityLayer={false} data={c.data} margin={{ right: 20, top: 6 }}>
                {axes}
                <Line type="monotone" dataKey="v" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} {...draw} />
              </LineChart>
            ) : c.kind === "lines" ? (
              <LineChart accessibilityLayer={false} data={c.data} margin={{ right: 20, top: 6 }}>
                {axes}
                <Legend {...legend} />
                {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i]} strokeWidth={2.5} strokeDasharray={i ? "5 4" : undefined} dot={{ r: 3 }} {...draw} />)}
              </LineChart>
            ) : c.kind === "stack" ? (
              <BarChart accessibilityLayer={false} data={c.data} margin={{ right: 12, top: 6 }}>
                {axes}
                <Legend {...legend} />
                {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" stroke="var(--card)" strokeWidth={2} fill={COLORS[i % COLORS.length]} {...draw} />)}
              </BarChart>
            ) : (
              <BarChart accessibilityLayer={false} data={c.data} margin={{ right: 12, top: 6 }}>
                {axes}
                <Bar dataKey="v" fill="var(--primary)" radius={[6, 6, 0, 0]} {...draw} />
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

const csv = (d: Dash) => {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [d.table.head, ...d.table.rows].map((r) => r.map(q).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  a.download = `akoirah-${d.id}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

function Insights({ list }: { list: string[] }) {
  return (
    <Card title="What stands out">
      <ul className="m-0 grid list-none gap-x-6 gap-y-2.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))]">
        {list.map((t, i) => <li key={i} className="flex gap-2.5 text-[15px] leading-snug"><i className="mt-[7px] size-1.5 flex-none rounded-full bg-gold-dark" aria-hidden />{t}</li>)}
      </ul>
    </Card>
  );
}

const GROUPS: [string, string[]][] = [
  ["Stock", ["inventory", "raw", "dead", "fast"]],
  ["Making", ["production", "manufacturing", "vendor"]],
  ["Money", ["sales", "finance", "ledgers"]],
  ["People", ["customer", "stores"]],
];

function Alerts({ list }: { list: { text: string; href: string }[] }) {
  return (
    <Card title="Needs attention">
      {list.length ? (
        <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
          {list.map((a, i) => (
            <li key={i}><Link href={a.href} className="group flex min-h-12 items-center justify-between gap-3 py-2 transition-colors duration-150 hover:text-primary"><span className="text-[15px] leading-snug">{a.text}</span><ChevronRight className="size-4 flex-none text-muted-foreground transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden /></Link></li>
          ))}
        </ul>
      ) : <p className="text-muted-foreground">Nothing needs attention here.</p>}
    </Card>
  );
}

function Overview({ all, pick }: { all: Dash[]; pick: (id: string) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {GROUPS.map(([name, ids]) => (
        <Card key={name} title={name}>
          <ul className="m-0 list-none divide-y divide-border/60 p-0">
            {ids.map((id) => all.find((d) => d.id === id)!).map((d) => (
              <li key={d.id}>
                <button onClick={() => pick(d.id)} className="flex min-h-12 w-full items-center justify-between gap-4 rounded-lg px-1 text-left transition-colors duration-150 hover:bg-muted/60">
                  <span>{d.title}{d.sample && <span className="ml-2 text-sm text-muted-foreground">sample</span>}</span>
                  <b className="font-display text-lg tabular-nums">{d.kpis[0][1]}</b>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

const pill = (on: boolean) => cx("min-h-10 rounded-full border px-4 font-semibold transition-colors duration-150", on ? "border-primary bg-primary text-white" : "border-border bg-card text-muted-foreground hover:bg-muted");

function Page() {
  const { s } = useStore();
  const router = useRouter();
  const q = useSearchParams();
  const p = +(q.get("p") ?? 6);
  const f: Filter = { months: [1, 3, 6].includes(p) ? p : 6, channel: (["Retail", "Online", "HNI", "Corporate"].includes(q.get("c") ?? "") ? q.get("c") : "All") as Channel | "All" };
  const all = build(s, f);
  const d = all.find((x) => x.id === q.get("v"));
  const group = GROUPS.find(([, ids]) => d && ids.includes(d.id));
  const go = (patch: Record<string, string | number | null>) => {
    const n = new URLSearchParams(q.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === "All") n.delete(k); else n.set(k, String(v)); }
    n.set("view", "analytics");
    router.replace("/?" + n, { scroll: false });
  };
  const FILTERED = ["sales", "finance", "ledgers", "customer", "fast"];
  const filterable = !!d && FILTERED.includes(d.id);
  const sel = "h-10 pointer-coarse:h-11 rounded-lg border border-border bg-card px-2.5";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Dashboard group">
          <button aria-pressed={!d} onClick={() => go({ v: null })} className={pill(!d)}>Overview</button>
          {GROUPS.map(([name, ids]) => <button key={name} aria-pressed={group?.[0] === name} onClick={() => go({ v: ids[0] })} className={pill(group?.[0] === name)}>{name}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">Period
            <select aria-label="Period" className={cx(sel, !filterable && "opacity-50")} disabled={!filterable} value={f.months} onChange={(e) => go({ p: e.target.value === "6" ? null : e.target.value })}>
              <option value={1}>This month</option><option value={3}>Last 3 months</option><option value={6}>Last 6 months</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">Channel
            <select aria-label="Channel" className={cx(sel, !filterable && "opacity-50")} disabled={!filterable} value={f.channel} onChange={(e) => go({ c: e.target.value })}>
              {["All", "Retail", "Online", "HNI", "Corporate"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </div>
      {group ? (
        <div className="mb-8 flex flex-wrap gap-x-6 gap-y-1 border-b border-border/60" role="tablist" aria-label={group[0]}>
          {group[1].map((id) => {
            const x = all.find((z) => z.id === id)!;
            return (
              <button key={id} role="tab" aria-selected={id === d?.id} tabIndex={id === d?.id ? 0 : -1} onKeyDown={tabKeys} onClick={() => go({ v: id })}
                className={cx("-mb-px min-h-10 border-b-2 px-1 font-semibold transition-colors duration-150", id === d?.id ? "border-gold text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{x.title}</button>
            );
          })}
        </div>
      ) : <div className="mb-8" />}

      {!d ? <div key="overview" className="view-in"><Overview all={all} pick={(id) => go({ v: id })} /></div> : (
        <div key={d.id} className="view-in">
          <h2 className="mb-1 text-xl font-semibold">{d.title}{d.sample && <span className="ml-3 rounded-full bg-muted px-2.5 py-0.5 align-middle text-sm font-medium text-muted-foreground">sample figures</span>}</h2>
          <p className="mb-8 text-muted-foreground">{d.about}{filterable ? ` Showing ${f.months === 1 ? "this month" : `the last ${f.months} months`}, ${f.channel === "All" ? "all channels" : f.channel + " channel"}.` : " Always shows today. Period and channel apply to the sales, finance, customer and fast-mover views."}</p>
          <Kpis items={d.kpis} />
          <div className="mb-8 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid gap-6">
              <ChartView c={d.charts[0]} />
              {d.charts.length > 1 && <div className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">{d.charts.slice(1).map((c) => <ChartView key={c.title} c={c} />)}</div>}
            </div>
            <div className="grid gap-6">
              <Alerts list={d.alerts} />
              <Insights list={d.insights} />
            </div>
          </div>
          <div className="mb-4 mt-10 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{d.table.title} <span className="text-sm font-normal text-muted-foreground">({d.table.rows.length})</span></h3>
            <Btn sm onClick={() => csv(d)}>Export CSV</Btn>
          </div>
          {d.table.rows.length ? <Grid head={d.table.head} rows={d.table.rows} num={d.table.num} /> : <p className="text-muted-foreground">Nothing in this table for the current filter.</p>}
        </div>
      )}
    </>
  );
}

export default function Analytics() {
  return <Suspense fallback={null}><Page /></Suspense>;
}
