"use client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { useStore } from "../lib/store";
import { ALL_MODS, allowed } from "../lib/modules";
import { rank, type PItem } from "../lib/palette";
import { useDialog } from "../lib/useDialog";
import { cx } from "./ui";

const ACTIONS: PItem[] = [
  { id: "bill", group: "Actions", label: "New bill", hint: "Open the point of sale", href: "/stores", keywords: "pos|sale|invoice|billing" },
  { id: "rate", group: "Actions", label: "Update gold rate", hint: "Finance", href: "/finance", keywords: "price|24k|gold" },
  { id: "receive", group: "Actions", label: "Receive pieces", hint: "Head office inward", href: "/inward", keywords: "inward|job card|hallmark" },
  { id: "pr", group: "Actions", label: "Raise a purchase request", hint: "Procurement", href: "/procurement", keywords: "buy|order|po" },
  { id: "notes", group: "Actions", label: "Open notifications", run: "notifications", keywords: "alerts|approvals|needs you" },
];

/** Ctrl K: find a piece, jump to a screen, or start a common job without leaving the keyboard. */
export default function CommandPalette({ open, onClose, onNotifications }: { open: boolean; onClose: () => void; onNotifications: () => void }) {
  const { s } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [at, setAt] = useState(0);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const done = () => { setQ(""); setAt(0); onClose(); };
  useDialog(open, done, panel, input);

  const items = useMemo<PItem[]>(() => {
    const screens: PItem[] = [{ href: "/", label: "Home" }, ...ALL_MODS.map(([href, label]) => ({ href, label }))]
      .filter((m) => allowed(s.role, m.href)).map((m) => ({ id: "go" + m.href, group: "Go to" as const, label: m.label, href: m.href }));
    const pieces: PItem[] = s.items.map((i) => ({ id: i.tag, group: "Pieces" as const, label: i.tag, hint: `${i.name}, ${i.variant}`, href: "/trace?tag=" + i.tag, keywords: [i.huid, i.cert].join("|") }));
    const orders: PItem[] = s.orders.map((o) => ({ id: o.id, group: "Pieces" as const, label: o.id, hint: "Online order, " + o.cust, href: o.item ? "/trace?tag=" + o.item : "/ecommerce", keywords: o.cust }));
    const acts = ACTIONS.filter((a) => !a.href || allowed(s.role, a.href));
    return [...acts, ...screens, ...pieces, ...orders];
  }, [s.role, s.items, s.orders]);

  const results = useMemo(() => rank(q, items), [q, items]);
  const go = (r?: PItem) => {
    if (!r) return;
    done();
    if (r.run === "notifications") onNotifications();
    else if (r.href) router.push(r.href);
  };

  return (
    <div className={cx("no-print fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-[12vh] transition-opacity duration-150 motion-reduce:transition-none", open ? "opacity-100" : "pointer-events-none invisible opacity-0")} onMouseDown={(e) => { if (e.target === e.currentTarget) done(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label="Command palette" aria-hidden={!open} inert={!open}
        className="w-full max-w-[600px] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
        <div className="relative border-b border-border">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input ref={input} value={q} autoComplete="off" role="combobox" aria-expanded aria-controls="palette-list" aria-activedescendant={results[at] ? "pal-" + results[at].id : undefined}
            placeholder="Find a piece, go to a screen, or start a job" aria-label="Search"
            onChange={(e) => { setQ(e.target.value); setAt(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setAt((at + 1) % Math.max(1, results.length)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setAt((at - 1 + results.length) % Math.max(1, results.length)); }
              else if (e.key === "Enter") { e.preventDefault(); go(results[at]); }
            }}
            className="h-14 w-full bg-transparent pl-12 pr-4 text-base outline-none" />
        </div>
        <ul id="palette-list" role="listbox" aria-label="Results" className="sleek-scroll sleek-scroll-light m-0 max-h-[50vh] list-none overflow-y-auto p-2">
          {results.map((r, i) => (
            <li key={r.id} id={"pal-" + r.id} role="option" aria-selected={i === at}>
              {(i === 0 || results[i - 1].group !== r.group) && <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">{r.group}</p>}
              <button type="button" tabIndex={-1} onMouseMove={() => setAt(i)} onClick={() => go(r)}
                className={cx("flex min-h-11 w-full items-center justify-between gap-4 rounded-lg px-3 text-left", i === at ? "bg-muted" : "")}>
                <span className={cx(r.group === "Pieces" && "font-mono text-[13px]")}>{r.label}</span>
                <span className="flex items-center gap-2 truncate text-sm text-muted-foreground">{r.hint}{i === at && <CornerDownLeft className="size-4" aria-hidden />}</span>
              </button>
            </li>
          ))}
          {!results.length && <li className="px-3 py-6 text-center text-muted-foreground">Nothing found for &ldquo;{q.trim()}&rdquo;. Try a tag, HUID, certificate or order number, or the name of a screen.</li>}
        </ul>
        <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">Arrow keys to move, Enter to open, Esc to close.</p>
      </div>
    </div>
  );
}
