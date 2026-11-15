import Link from "./Go";
import { Activity, Boxes, ClipboardList, Gem, Store, TrendingUp, Users, Wallet } from "lucide-react";
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
export function Tile({ label, value, note, alert, href }: { label: string; value: string; note?: string; alert?: boolean; href?: string }) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="grid size-9 flex-none place-items-center rounded-full bg-gold-light text-primary">{kpiIcon(label)}</span>
      </div>
      <b className={cx("mt-2 block font-sans text-[1.9rem] font-semibold leading-tight tabular-nums", alert && "text-danger")}>{value}</b>
      {note && <span className="mt-1 block text-sm text-muted-foreground">{note}</span>}
    </>
  );
  const cls = "block min-w-0 rounded-2xl border border-border bg-card p-5 transition-colors duration-150";
  return href ? <Link href={href} className={cx(cls, "hover:border-primary/40")}>{body}</Link> : <div className={cls}>{body}</div>;
}

export function Kpis({ items }: { items: [label: string, value: string, sub?: string][] }) {
  return (
    <div className="mb-8 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-4">
      {items.map(([l, v, sub]) => <Tile key={l} label={l} value={v} note={sub} />)}
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
