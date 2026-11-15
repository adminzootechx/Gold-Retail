"use client";
import { setPrefs, usePrefs, type Prefs } from "../lib/prefs";
import { Card, PageHeader, cx } from "../components/ui";

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={cx("min-h-10 rounded-lg border px-3.5 font-semibold pointer-coarse:min-h-11", value === v ? "border-gold bg-gold-light text-primary" : "border-border bg-card hover:bg-muted")}>{text}</button>
      ))}
    </div>
  );
}

const NOTIFY: [string, string, string][] = [
  ["approvals", "Approvals waiting on me", "A request needs your decision"],
  ["orders", "Online orders", "A new order, or one that is stuck"],
  ["stock", "Stock and gold", "A job card is short, or a SKU runs out"],
  ["payments", "Payments", "An invoice becomes overdue"],
];

export default function Preferences() {
  const p = usePrefs();
  const set = (patch: Partial<Prefs>) => setPrefs(patch);

  return (
    <>
      <PageHeader title="Preferences" sub="How the app looks on this device." />
      <div className="grid items-start gap-3.5 lg:grid-cols-2">
        <Card title="Display">
          <p className="mb-1.5 font-semibold">Table density</p>
          <Choice label="Table density" value={p.density} onChange={(density) => set({ density })} options={[["comfortable", "Comfortable"], ["compact", "Compact"]]} />
          <p className="mb-1.5 mt-4 font-semibold">Text size</p>
          <Choice label="Text size" value={p.text} onChange={(text) => set({ text })} options={[["normal", "Normal"], ["large", "Large"]]} />
          <p className="mt-3 text-muted-foreground">Compact fits more rows on screen. Large is easier to read on a store tablet.</p>
        </Card>
        <Card title="Notifications">
          <p className="mb-2 text-muted-foreground">Choose what you want to hear about. Messages are only logged in this prototype, nothing is sent.</p>
          {NOTIFY.map(([k, label, hint]) => (
            <label key={k} className="flex min-h-12 cursor-pointer items-center justify-between gap-3 border-b border-border last:border-0">
              <span><b className="block">{label}</b><small className="text-muted-foreground">{hint}</small></span>
              <input type="checkbox" checked={p.notify[k]} onChange={(e) => set({ notify: { ...p.notify, [k]: e.target.checked } })} className="size-5 accent-[var(--gold)]" />
            </label>
          ))}
        </Card>
      </div>
    </>
  );
}
