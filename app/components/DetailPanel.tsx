"use client";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import Link from "./Go";
import { useStore } from "../lib/store";
import { useDialog } from "../lib/useDialog";
import type { Detail } from "../lib/detail";
import { ct, g, inr, jcBalanced, jcCalc } from "../lib/calc";
import { closeJobCard, requestVariance, setJobCardStatus } from "../lib/actions";
import { ofKind } from "../lib/records";
import type { JobCard } from "../lib/data";
import { custName } from "../lib/stats";
import { Badge, Btn, Rec, StatusBadge, cx, inputCls } from "./ui";
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

          {jc && <JobCardDetail jc={jc} onClose={onClose} />}
        </div>
      </aside>
    </>
  );
}

const STATUSES = ["At vendor", "Received", "Closed"] as const;

/** One job card in full: what it is for, the gold and stones, what has moved on it, and its status. Founder and Production manager can set the status by hand. */
function JobCardDetail({ jc, onClose }: { jc: JobCard; onClose: () => void }) {
  const { s, act } = useStore();
  const [next, setNext] = useState<JobCard["state"]>(jc.state);
  const c = jcCalc(jc);
  const mayEdit = s.role === "Founder" || s.role === "Production manager";
  const slips = ofKind(s.records, "slip").filter((x) => x.f.jc === jc.id);
  const returns = ofKind(s.records, "ret").filter((x) => x.f.jc === jc.id);
  const pieces = s.inw.filter((p) => p.jc === jc.id);
  const requested = s.approvals.some((a) => a.type === "Metal variance" && a.ref === jc.id);
  const canClose = jc.state === "Received" && (jcBalanced(jc) || jc.approved);
  const sub = "mb-1.5 mt-5 text-base font-semibold";
  return (
    <>
      <p className="font-mono text-sm">{jc.id}</p>
      <h3 className="mb-3 mt-1 text-xl font-semibold">{jc.vendor}</h3>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge kind={jc.state === "Closed" ? "ok" : jc.state === "At vendor" ? "info" : "warn"}>{jc.state}</Badge>
        {jc.state === "Received" && c.unrec > 0 && !jc.approved && <Badge kind="bad">Short {g(c.unrec)}</Badge>}
        {jc.approved && <Badge kind="ok">Variance approved</Badge>}
      </div>
      <Rec rows={[["SKU", jc.sku], ["Pieces to make", String(jc.qty)], ["Metal lot", jc.lot], ["Opened", jc.opened ?? "Earlier"], ["For order", jc.order ?? "Stock"]]} />

      <h4 className={sub}>Gold, in fine gold</h4>
      <Rec rows={[["Issued", g(jc.issued)], ["In finished pieces", g(jc.pieces)], ["Scrap and dust returned", g(jc.scrap)], ["Variance", g(c.variance)], ["Allowed wastage (1.5%)", g(c.allowed)], ["Not accounted for", g(c.unrec), true]]} />
      <h4 className={sub}>Stones</h4>
      <Rec rows={[["Issued", ct(jc.stI)], ["Set in pieces", ct(jc.stSet)], ["Returned", ct(jc.stRet)], ["Difference", ct(c.stDiff), true]]} />

      <h4 className={sub}>Material issued</h4>
      {slips.length ? <ul className="text-[13.5px]">{slips.map((x) => <li key={x.id}><span className="font-mono text-[12.5px]">{x.id}</span> · {g(+x.f.gold)} gold, {ct(+x.f.stones)} stones</li>)}</ul> : <p className="text-muted-foreground">No issue slip yet.</p>}
      <h4 className={sub}>Returned from the vendor</h4>
      {returns.length ? <ul className="text-[13.5px]">{returns.map((x) => <li key={x.id}><span className="font-mono text-[12.5px]">{x.id}</span> · {x.f.pieces} pieces, {g(+x.f.gold || 0)} gold, {g(+x.f.scrap)} scrap</li>)}</ul> : <p className="text-muted-foreground">Nothing returned yet.</p>}
      <h4 className={sub}>At Head Office</h4>
      {pieces.length ? <ul className="text-[13.5px]">{pieces.map((p) => <li key={p.id}><span className="font-mono text-[12.5px]">{p.id}</span> · {p.tag ? "tagged " + p.tag : "waiting for QC and a tag"}</li>)}</ul> : <p className="text-muted-foreground">No piece received yet.</p>}

      {mayEdit && (
        <div className="mt-6 rounded-2xl border border-border p-4">
          <h4 className="mb-2 text-base font-semibold">Status</h4>
          <label htmlFor="jc-status" className="mb-1 block text-[12.5px] font-semibold">Set the status to</label>
          <div className="flex flex-wrap items-center gap-2">
            <select id="jc-status" value={next} onChange={(e) => setNext(e.target.value as JobCard["state"])} className={cx(inputCls, "min-w-40")}>{STATUSES.map((x) => <option key={x}>{x}</option>)}</select>
            <Btn gold disabled={next === jc.state} onClick={() => act((d) => setJobCardStatus(d, jc.id, next), { undoable: true })}>Update status</Btn>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">This is a manual correction and goes in the audit log. Closing from here skips the balance check; closing from the buttons below keeps it.</p>
          {jc.state === "Received" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {canClose
                ? <Btn onClick={() => act((d) => closeJobCard(d, jc.id))}>Close job card</Btn>
                : <Btn disabled={requested} onClick={() => act((d) => requestVariance(d, jc.id))}>{requested ? "Approval requested" : "Request variance approval"}</Btn>}
            </div>
          )}
        </div>
      )}
      <Link href={"/inward"} onClick={onClose} className="mt-4 inline-flex min-h-10 items-center font-semibold text-primary hover:underline">Open Head Office Inward</Link>
    </>
  );
}
