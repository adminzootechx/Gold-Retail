"use client";
import { useRef } from "react";
import { X } from "lucide-react";
import Link from "./Go";
import { useStore } from "../lib/store";
import { useDialog } from "../lib/useDialog";
import type { Detail } from "../lib/detail";
import { g, inr, jcCalc } from "../lib/calc";
import { custName } from "../lib/stats";
import { Rec, StatusBadge, cx } from "./ui";
import { CertBadge, Pill } from "./kit";

const link = "inline-flex min-h-10 items-center font-semibold text-primary hover:underline";

/** A record beside the list it came from, so tracing a piece never costs you your place. */
export default function DetailPanel({ detail, onClose, onOpen }: { detail: Detail | null; onClose: () => void; onOpen: (d: Detail) => void }) {
  const { s } = useStore();
  const panel = useRef<HTMLElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  useDialog(!!detail, onClose, panel, close);

  const item = detail?.kind === "piece" ? s.items.find((i) => i.tag === detail.id) : undefined;
  const inv = detail?.kind === "invoice" ? s.invoices.find((v) => v.id === detail.id) : undefined;
  const jc = detail?.kind === "jobcard" ? s.jcs.find((j) => j.id === detail.id) : undefined;
  const title = detail?.kind === "piece" ? "Piece" : detail?.kind === "invoice" ? "Invoice" : "Job card";

  return (
    <>
      <button type="button" aria-label="Close details" tabIndex={-1} onClick={onClose}
        className={cx("no-print fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 motion-reduce:transition-none", detail ? "opacity-100" : "pointer-events-none opacity-0")} />
      <aside ref={panel} role="dialog" aria-modal="true" aria-label={title + " details"} aria-hidden={!detail} inert={!detail}
        className={cx("no-print fixed inset-y-0 right-0 z-50 flex w-[460px] max-w-full flex-col bg-white shadow-[-12px_0_40px_rgba(0,0,0,0.25)] transition-[transform,visibility] duration-300 ease-out motion-reduce:transition-none", detail ? "visible translate-x-0" : "invisible translate-x-full")}>
        <div className="flex h-16 flex-none items-center justify-between border-b border-border px-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button ref={close} type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-lg hover:bg-muted pointer-coarse:size-11"><X className="size-5" aria-hidden /></button>
        </div>
        <div className="sleek-scroll sleek-scroll-light min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {detail && !item && !inv && !jc && <p className="text-muted-foreground">This record is no longer in the register. Close the panel and refresh the list.</p>}

          {item && (
            <>
              <p className="font-mono text-sm">{item.tag}</p>
              <h3 className="mb-3 mt-1 text-xl font-semibold">{item.name}, {item.variant}</h3>
              <div className="mb-5 flex flex-wrap items-center gap-2"><StatusBadge status={item.status} /><span className="text-muted-foreground">at {item.loc}</span></div>
              <Rec rows={[["Net metal", g(item.net)], ["Gross weight", g(item.gross)], ["Stones", (item.stones / 100).toFixed(2) + " ct"], ["Price", inr(item.price), true]]} />
              <div className="my-5"><CertBadge cert={item.cert} huid={item.huid} /></div>
              <div className="flex flex-col">
                <button type="button" className={cx(link, "w-fit")} onClick={() => onOpen({ kind: "jobcard", id: item.jc })}>Made on job card {item.jc}</button>
                {item.inv && <button type="button" className={cx(link, "w-fit")} onClick={() => onOpen({ kind: "invoice", id: item.inv! })}>Sold on {item.inv}</button>}
                <Link href={"/trace?tag=" + item.tag} onClick={onClose} className={link}>Open the full trace</Link>
              </div>
            </>
          )}

          {inv && (
            <>
              <p className="font-mono text-sm">{inv.id}</p>
              <h3 className="mb-3 mt-1 text-xl font-semibold">{custName(s.customers, inv.custId)}</h3>
              <div className="mb-5 flex flex-wrap items-center gap-2"><Pill>{inv.paid >= inv.amount ? "Paid" : inv.paid ? "Partial" : "Due"}</Pill><span className="text-muted-foreground">{inv.date} · {inv.channel} · {inv.store}</span></div>
              <Rec rows={[["Amount", inr(inv.amount)], ["Paid", inr(inv.paid)], ["Due", inr(inv.amount - inv.paid), true]]} />
              {inv.tags.length > 0 && (
                <div className="mt-5">
                  <p className="mb-1 text-sm text-muted-foreground">Pieces on this invoice</p>
                  {inv.tags.map((t) => <button key={t} type="button" className={cx(link, "mr-4 font-mono text-[13px]")} onClick={() => onOpen({ kind: "piece", id: t })}>{t}</button>)}
                </div>
              )}
              <Link href="/sales" onClick={onClose} className={link}>Open sales orders</Link>
            </>
          )}

          {jc && (() => {
            const c = jcCalc(jc);
            return (
              <>
                <p className="font-mono text-sm">{jc.id}</p>
                <h3 className="mb-3 mt-1 text-xl font-semibold">{jc.vendor}</h3>
                <div className="mb-5 flex flex-wrap items-center gap-2"><Pill>{jc.state === "Received" && c.unrec ? "Short" : jc.state}</Pill><span className="text-muted-foreground">{jc.qty} pieces of {jc.sku}</span></div>
                <Rec rows={[["Fine gold issued", g(jc.issued)], ["Pieces returned", g(jc.pieces)], ["Scrap returned", g(jc.scrap)], ["Allowed wastage", g(c.allowed)], ["Not accounted for", g(c.unrec), true]]} />
                <Link href={"/job-work?jc=" + jc.id} onClick={onClose} className={link}>Open the job card</Link>
              </>
            );
          })()}
        </div>
      </aside>
    </>
  );
}
