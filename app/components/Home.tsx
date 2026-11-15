"use client";
import Link from "./Go";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useStore } from "../lib/store";
import { decide } from "../lib/actions";
import { g, inr } from "../lib/calc";
import { limitOf } from "../lib/records";
import type { Level, Todo } from "../lib/home";
import { Badge, Btn, Card, cx, type Kind } from "./ui";
import { Tile } from "./kit";

const LEVEL: Record<Level, [string, Kind]> = { blocked: ["Blocked", "bad"], decision: ["Decision", "warn"], todo: ["To do", "info"] };
const linkBtn = "inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted pointer-coarse:min-h-11";

/** Approve and Reject for one request. A large amount asks for a second tap, and everything can be undone for a few seconds. */
export function DecideButtons({ id, label }: { id: string; label: string }) {
  const { s, act } = useStore();
  const [armed, setArmed] = useState(false);
  const value = s.approvals.find((x) => x.id === id)?.value ?? 0;
  const big = value >= limitOf(s.records, "r2", 500000);
  const run = (v: "approved" | "rejected") => { setArmed(false); act((d) => decide(d, id, v), { undoable: true }); };
  return (
    <div className="flex items-center gap-6">
      <Btn gold aria-label={`${armed ? "Confirm approve" : "Approve"}: ${label}`} onClick={() => { if (big && !armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); } else run("approved"); }}>
        {armed ? "Confirm " + inr(value) : "Approve"}
      </Btn>
      <Btn className="border-transparent bg-transparent text-muted-foreground hover:bg-muted" aria-label={`Reject: ${label}`} onClick={() => run("rejected")}>Reject</Btn>
    </div>
  );
}

/** Keys on a Needs You row: arrows move, A approves, R rejects. A large amount still asks for the second press. */
function rowKeys(e: React.KeyboardEvent<HTMLLIElement>) {
  const t = e.target as HTMLElement;
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
  const li = e.currentTarget;
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const to = e.key === "ArrowDown" ? li.nextElementSibling : li.previousElementSibling;
    if (to instanceof HTMLElement) { e.preventDefault(); to.focus(); }
  } else if (e.key.toLowerCase() === "a") li.querySelector<HTMLElement>('button[aria-label^="Approve"], button[aria-label^="Confirm approve"]')?.click();
  else if (e.key.toLowerCase() === "r") li.querySelector<HTMLElement>('button[aria-label^="Reject"]')?.click();
}

/** The ranked list. Decisions can be made in the row; everything else links to the record itself. */
export function NeedsYou({ items, clear }: { items: Todo[]; clear: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);
  return (
    <section aria-labelledby="needs-you" className="rounded-2xl border border-border bg-card">
      <div className="flex items-baseline justify-between gap-3 px-6 pt-6">
        <h2 id="needs-you" className="text-lg font-semibold">Needs you</h2>
        {items.length > 0 && <span className="text-muted-foreground">{items.length} open</span>}
      </div>
      {!items.length ? (
        <p className="px-6 pb-6 pt-2 text-muted-foreground">{clear}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {shown.map((t) => (
            <li key={t.id} tabIndex={0} onKeyDown={rowKeys} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4 outline-none focus-visible:bg-muted/60 focus-visible:shadow-[inset_3px_0_0_var(--gold)]">
              <span className="w-[5.25rem] flex-none"><Badge kind={LEVEL[t.level][1]}>{LEVEL[t.level][0]}</Badge></span>
              <div className="min-w-[13rem] flex-1">
                <div className="font-medium">{t.what}</div>
                <div className="text-sm text-muted-foreground">{t.meta}</div>
              </div>
              {t.decide ? (
                <DecideButtons id={t.decide} label={t.what} />
              ) : (
                <Link href={t.href} aria-label={`${t.cta}: ${t.what}`} className={linkBtn}>{t.cta}</Link>
              )}
            </li>
          ))}
        </ul>
      )}
      {items.length > 5 && (
        <div className="border-t border-border/60 px-6 py-2">
          <button className="min-h-10 font-semibold text-primary underline-offset-2 hover:underline pointer-coarse:min-h-11" onClick={() => setAll(!all)}>{all ? "Show fewer" : `Show all ${items.length}`}</button>
        </div>
      )}
    </section>
  );
}

/** A few figures, each a link to where it comes from. */
export function Facts({ items }: { items: { label: string; value: string; note: string; href: string; alert?: boolean; delta?: number }[] }) {
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => <Tile key={f.label} {...f} />)}
    </div>
  );
}

/** Where every gram is right now. The bar is for a glance, the list carries the numbers. */
export function GoldWhere({ parts }: { parts: { label: string; mg: number; href: string }[] }) {
  const total = Math.max(1, parts.reduce((a, p) => a + p.mg, 0));
  const fill = ["bg-primary", "bg-gold-dark", "bg-muted-foreground"];
  return (
    <Card title="Where the gold is">
      <div role="img" aria-label={parts.map((p) => `${p.label} ${g(p.mg)}`).join(", ")} className="mb-3 flex h-3 gap-0.5 overflow-hidden rounded-full bg-muted">
        {parts.map((p, i) => <span key={p.label} className={fill[i]} style={{ width: Math.max(2, (p.mg / total) * 100) + "%" }} />)}
      </div>
      <ul className="flex flex-col">
        {parts.map((p, i) => (
          <li key={p.label}>
            <Link href={p.href} className="flex min-h-10 items-center gap-2.5 rounded-lg px-1 hover:bg-muted pointer-coarse:min-h-11">
              <span className={cx("size-2.5 flex-none rounded-full", fill[i])} aria-hidden />
              <span className="flex-1">{p.label}</span>
              <span className="tabular-nums">{g(p.mg)}</span>
              <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">{Math.round((p.mg / total) * 100)}%</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm text-muted-foreground">Fine gold. Every card links to its ledger.</p>
    </Card>
  );
}

/** Pieces between the vendor and the shelf. */
export function Pipeline({ steps }: { steps: { label: string; n: number; href: string }[] }) {
  return (
    <Card title="From vendor to shelf">
      <ol className="flex flex-col gap-1">
        {steps.map((st, i) => (
          <li key={st.label}>
            <Link href={st.href} className="flex min-h-11 items-center gap-3 rounded-lg px-1 hover:bg-muted">
              <span className="w-8 text-right font-display text-xl font-semibold tabular-nums">{st.n}</span>
              <span className="flex-1">{st.label}</span>
              {i < steps.length - 1 ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden /> : <span className="size-4" />}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
