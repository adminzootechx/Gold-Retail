"use client";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { g, inr } from "../lib/calc";
import { ofKind } from "../lib/records";
import { founderBand, productionBand, rateChange, storeBand } from "../lib/retail";
import { lakh, short } from "../lib/stats";
import type { State } from "../lib/data";
import { ChartView } from "../dashboards/Analytics";
import { cx } from "./ui";
import { Tile } from "./kit";

/** Today's sales against the daily target, drawn as a gold ring that fills as the day goes. */
function Ring({ pct }: { pct: number }) {
  const r = 52, len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 124 124" className="size-[7.75rem] flex-none -rotate-90" aria-hidden>
      <circle cx="62" cy="62" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="10" />
      <circle cx="62" cy="62" r={r} fill="none" stroke="var(--gold)" strokeWidth="10" strokeLinecap="round" className="ring-arc"
        strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(pct, 100) / 100)} style={{ ["--ring-len" as string]: len }} />
    </svg>
  );
}

/** The one bold surface on Home: today against target, in teal, with the ring beside the figure. */
function Hero({ label, value, pct, target, children }: { label: string; value: number; pct: number; target: number; children?: React.ReactNode }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-[28px] bg-primary p-8 text-white shadow-[0_16px_40px_rgba(4,53,68,0.22)]">
      <svg viewBox="0 0 240 240" className="pointer-events-none absolute -right-10 -top-12 size-60 text-gold opacity-[0.14]" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden>
        <path d="M120 10 200 70 120 230 40 70Z M40 70h160 M80 70l40-60 40 60 M80 70l40 160 M160 70l-40 160" />
      </svg>
      <div className="relative flex flex-wrap items-center gap-x-8 gap-y-5">
        <div role="progressbar" aria-label={label + " against the daily target"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(pct, 100)} className="relative grid place-items-center">
          <Ring pct={pct} />
          <span className="absolute font-display text-2xl font-semibold tabular-nums">{pct}%</span>
        </div>
        <div className="min-w-0">
          <span className="text-sm text-white/75">{label}</span>
          <b className="block font-display text-[2.75rem] font-semibold leading-none tabular-nums">{short(value)}</b>
          <p className="mt-2 text-sm text-white/75">{pct >= 100 ? "Ahead of the " : "of the "}{short(target)} daily target</p>
        </div>
      </div>
      {children}
    </div>
  );
}

const Fact = ({ label, value, note }: { label: string; value: string; note?: React.ReactNode }) => (
  <div className="min-w-0">
    <span className="text-sm text-white/70">{label}</span>
    <b className="block font-display text-xl font-semibold tabular-nums">{value}</b>
    {note}
  </div>
);

/** Founder: the day against target, the gold rate and vault, and the week. */
export function FounderBand({ s }: { s: State }) {
  const b = founderBand(s);
  const r = rateChange(ofKind(s.records, "rate"));
  const week = { title: "Sales, last 7 days (₹ thousand)", kind: "bar" as const, data: b.week.map((d) => ({ name: d.name, v: Math.round(d.v / 1000) })) };
  return (
    <section aria-label="Today in the business" className="mb-10 grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <Hero label="Stores today" value={b.stores} pct={b.pct} target={b.target}>
        <div className="relative mt-8 grid gap-x-6 gap-y-5 border-t border-white/15 pt-6 sm:grid-cols-2">
          <Fact label="All channels today" value={short(b.all)} />
          <Fact label="Month so far" value={lakh(b.monthSoFar)} note={<span className="text-sm text-white/70">of {lakh(b.monthTarget)} target</span>} />
          <Fact label="24K gold today" value={inr(r.rate) + "/g"} note={r.diff !== null && (
            <span className={cx("inline-flex items-center gap-1 text-sm font-semibold", r.diff >= 0 ? "text-gold-mid" : "text-white")}>
              {r.diff >= 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}{inr(Math.abs(r.diff))} since the last rate
            </span>
          )} />
          <Fact label="Fine gold in the vault" value={g(b.vaultMg)} />
        </div>
      </Hero>
      <ChartView c={week} />
    </section>
  );
}

/** Production manager: gold out on cards, cards that do not balance, pieces waiting for a tag. */
export function ProductionBand({ s }: { s: State }) {
  const b = productionBand(s);
  return (
    <section aria-label="Production today" className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    <section aria-label="Your stores today" className="mb-10 grid items-stretch gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <Hero label="Sold today" value={b.today} pct={b.pct} target={b.target} />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
        <Tile label="Pieces in your stores" value={String(b.inStores)} note="Ready to sell" href="/inventory" />
        <Tile label="Online orders to move" value={String(b.orders)} note="Not yet delivered" href="/ecommerce" />
      </div>
    </section>
  );
}
