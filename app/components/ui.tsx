import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import type { Status } from "../lib/data";

export const cx = (...a: (string | false | undefined | null)[]) => a.filter(Boolean).join(" ");

const KINDS = {
  ok: "bg-success-bg text-success",
  warn: "bg-warning-bg text-warning",
  bad: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  gold: "bg-gold-light text-primary",
  mute: "bg-muted text-muted-foreground",
};
export type Kind = keyof typeof KINDS;

export function Badge({ kind = "mute", children }: { kind?: Kind; children: ReactNode }) {
  return <span className={cx("relative inline-block whitespace-nowrap rounded-md py-0.5 pl-5 pr-2.5 text-xs font-semibold before:absolute before:left-2 before:top-1/2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-current before:opacity-60", KINDS[kind])}>{children}</span>;
}

const STATUS: Record<Status, [string, Kind]> = {
  InStock: ["In stock", "ok"], Reserved: ["Reserved", "warn"], InTransit: ["In transit", "info"],
  OnConsignment: ["On consignment", "gold"], Sold: ["Sold", "mute"], InRepair: ["In repair", "warn"], AtHallmark: ["At hallmark centre", "info"],
};
export const STATUS_LABEL = (s: Status) => STATUS[s][0];
export const StatusBadge = ({ status }: { status: Status }) => <Badge kind={STATUS[status][1]}>{STATUS[status][0]}</Badge>;

export function PageHeader({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[2.1rem] font-semibold leading-tight">{title}</h1>
        {sub && <p className="mt-1 text-base text-muted-foreground">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ title, children, className }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cx("min-w-0 rounded-[20px] border border-border bg-card p-6", className)}>
      {title && <h2 className="mb-5 text-xl font-semibold">{title}</h2>}
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
        sm ? "min-h-10 px-3 text-[13px]" : "min-h-10 px-4 text-sm",
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
              <th key={h + i} className={cx("whitespace-nowrap border-b border-border bg-muted px-3.5 py-2.5 text-xs font-semibold tracking-wide text-muted-foreground", num.includes(i) ? "text-right" : "text-left")}>{h}</th>
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
      onKeyDown={onClick ? (e) => {
        if (e.key === "Enter") onClick();
        // Arrow keys move between rows, so a list can be worked without the mouse.
        const to = e.key === "ArrowDown" ? e.currentTarget.nextElementSibling : e.key === "ArrowUp" ? e.currentTarget.previousElementSibling : null;
        if (to instanceof HTMLElement) { e.preventDefault(); to.focus(); }
      } : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cx("border-b border-border outline-none last:border-0 focus-visible:bg-gold-light focus-visible:shadow-[inset_3px_0_0_var(--gold)]", onClick && "cursor-pointer hover:bg-gold-light", selected && "bg-gold-light")}
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

/** Arrow keys, Home and End move between the tabs of a tab list, as screen-reader users expect. */
export function tabKeys(e: KeyboardEvent<HTMLElement>) {
  const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
  if (!keys.includes(e.key)) return;
  const tabs = [...(e.currentTarget.closest('[role="tablist"]')?.querySelectorAll<HTMLElement>('[role="tab"]') ?? [])];
  const at = tabs.indexOf(e.currentTarget);
  const to = e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : (at + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
  e.preventDefault();
  tabs[to]?.focus();
  tabs[to]?.click();
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-6 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-mist p-1" role="tablist">
      {tabs.map(([k, l]) => (
        <button key={k} role="tab" aria-selected={value === k} tabIndex={value === k ? 0 : -1} onKeyDown={tabKeys} onClick={() => onChange(k)}
          className={cx("min-h-10 whitespace-nowrap rounded-lg px-4 py-2 font-semibold transition-colors pointer-coarse:min-h-11", value === k ? "bg-white text-primary shadow-sm" : "text-muted-foreground hover:text-primary")}>{l}</button>
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
          <span className="break-words">{l}</span>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full bg-gold" style={{ width: Math.round((v / max) * 100) + "%" }} /></div>
          <b className="text-right tabular-nums">{fmt(v)}</b>
        </div>
      ))}
    </div>
  );
}
