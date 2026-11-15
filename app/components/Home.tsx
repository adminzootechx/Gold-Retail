"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ChevronRight, ScanLine } from "lucide-react";
import { useStore } from "../lib/store";
import { decide } from "../lib/actions";
import { findPiece } from "../lib/search";
import { g } from "../lib/calc";
import type { Level, Todo } from "../lib/home";
import { Badge, Btn, Card, cx, type Kind } from "./ui";
import { Tile } from "./kit";

const LEVEL: Record<Level, [string, Kind]> = { blocked: ["Blocked", "bad"], decision: ["Decision", "warn"], todo: ["To do", "info"] };
const linkBtn = "inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-muted pointer-coarse:min-h-11";

/** One field for the scanner or the keyboard. Enter opens the piece's full history. */
export function ScanField() {
  const { s, say } = useStore();
  const router = useRouter();
  const box = useRef<HTMLInputElement>(null);
  const go = (v: string) => {
    if (!v.trim()) return;
    const it = findPiece(s.items, v);
    if (it) router.push("/trace?tag=" + it.tag);
    else { say(`Nothing found for ${v.trim()}. Check the tag, HUID, certificate or order number.`); box.current?.select(); }
  };
  return (
    <div className="mb-10">
      <label htmlFor="scan-home" className="sr-only">Trace a piece</label>
      <div className="relative">
        <ScanLine className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input id="scan-home" ref={box} autoFocus autoComplete="off" placeholder="Scan the tag, or type a tag, HUID, certificate or order number"
          onKeyDown={(e) => { if (e.key === "Enter") go(e.currentTarget.value); }}
          className="h-14 w-full rounded-2xl border border-border bg-card pl-11 pr-3 text-base outline-none focus:border-gold focus:ring-[3px] focus:ring-gold/20" />
      </div>
    </div>
  );
}

/** The ranked list. Decisions can be made in the row; everything else links to the record itself. */
export function NeedsYou({ items, clear }: { items: Todo[]; clear: string }) {
  const { act } = useStore();
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 5);
  return (
    <section aria-labelledby="needs-you" className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(4,53,68,0.04)]">
      <div className="flex items-baseline justify-between gap-3 px-6 pt-6">
        <h2 id="needs-you" className="text-lg font-semibold">Needs you</h2>
        {items.length > 0 && <span className="text-muted-foreground">{items.length} open</span>}
      </div>
      {!items.length ? (
        <p className="px-6 pb-6 pt-2 text-muted-foreground">{clear}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {shown.map((t) => (
            <li key={t.id} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-4">
              <span className="w-[5.25rem] flex-none"><Badge kind={LEVEL[t.level][1]}>{LEVEL[t.level][0]}</Badge></span>
              <div className="min-w-[13rem] flex-1">
                <div className="font-medium">{t.what}</div>
                <div className="text-sm text-muted-foreground">{t.meta}</div>
              </div>
              {t.decide ? (
                <div className="flex gap-5">
                  <Btn gold aria-label={`Approve: ${t.what}`} onClick={() => act((d) => decide(d, t.decide!, "approved"), { undoable: true })}>Approve</Btn>
                  <Btn className="border-transparent bg-transparent text-muted-foreground hover:bg-muted" aria-label={`Reject: ${t.what}`} onClick={() => act((d) => decide(d, t.decide!, "rejected"), { undoable: true })}>Reject</Btn>
                </div>
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
export function Facts({ items }: { items: { label: string; value: string; note: string; href: string; alert?: boolean }[] }) {
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

/** The latest things done in the system, from the audit log. */
export function ActivityFeed({ log }: { log: { t: string; u: string; text: string }[] }) {
  return (
    <Card title="Recent activity">
      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {log.slice(0, 5).map((l, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-full bg-muted text-xs font-bold text-primary">{l.u.split(" ").map((w) => w[0]).slice(0, 2).join("")}</span>
            <div className="min-w-0">
              <p className="leading-snug">{l.text}</p>
              <p className="text-sm text-muted-foreground">{l.u}, {l.t}</p>
            </div>
          </li>
        ))}
      </ul>
      <Link href="/audit" className="mt-4 inline-flex min-h-10 items-center font-semibold text-primary hover:underline">View full audit log</Link>
    </Card>
  );
}
