import Link from "./Go";
import { Activity, ArrowDownRight, ArrowUpRight, Boxes, ClipboardList, Gem, Store, TrendingUp, Users, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Btn, Card, Field, Table, Tr, cx, inputCls, type Kind } from "./ui";

const AUTO: [RegExp, Kind][] = [
  [/^(paid|approved|received|closed|delivered|done|passed|pass|matched|active|sold|ready|reconciled|in stock|live|yes|complete|met|on track)/i, "ok"],
  [/^(pending|draft|open|awaiting|due|partial|quoted|queued|in progress|at vendor|planned|reserved|watch)/i, "warn"],
  [/^(overdue|rejected|failed|fail|short|variance|blocked|lost|low|missing|breach|inactive)/i, "bad"],
  [/^(sent|issued|in transit|out|shipped|dispatched|scheduled|transit|at hallmark|at lab|new|invited)/i, "info"],
];

/** A badge whose colour follows its wording (Paid is green, Overdue is red, and so on). */
export function Pill({ children }: { children: string }) {
  const k = AUTO.find(([re]) => re.test(children))?.[1] ?? "mute";
  return <Badge kind={k}>{children}</Badge>;
}

/** A certificate number and HUID as one tidy mark: the lab, the number, and the hallmark. */
export function CertBadge({ cert, huid }: { cert?: string; huid?: string }) {
  const none = !cert || cert === "None";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {cert === undefined && huid ? null : none ? <span className="text-muted-foreground">No certificate</span> : <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[12px]">{cert}</span>}
      {huid && <span className="rounded-md border border-gold/60 bg-gold-light px-1.5 py-0.5 font-mono text-[12px]">{cert === undefined ? "" : "HUID "}{huid}</span>}
    </span>
  );
}

export function Grid({ head, rows, num = [], onRow, sel }: { head: string[]; rows: ReactNode[][]; num?: number[]; onRow?: (i: number) => void; sel?: number }) {
  return (
    <Table head={head} num={num}>
      {rows.map((r, i) => <Tr key={i} cells={r} num={num} onClick={onRow ? () => onRow(i) : undefined} selected={sel === i} />)}
    </Table>
  );
}

const ic = "size-4";
const KPI_ICONS: [RegExp, ReactNode][] = [
  [/revenue|sales|sold|invoice|collected|billed/i, <TrendingUp key="a" className={ic} aria-hidden />], [/stock|piece|inventory|transit|location/i, <Boxes key="b" className={ic} aria-hidden />],
  [/owed|receivable|payable|collection|balance/i, <Wallet key="c" className={ic} aria-hidden />], [/gold|fine|lot|metal/i, <Gem key="d" className={ic} aria-hidden />],
  [/job|card|production|vendor|cycle|stage/i, <ClipboardList key="e" className={ic} aria-hidden />], [/customer|repeat|spend|segment/i, <Users key="f" className={ic} aria-hidden />],
  [/store|target|mumbai|delhi/i, <Store key="g" className={ic} aria-hidden />],
];
const kpiIcon = (label: string): ReactNode => KPI_ICONS.find(([re]) => re.test(label))?.[1] ?? <Activity className={ic} aria-hidden />;

/** A figure tile: label and icon on top, the number large, a short note under it. */
export function Tile({ label, value, note, alert, href, onPick, delta, deltaNote = "vs same days last month" }: { label: string; value: string; note?: string; alert?: boolean; href?: string; onPick?: () => void; delta?: number; deltaNote?: string }) {
  const body = (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="grid size-10 flex-none place-items-center rounded-xl bg-mist text-primary transition-colors group-hover:bg-gold group-hover:text-gold-fg">{kpiIcon(label)}</span>
      </span>
      <b className={cx("mt-3 block font-display text-[2rem] font-semibold leading-tight tabular-nums", alert && "text-danger")}>{value}</b>
      {delta !== undefined && (
        <span className={cx("mt-2 inline-flex items-center gap-1 text-sm font-semibold", delta >= 0 ? "text-success" : "text-danger")}>
          {delta >= 0 ? <ArrowUpRight className="size-4" aria-hidden /> : <ArrowDownRight className="size-4" aria-hidden />}
          {Math.abs(delta)}%<span className="ml-1 font-normal text-muted-foreground">{deltaNote}</span>
        </span>
      )}
      {note && <span className="mt-1 block text-sm text-muted-foreground">{note}</span>}
    </>
  );
  const cls = "group block min-w-0 rounded-2xl border border-border bg-card p-6 transition-[transform,box-shadow,border-color] duration-200";
  const lift = "hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-[0_8px_24px_rgba(4,53,68,0.10)]";
  if (onPick) return <button type="button" onClick={onPick} className={cx(cls, lift, "w-full text-left")}>{body}</button>;
  return href ? <Link href={href} className={cx(cls, lift)}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Figure tiles. The fifth value makes a tile clickable: a path goes to that screen, a function switches a tab on this one. */
export function Kpis({ items }: { items: [label: string, value: string, sub?: string, delta?: number, to?: string | (() => void)][] }) {
  return (
    <div className="mb-10 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-6">
      {items.map(([l, v, sub, dl, to]) => <Tile key={l} label={l} value={v} note={sub} delta={dl} href={typeof to === "string" ? to : undefined} onPick={typeof to === "function" ? to : undefined} />)}
    </div>
  );
}

export interface FieldDef { id: string; label: string; type?: "text" | "number" | "date" | "select" | "textarea" | "password" | "email" | "tel"; options?: string[]; value?: string; placeholder?: string }
const areaCls = "min-h-20 rounded-lg border border-border bg-background px-2.5 py-2";

/** A form that hands its values to onSubmit. Nothing is stored unless the handler stores it. */
export function FormCard({ title, fields, cta, onSubmit, children, cols = 1, className }: {
  title?: ReactNode; fields: FieldDef[]; cta: string; onSubmit: (v: Record<string, string>) => void; children?: ReactNode; cols?: 1 | 2; className?: string;
}) {
  return (
    <Card title={title} className={className}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v)]))); }}
        className={cx("grid gap-x-3.5", cols === 2 && "sm:grid-cols-2")}
      >
        {fields.map((f) => (
          <Field key={f.id} label={f.label} htmlFor={f.id}>
            {f.type === "select" ? (
              <select id={f.id} name={f.id} defaultValue={f.value} className={inputCls}>{f.options?.map((o) => <option key={o}>{o}</option>)}</select>
            ) : f.type === "textarea" ? (
              <textarea id={f.id} name={f.id} defaultValue={f.value} placeholder={f.placeholder} className={areaCls} />
            ) : (
              <input id={f.id} name={f.id} type={f.type ?? "text"} defaultValue={f.value} placeholder={f.placeholder} className={inputCls} />
            )}
          </Field>
        ))}
        {children}
        <div className={cx(cols === 2 && "sm:col-span-2")}><Btn gold type="submit">{cta}</Btn></div>
      </form>
    </Card>
  );
}
