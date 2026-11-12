"use client";
import { useState } from "react";
import Barcode from "./Barcode";
import QrCode from "./QrCode";
import { Btn, cx } from "./ui";
import { g } from "../lib/calc";
import type { Item } from "../lib/data";

/** Prints whatever sits inside the nearest .print-area. */
export function PrintButton({ children = "Print", className }: { children?: React.ReactNode; className?: string }) {
  return <Btn gold className={className} onClick={() => window.print()}>{children}</Btn>;
}

/**
 * One jewellery tag, 80 x 50 mm. The Code 128 barcode carries the tag code, so a scanner at the counter,
 * in the vault or at a stock audit reads it as typed text. The QR opens the piece's trace page.
 */
export function TagLabel({ item }: { item: Item }) {
  const link = (typeof window !== "undefined" ? window.location.origin : "") + "/trace?tag=" + item.tag;
  return (
    <div className="break-inside-avoid overflow-hidden rounded-[3px] border border-black/60 bg-white p-[3mm] text-black" style={{ width: "80mm", height: "50mm" }}>
      <div className="flex justify-center"><Barcode value={item.tag} height={34} moduleWidth={1} showText={false} /></div>
      <div className="mt-0.5 flex items-end justify-between gap-2">
        <div className="min-w-0 text-[9.5px] leading-[1.35]">
          <div className="font-mono text-[11px] font-bold tracking-wide">{item.tag}</div>
          <div className="truncate font-semibold">{item.name}, {item.variant}</div>
          <div>Gross {g(item.gross)} · Net {g(item.net)}</div>
          <div>HUID {item.huid}</div>
          <div className="truncate">{item.cert === "None" ? "No certificate" : item.cert}</div>
        </div>
        <QrCode value={link} size={62} ecl="L" />
      </div>
    </div>
  );
}

/** Pick pieces, preview their labels, print them on the label printer or plain paper. */
export function LabelSheet({ items, title = "Tag labels" }: { items: Item[]; title?: string }) {
  const [off, setOff] = useState<string[]>([]);
  const chosen = items.filter((i) => !off.includes(i.tag));
  return (
    <div>
      <div className="no-print mb-3 flex flex-wrap items-center gap-2">
        <PrintButton>Print {chosen.length} label{chosen.length === 1 ? "" : "s"}</PrintButton>
        <Btn onClick={() => setOff(off.length ? [] : items.map((i) => i.tag))}>{off.length ? "Select all" : "Clear selection"}</Btn>
        <span className="text-muted-foreground">Choose &ldquo;Save as PDF&rdquo; in the print dialog to keep a copy. Set the paper to 80 mm wide for a roll printer.</span>
      </div>
      <div className="no-print mb-3 flex max-h-40 flex-wrap gap-x-4 gap-y-1 overflow-y-auto">
        {items.map((i) => (
          <label key={i.tag} className="flex items-center gap-1.5 text-[12.5px]">
            <input type="checkbox" checked={!off.includes(i.tag)} onChange={(e) => setOff(e.target.checked ? off.filter((t) => t !== i.tag) : [...off, i.tag])} className="size-3.5 accent-[var(--gold)]" />
            <span className="font-mono">{i.tag}</span>
          </label>
        ))}
      </div>
      <section className={cx("print-area flex flex-wrap gap-[4mm]")} aria-label={title}>
        {chosen.map((i) => <TagLabel key={i.tag} item={i} />)}
      </section>
      {!chosen.length && <p className="text-muted-foreground">No pieces selected.</p>}
    </div>
  );
}
