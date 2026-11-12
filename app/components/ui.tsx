import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Status } from "../lib/data";

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ");

const KINDS = {
  ok: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  bad: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  gold: "bg-gold-light text-gold",
  mute: "bg-muted text-muted-foreground",
};
export type Kind = keyof typeof KINDS;

export function Badge({ kind = "mute", children }: { kind?: Kind; children: ReactNode }) {
  return <span className={cx("inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold", KINDS[kind])}>{children}</span>;
}

const STATUS: Record<Status, [string, Kind]> = {
  InStock: ["In stock", "ok"], Reserved: ["Reserved", "warn"], InTransit: ["In transit", "info"],
  OnConsignment: ["On consignment", "gold"], Sold: ["Sold", "mute"], InRepair: ["In repair", "warn"], AtHallmark: ["At hallmark centre", "info"],
};
export const STATUS_LABEL = (s: Status) => STATUS[s][0];
export const StatusBadge = ({ status }: { status: Status }) => <Badge kind={STATUS[status][1]}>{STATUS[status][0]}</Badge>;

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold">{title}</h1>
        {sub && <p className="mt-0.5 text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0 rounded-[var(--radius)] border border-border bg-card p-4", className)}>
      {title && <h2 className="mb-2.5 text-lg font-semibold">{title}</h2>}
      {children}
    </div>
  );
}

export function Btn({ gold, sm, className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { gold?: boolean; sm?: boolean }) {
  return (
    <button
      {...p}
      className={cx(
        "rounded-lg border font-semibold transition disabled:opacity-45",
        "inline-flex items-center justify-center pointer-coarse:min-h-11",
        sm ? "min-h-9 px-3 text-[13px]" : "min-h-10 px-4 text-sm",
        gold ? "border-gold bg-gold text-gold-fg enabled:hover:brightness-110" : "border-border bg-card enabled:hover:bg-muted",
        className,
      )}
    />
  );
}

export function Table({ head, num = [], children }: { head: string[]; num?: number[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={h + i} className={cx("whitespace-nowrap border-b border-border bg-muted px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground", num.includes(i) ? "text-right" : "text-left")}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ cells, num = [], onClick, selected }: { cells: ReactNode[]; num?: number[]; onClick?: () => void; selected?: boolean }) {
  return (
    <tr
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter") onClick(); } : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cx("border-b border-border last:border-0", onClick && "cursor-pointer hover:bg-gold-light", selected && "bg-gold-light")}
    >
      {cells.map((c, i) => (
        <td key={i} className={cx("whitespace-nowrap px-3.5 py-2.5 align-middle", num.includes(i) && "text-right tabular-nums")}>{c}</td>
      ))}
    </tr>
  );
}

/** Label and value pairs. A `true` third value marks the total line. */
export function Rec({ rows }: { rows: [string, ReactNode, boolean?][] }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-[13.5px]">
      {rows.map(([a, b, t], i) => (
        <div key={i} className={cx("contents", t && "font-semibold")}>
          <span className={cx(t ? "mt-1 border-t border-border pt-1.5" : "text-muted-foreground")}>{a}</span>
          <span className={cx("text-right font-semibold tabular-nums", t && "mt-1 border-t border-border pt-1.5")}>{b}</span>
        </div>
      ))}
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-border" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}
          className={cx("-mb-px min-h-10 border-b-2 px-3.5 py-2 font-semibold pointer-coarse:min-h-11", value === k ? "border-gold text-gold" : "border-transparent text-muted-foreground")}>{l}</button>
      ))}
    </div>
  );
}

export function Step({ done, next, children, action }: { done?: boolean; next?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <div className={cx("flex items-center gap-3 rounded-[10px] border px-3 py-2.5", next ? "border-gold" : "border-border", !done && !next && "opacity-55")}>
      <span className={cx("grid size-[22px] flex-none place-items-center rounded-full border-[1.5px] text-xs text-white", done ? "border-success bg-success" : "border-border")}>{done ? "✓" : ""}</span>
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

export function Field({ label, htmlFor, children }: { label: ReactNode; htmlFor: string; children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[12.5px] font-semibold">{label}</label>
      {children}
    </div>
  );
}

export const inputCls = "h-10 pointer-coarse:h-11 rounded-lg border border-border bg-background px-2.5";

export function Bars({ data, fmt = (v: number) => String(v) }: { data: [string, number][]; fmt?: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d[1]), 1);
  return (
    <div>
      {data.map(([l, v]) => (
        <div key={l} className="my-1.5 grid grid-cols-[130px_1fr_52px] items-center gap-2.5 text-[12.5px]">
          <span className="truncate">{l}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gold" style={{ width: Math.round((v / max) * 100) + "%" }} /></div>
          <b className="text-right tabular-nums">{fmt(v)}</b>
        </div>
      ))}
    </div>
  );
}
