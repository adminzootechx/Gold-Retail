"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useStore } from "../lib/store";
import { Btn, Card, PageHeader, cx } from "../components/ui";
import { Grid, Kpis } from "../components/kit";
import { build, type Chart, type Dash, type Filter } from "./build";
import type { Channel } from "../lib/data";

const COLORS = ["var(--gold)", "var(--primary)", "var(--success)", "var(--info)", "var(--gold-mid)", "var(--muted-foreground)"];
const tick = { fill: "var(--muted-foreground)", fontSize: 12 };
const OVERVIEW = "overview";

function ChartView({ c }: { c: Chart }) {
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
      <div className="h-[250px] w-full">
        {empty ? <p className="grid h-full place-items-center text-muted-foreground">Nothing to show for this filter.</p> : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {c.kind === "donut" ? (
              <PieChart>
                <Pie data={c.data} dataKey="v" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={2} isAnimationActive={false}>
                  {c.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            ) : c.kind === "hbar" ? (
              <BarChart data={c.data} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={tick} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={tick} axisLine={false} tickLine={false} width={110} />
                <Tooltip cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="v" fill="var(--gold)" radius={[0, 6, 6, 0]} isAnimationActive={false} />
              </BarChart>
            ) : c.kind === "line" ? (
              <LineChart data={c.data} margin={{ right: 20, top: 6 }}>
                {axes}
                <Line type="monotone" dataKey="v" stroke="var(--gold)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--gold)" }} isAnimationActive={false} />
              </LineChart>
            ) : c.kind === "lines" ? (
              <LineChart data={c.data} margin={{ right: 20, top: 6 }}>
                {axes}
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {keys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={COLORS[i]} strokeWidth={2.5} strokeDasharray={i ? "5 4" : undefined} dot={{ r: 3 }} isAnimationActive={false} />)}
              </LineChart>
            ) : c.kind === "stack" ? (
              <BarChart data={c.data} margin={{ right: 12, top: 6 }}>
                {axes}
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                {keys.map((k, i) => <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} isAnimationActive={false} />)}
              </BarChart>
            ) : (
              <BarChart data={c.data} margin={{ right: 12, top: 6 }}>
                {axes}
                <Bar dataKey="v" fill="var(--gold)" radius={[6, 6, 0, 0]} isAnimationActive={false} />
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
        {list.map((t, i) => <li key={i} className="flex gap-2.5 text-[14px] leading-snug"><i className="mt-[7px] size-1.5 flex-none rounded-full bg-gold" aria-hidden />{t}</li>)}
      </ul>
    </Card>
  );
}

function Overview({ all, pick }: { all: Dash[]; pick: (id: string) => void }) {
  return (
    <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-3.5">
      {all.map((d) => (
        <button key={d.id} onClick={() => pick(d.id)} className="rounded-[var(--radius)] border border-border bg-card p-4 text-left hover:border-gold">
          <small className="flex items-center justify-between text-xs text-muted-foreground">{d.title}{d.sample && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">sample</span>}</small>
          <b className="mt-1 block font-display text-2xl">{d.kpis[0][1]}</b>
          <span className="text-xs text-muted-foreground">{d.kpis[0][0]}</span>
          <p className="mt-2 text-[13px] leading-snug">{d.insights[0]}</p>
        </button>
      ))}
    </div>
  );
}

export default function Dashboards() {
  const { s } = useStore();
  const [id, setId] = useState(OVERVIEW);
  const [f, setF] = useState<Filter>({ months: 6, channel: "All" });
  const all = build(s, f);
  const d = all.find((x) => x.id === id);
  const sel = "h-10 pointer-coarse:h-11 rounded-lg border border-border bg-card px-2.5";

  return (
    <>
      <PageHeader title="Analytics dashboards" sub="An overview and twelve detailed views, all fed from the database. Views marked sample use made-up figures.">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Period
          <select aria-label="Period" className={sel} value={f.months} onChange={(e) => setF({ ...f, months: +e.target.value })}>
            <option value={1}>This month</option><option value={3}>Last 3 months</option><option value={6}>Last 6 months</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">Channel
          <select aria-label="Channel" className={sel} value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value as Channel | "All" })}>
            {["All", "Retail", "Online", "HNI", "Corporate"].map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist">
        {[{ id: OVERVIEW, title: "Overview" }, ...all].map((x) => (
          <button key={x.id} role="tab" aria-selected={x.id === id} onClick={() => setId(x.id)}
            className={cx("min-h-9 rounded-full border px-3 text-[13px] font-semibold", x.id === id ? "border-gold bg-gold-light text-gold" : "border-border bg-card text-muted-foreground hover:bg-muted")}>{x.title}</button>
        ))}
      </div>
      <p className="mb-3 text-xs text-muted-foreground">Period and channel filters change the sales, finance, customer and fast-mover views. Stock views always show today.</p>

      {!d ? <Overview all={all} pick={setId} /> : (
        <>
          <h2 className="mb-0.5 text-xl font-semibold">{d.title}{d.sample && <span className="ml-2 rounded-full bg-muted px-2 py-0.5 align-middle text-xs font-medium text-muted-foreground">sample figures</span>}</h2>
          <p className="mb-3 text-muted-foreground">{d.about}</p>
          <Kpis items={d.kpis} />
          <div className="mb-3.5"><Insights list={d.insights} /></div>
          <div className="mb-3.5 grid items-start gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr))]">
            {d.charts.map((c) => <ChartView key={c.title} c={c} />)}
          </div>
          <div className="mb-2 mt-5 flex items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{d.table.title} <span className="text-sm font-normal text-muted-foreground">({d.table.rows.length})</span></h3>
            <Btn sm onClick={() => csv(d)}>Export CSV</Btn>
          </div>
          {d.table.rows.length ? <Grid head={d.table.head} rows={d.table.rows} num={d.table.num} /> : <p className="text-muted-foreground">Nothing in this table for the current filter.</p>}
        </>
      )}
    </>
  );
}
