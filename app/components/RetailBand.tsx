"use client";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { g, inr } from "../lib/calc";
import { ofKind } from "../lib/records";
import { founderBand, productionBand, rateChange, storeBand } from "../lib/retail";
import { lakh, short } from "../lib/stats";
import type { State } from "../lib/data";
import { ChartView } from "../dashboards/Analytics";
import { Card, cx } from "./ui";
import { Tile } from "./kit";

/** Today's sales against the daily target, as a bar with the percentage in words. */
function Progress({ label, value, pct, target }: { label: string; value: number; pct: number; target: number }) {
  return (
    <div>
      <span className="text-sm text-muted-foreground">{label}</span>
      <b className="mt-1 block text-[2rem] font-semibold leading-tight tabular-nums">{short(value)}</b>
      <div role="progressbar" aria-label={label + " against the daily target"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div className={cx("h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none", pct >= 100 ? "bg-success" : "bg-gold-dark")} style={{ width: Math.min(pct, 100) + "%" }} />
      </div>
      <p className="mt-2 text-sm text-muted-foreground"><b className={cx("font-semibold", pct >= 100 ? "text-success" : "text-foreground")}>{pct}%</b> of the {short(target)} daily target</p>
    </div>
  );
}

const Fact = ({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) => (
  <div className="min-w-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <b className="block text-lg font-semibold tabular-nums">{value}</b>
    {note}
  </div>
);

/** Founder: the day against target, the gold rate and vault, and the week. */
export function FounderBand({ s }: { s: State }) {
  const b = founderBand(s);
  const r = rateChange(ofKind(s.records, "rate"));
  const week = { title: "Sales, last 7 days (₹ thousand)", kind: "bar" as const, data: b.week.map((d) => ({ name: d.name, v: Math.round(d.v / 1000) })) };
  return (
    <section aria-label="Today in the business" className="mb-8 grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <Card>
        <Progress label="Stores today" value={b.stores} pct={b.pct} target={b.target} />
        <div className="mt-6 grid gap-x-6 gap-y-4 border-t border-border pt-5 sm:grid-cols-2">
          <Fact label="All channels today" value={short(b.all)} />
          <Fact label="Month so far" value={lakh(b.monthSoFar)} note={<span className="text-sm text-muted-foreground">of {lakh(b.monthTarget)} target</span>} />
          <Fact label="24K gold today" value={inr(r.rate) + "/g"} note={r.diff !== null && (
            <span className={cx("inline-flex items-center gap-1 text-sm font-semibold", r.diff >= 0 ? "text-success" : "text-danger")}>
              {r.diff >= 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}{inr(Math.abs(r.diff))} since the last rate
            </span>
          )} />
          <Fact label="Fine gold in the vault" value={g(b.vaultMg)} />
        </div>
      </Card>
      <ChartView c={week} />
    </section>
  );
}

/** Production manager: gold out on cards, cards that do not balance, pieces waiting for a tag. */
export function ProductionBand({ s }: { s: State }) {
  const b = productionBand(s);
  return (
    <section aria-label="Production today" className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Tile label="Fine gold out on cards" value={g(b.goldOutMg)} note={`${b.openCards} open job cards`} href="/job-work" />
      <Tile label="Cards short" value={b.cardsShort ? String(b.cardsShort) : "None"} note="Do not reconcile" alert={b.cardsShort > 0} href="/job-work" />
      <Tile label="Waiting for a tag" value={String(b.awaitingTag)} note="Pieces at head office" href="/inward" />
      <Tile label="Open job cards" value={String(b.openCards)} note="At vendors or received" href="/job-work" />
    </section>
  );
}

/** Store manager: the day against target, pieces on the shelf, online orders moving. */
export function StoreBand({ s }: { s: State }) {
  const b = storeBand(s);
  return (
    <section aria-label="Your stores today" className="mb-8 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Card><Progress label="Sold today" value={b.today} pct={b.pct} target={b.target} /></Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <Tile label="Pieces in your stores" value={String(b.inStores)} note="Ready to sell" href="/inventory" />
        <Tile label="Online orders to move" value={String(b.orders)} note="Not yet delivered" href="/ecommerce" />
      </div>
    </section>
  );
}
