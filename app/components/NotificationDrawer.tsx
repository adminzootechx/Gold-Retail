"use client";
import Link from "./Go";
import { useRef } from "react";
import { X } from "lucide-react";
import { useStore } from "../lib/store";
import { todos, type Level } from "../lib/home";
import { Badge, cx, type Kind } from "./ui";
import { DecideButtons } from "./Home";
import { useDialog } from "../lib/useDialog";

const LEVEL: Record<Level, [string, Kind]> = { blocked: ["Blocked", "bad"], decision: ["Decision", "warn"], todo: ["To do", "info"] };

/** Notifications slide in from the right edge: what needs this person, then what just happened. */
export default function NotificationDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s } = useStore();
  const items = todos(s, s.role);
  const close = useRef<HTMLButtonElement>(null);

  const panel = useRef<HTMLElement>(null);
  useDialog(open, onClose, panel, close);

  return (
    <>
      <button type="button" aria-label="Close notifications" tabIndex={-1} onClick={onClose}
        className={cx("no-print fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 motion-reduce:transition-none", open ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside ref={panel} role="dialog" aria-modal="true" aria-label="Notifications" aria-hidden={!open} inert={!open}
        className={cx("no-print fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.25)] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none", open ? "visible translate-x-0" : "invisible translate-x-full")}>
        <div className="flex h-16 flex-none items-center justify-between border-b border-border px-6">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <button ref={close} type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-lg hover:bg-muted pointer-coarse:size-11"><X className="size-5" aria-hidden /></button>
        </div>
        <div className="sleek-scroll sleek-scroll-light min-h-0 flex-1 overflow-y-auto">
          <h3 className="px-6 pb-2 pt-5 text-sm font-semibold text-muted-foreground">Needs you ({items.length})</h3>
          {items.length ? (
            <ul className="m-0 list-none divide-y divide-border/60 p-0">
              {items.map((t) => (
                <li key={t.id} className="px-6 py-4">
                  <div className="mb-1.5 flex items-center gap-2"><Badge kind={LEVEL[t.level][1]}>{LEVEL[t.level][0]}</Badge></div>
                  <p className="font-medium leading-snug">{t.what}</p>
                  <p className="mb-3 text-sm text-muted-foreground">{t.meta}</p>
                  {t.decide ? (
                    <DecideButtons id={t.decide} label={t.what} />
                  ) : (
                    <Link href={t.href} onClick={onClose} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3.5 text-sm font-semibold hover:bg-muted">{t.cta}</Link>
                  )}
                </li>
              ))}
            </ul>
          ) : <p className="px-6 pb-4 text-muted-foreground">Nothing needs you right now.</p>}

          <h3 className="px-6 pb-2 pt-6 text-sm font-semibold text-muted-foreground">Recent activity</h3>
          <ul className="m-0 list-none p-0 pb-6">
            {s.log.slice(0, 6).map((l, i) => (
              <li key={i} className="px-6 py-2.5">
                <p className="leading-snug">{l.text}</p>
                <p className="text-sm text-muted-foreground">{l.u}, {l.t}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-none border-t border-border px-6 py-3">
          <Link href="/security?tab=audit" onClick={onClose} className="inline-flex min-h-10 items-center font-semibold text-primary hover:underline">View full audit log</Link>
        </div>
      </aside>
    </>
  );
}
