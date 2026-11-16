"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useStore } from "../lib/store";
import { useDialog } from "../lib/useDialog";
import { createJobCard, createPO, jcEstimate, nextJc } from "../lib/actions2";
import { createSkuFromDesign, placeOrder } from "../lib/actions";
import { createRefund, createRepair, raisePr } from "../lib/actions3";
import { CAT_LABEL, addStock, setStoneIn, type StockCat } from "../lib/actions4";
import { inr } from "../lib/calc";
import { g } from "../lib/calc";
import { VENDORS, SUPPLIERS } from "../lib/mock";
import { Btn, Field, cx, inputCls } from "./ui";

/** A form in a dialog over the page: focus moves to the first field, Tab stays inside, Escape closes. */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLElement | null>(null);
  useEffect(() => { if (open) first.current = panel.current?.querySelector<HTMLElement>("input, select, textarea") ?? null; }, [open]);
  useDialog(open, onClose, panel, first);
  return (
    <div className={cx("no-print fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-[8vh] transition-opacity duration-150 motion-reduce:transition-none", open ? "opacity-100" : "pointer-events-none invisible opacity-0")}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!open} inert={!open} className="w-full max-w-[520px] rounded-[20px] bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-lg hover:bg-muted"><X className="size-5" aria-hidden /></button>
        </div>
        {open && children}
      </div>
    </div>
  );
}

const grid = "grid gap-x-4 sm:grid-cols-2";
const Actions = ({ onClose, cta }: { onClose: () => void; cta: string }) => (
  <div className="mt-2 flex items-center gap-2 sm:col-span-2"><Btn gold type="submit">{cta}</Btn><Btn type="button" onClick={onClose}>Cancel</Btn></div>
);

/** Open a job card. Gold and stones start at the estimate for the SKU and quantity, and can be changed. */
export function NewJobCard({ open, onClose, sku: preset, qty: presetQty }: { open: boolean; onClose: () => void; sku?: string; qty?: number }) {
  const { s, act } = useStore();
  const router = useRouter();
  const [sku, setSku] = useState(preset ?? s.skus[0]?.code ?? "");
  const [qty, setQty] = useState(String(presetQty ?? 4));
  const est = jcEstimate(s, sku, Math.max(1, +qty || 1));
  const [gold, setGold] = useState<string | null>(null);
  const [stones, setStones] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  // Each time the dialog opens it starts from the SKU and quantity it was opened with.
  if (open !== wasOpen) { setWasOpen(open); if (open) { setSku(preset ?? s.skus[0]?.code ?? ""); setQty(String(presetQty ?? 4)); setGold(null); setStones(null); } }

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const id = nextJc(s.jcs);
    const q = +String(f.get("qty"));
    const mg = Math.round(+String(f.get("gold")) * 1000);
    let ok = false;
    act((d) => { const m = createJobCard(d, String(f.get("vendor")), sku, q, String(f.get("lot")), mg, +String(f.get("stones"))); ok = !!m && m.startsWith(id); return m; });
    if (ok) { onClose(); router.push("/job-work?jc=" + id); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New job card">
      <form onSubmit={submit} className={grid}>
        <Field label="Vendor" htmlFor="njc-vendor"><select id="njc-vendor" name="vendor" className={inputCls}>{VENDORS.map((v) => <option key={v.name}>{v.name}</option>)}</select></Field>
        <Field label="SKU" htmlFor="njc-sku"><select id="njc-sku" value={sku} onChange={(e) => { setSku(e.target.value); setGold(null); setStones(null); }} className={inputCls}>{s.skus.map((k) => <option key={k.code} value={k.code}>{k.code} · {k.name}</option>)}</select></Field>
        <Field label="Pieces to make" htmlFor="njc-qty"><input id="njc-qty" name="qty" type="number" min={1} step={1} value={qty} onChange={(e) => { setQty(e.target.value); setGold(null); setStones(null); }} className={inputCls} /></Field>
        <Field label="Metal lot" htmlFor="njc-lot"><select id="njc-lot" name="lot" className={inputCls}>{s.lots.map((l) => <option key={l.id} value={l.id}>{l.id} · {g(l.fine)} left</option>)}</select></Field>
        <Field label="Fine gold to issue, in grams" htmlFor="njc-gold"><input id="njc-gold" name="gold" type="number" min={0} step="0.001" value={gold ?? (est.gold / 1000).toFixed(3)} onChange={(e) => setGold(e.target.value)} className={inputCls} /></Field>
        <Field label="Stones to issue, in points" htmlFor="njc-stones"><input id="njc-stones" name="stones" type="number" min={0} step={1} value={stones ?? String(est.stones)} onChange={(e) => setStones(e.target.value)} className={inputCls} /></Field>
        <p className="mb-3 text-sm text-muted-foreground sm:col-span-2">Gold and stones start at the estimate for this SKU. Set them to 0 to issue material later from a material issue slip.</p>
        <Actions onClose={onClose} cta="Create job card" />
      </form>
    </Modal>
  );
}

/** Ask Procurement to buy something. Item, quantity and reason can come pre-filled from a reorder alert. */
export function NewRequest({ open, onClose, item = "", qty = "", reason = "Below reorder level" }: { open: boolean; onClose: () => void; item?: string; qty?: string; reason?: string }) {
  const { act } = useStore();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const it = String(f.get("item"));
    act((d) => raisePr(d, it, String(f.get("qty")), String(f.get("reason"))));
    if (it.trim()) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Raise a purchase request">
      <form onSubmit={submit} className="grid">
        <Field label="Item" htmlFor="npr-item"><input id="npr-item" name="item" defaultValue={item} placeholder="Round 1.0 mm melee, VS-EF" className={inputCls} /></Field>
        <Field label="Quantity" htmlFor="npr-qty"><input id="npr-qty" name="qty" defaultValue={qty || "10 pcs"} className={inputCls} /></Field>
        <Field label="Reason" htmlFor="npr-reason"><input id="npr-reason" name="reason" defaultValue={reason} className={inputCls} /></Field>
        <Actions onClose={onClose} cta="Raise request" />
      </form>
    </Modal>
  );
}

/** A purchase order to a supplier. Above the PO limit it goes for approval first. */
export function NewPurchaseOrder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { act } = useStore();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    act((d) => createPO(d, String(f.get("supplier")), String(f.get("what")), String(f.get("qty")), +String(f.get("value")) || 0));
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New purchase order">
      <form onSubmit={submit} className={grid}>
        <Field label="Supplier" htmlFor="npo-sup"><select id="npo-sup" name="supplier" className={inputCls}>{SUPPLIERS.map((x) => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Item" htmlFor="npo-what"><input id="npo-what" name="what" defaultValue="Fine gold 999" className={inputCls} /></Field>
        <Field label="Quantity" htmlFor="npo-qty"><input id="npo-qty" name="qty" defaultValue="100.000 g" className={inputCls} /></Field>
        <Field label="Value (rupees)" htmlFor="npo-val"><input id="npo-val" name="value" type="number" min={0} defaultValue={1325000} className={inputCls} /></Field>
        <Actions onClose={onClose} cta="Create purchase order" />
      </form>
    </Modal>
  );
}

/** Pieces a customer owns, looked up by tag. */
const Owned = ({ id, tag, onPick }: { id: string; tag: string; onPick: (t: string) => void }) => {
  const { s } = useStore();
  return <Field label="Piece, by tag" htmlFor={id}><select id={id} value={tag} onChange={(e) => onPick(e.target.value)} className={inputCls}>{s.items.filter((i) => i.cust).map((i) => <option key={i.tag} value={i.tag}>{i.tag} · {i.cust}</option>)}</select></Field>;
};

/** Take a piece in for repair. */
export function NewRepair({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, act } = useStore();
  const [tag, setTag] = useState("");
  const cur = tag || s.items.find((i) => i.cust)?.tag || "";
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const issue = String(f.get("issue"));
    act((d) => createRepair(d, cur, issue, +String(f.get("quote"))));
    if (issue.trim()) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New repair">
      <form onSubmit={submit} className="grid">
        <Owned id="nrp-tag" tag={cur} onPick={setTag} />
        <Field label="Issue" htmlFor="nrp-issue"><input id="nrp-issue" name="issue" placeholder="Prong re-tip, 3 stones" className={inputCls} /></Field>
        <Field label="Quote (rupees)" htmlFor="nrp-quote"><input id="nrp-quote" name="quote" type="number" min={0} defaultValue={1500} className={inputCls} /></Field>
        <Actions onClose={onClose} cta="Take in for repair" />
      </form>
    </Modal>
  );
}

/** Ask for a refund. It goes for approval; approving it returns the piece to stock. */
export function NewRefund({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, act } = useStore();
  const [tag, setTag] = useState("");
  const cur = tag || s.items.find((i) => i.cust)?.tag || "";
  const price = s.items.find((i) => i.tag === cur)?.price ?? 0;
  const [amt, setAmt] = useState<string | null>(null);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const reason = String(f.get("reason"));
    act((d) => createRefund(d, cur, reason, +String(f.get("amount"))));
    if (reason.trim()) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New refund request">
      <form onSubmit={submit} className="grid">
        <Owned id="nrf-tag" tag={cur} onPick={(t) => { setTag(t); setAmt(null); }} />
        <Field label="Reason" htmlFor="nrf-reason"><input id="nrf-reason" name="reason" placeholder="Wrong length" className={inputCls} /></Field>
        <Field label="Refund amount (rupees)" htmlFor="nrf-amt"><input id="nrf-amt" name="amount" type="number" min={1} max={price} value={amt ?? String(price)} onChange={(e) => setAmt(e.target.value)} className={inputCls} /></Field>
        <p className="mb-3 text-sm text-muted-foreground">Sale price {inr(price)}. The request waits for approval. Once approved, the piece returns to stock through QC.</p>
        <Actions onClose={onClose} cta="Send for approval" />
      </form>
    </Modal>
  );
}

/** After the final CAD is locked: a new SKU, or a new variant of one that exists. */
export function NewSku({ open, onClose, design }: { open: boolean; onClose: () => void; design: string }) {
  const { s, act } = useStore();
  const [mode, setMode] = useState<"new" | "variant">("new");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    let ok = false;
    act((d) => { const m = createSkuFromDesign(d, design, mode, String(f.get("sku") ?? ""), String(f.get("variant") ?? "")); ok = !!m && /Ready for production planning/.test(m); return m; });
    if (ok) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={"Create SKU from " + design}>
      <form onSubmit={submit} className="grid">
        <fieldset className="mb-3 flex gap-5">
          <legend className="mb-1 text-[12.5px] font-semibold">This design is</legend>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === "new"} onChange={() => setMode("new")} className="accent-[var(--gold)]" />A new SKU</label>
          <label className="flex items-center gap-2"><input type="radio" checked={mode === "variant"} onChange={() => setMode("variant")} className="accent-[var(--gold)]" />A variant of an existing SKU</label>
        </fieldset>
        {mode === "variant" && (
          <>
            <Field label="SKU" htmlFor="nsk-sku"><select id="nsk-sku" name="sku" className={inputCls}>{s.skus.map((k) => <option key={k.code} value={k.code}>{k.code} · {k.name}</option>)}</select></Field>
            <Field label="Variant" htmlFor="nsk-var"><input id="nsk-var" name="variant" placeholder="18K Rose" className={inputCls} /></Field>
          </>
        )}
        <p className="mb-3 text-sm text-muted-foreground">{mode === "new" ? "A new SKU is created with the design's name and an 18K Yellow variant. Set its BOM and pricing under Product Master & SKU Management." : "The variant is added to the SKU and can go straight to production planning."}</p>
        <Actions onClose={onClose} cta="Create" />
      </form>
    </Modal>
  );
}

/** An online order, as the customer places it. */
export function NewOnlineOrder({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, act } = useStore();
  const [sku, setSku] = useState("");
  const cur = sku || s.skus[0]?.code || "";
  const variants = s.skus.find((k) => k.code === cur)?.variants ?? [];
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const who = String(f.get("cust"));
    act((d) => placeOrder(d, who, cur, String(f.get("variant"))));
    if (who.trim()) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="New online order">
      <form onSubmit={submit} className="grid">
        <Field label="Customer" htmlFor="noo-cust"><input id="noo-cust" name="cust" list="noo-people" placeholder="Kavya Nair" className={inputCls} /></Field>
        <datalist id="noo-people">{s.customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        <Field label="SKU" htmlFor="noo-sku"><select id="noo-sku" value={cur} onChange={(e) => setSku(e.target.value)} className={inputCls}>{s.skus.map((k) => <option key={k.code} value={k.code}>{k.code} · {k.name}</option>)}</select></Field>
        <Field label="Variant" htmlFor="noo-var"><select id="noo-var" name="variant" key={cur} className={inputCls}>{variants.map((v) => <option key={v}>{v}</option>)}</select></Field>
        <p className="mb-3 text-sm text-muted-foreground">The order waits for payment verification. Once paid, the ERP creates the sales order and checks stock.</p>
        <Actions onClose={onClose} cta="Place order" />
      </form>
    </Modal>
  );
}

const FIELDS: Record<StockCat, [string, string, string?][]> = {
  finding: [["item", "Item", "Prong settings 18K"], ["qty", "Quantity received", "100"], ["reorder", "Reorder level (optional)", ""]],
  pack: [["item", "Item", "Ring box, black"], ["qty", "Quantity received", "100"], ["reorder", "Reorder level (optional)", ""]],
  stone: [["no", "Report number", "IGI LG6120999"], ["weight", "Weight in carats", "0.70"], ["shape", "Shape", "Round"], ["colour", "Colour", "E"], ["clarity", "Clarity", "VS1"]],
  melee: [["lot", "Lot number", "ML-S-130"], ["type", "Type", "Round 1.0 mm"], ["pcs", "Pieces", "400"], ["ct", "Weight in carats", "4.00"], ["grade", "Grade", "VS-EF"]],
  cstone: [["lot", "Lot number", "CS-110"], ["type", "Stone", "Emerald, lab-grown"], ["pcs", "Pieces", "3"], ["ct", "Weight in carats", "2.40"]],
};

/** Receive raw material into its register: certified stones, melee, colour stones, findings or packaging. */
export function NewStock({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { act } = useStore();
  const [cat, setCat] = useState<StockCat>("finding");
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = Object.fromEntries([...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, String(v)]));
    let ok = false;
    act((d) => { const m = addStock(d, cat, f); ok = !!m && /added|topped/.test(m); return m; });
    if (ok) onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Receive stock">
      <form onSubmit={submit} className={grid} key={cat}>
        <div className="sm:col-span-2"><Field label="What is it" htmlFor="ns-cat"><select id="ns-cat" value={cat} onChange={(e) => setCat(e.target.value as StockCat)} className={inputCls}>{(Object.keys(CAT_LABEL) as StockCat[]).map((k) => <option key={k} value={k}>{CAT_LABEL[k]}</option>)}</select></Field></div>
        {FIELDS[cat].map(([id, label, ph]) => <Field key={id} label={label} htmlFor={"ns-" + id}><input id={"ns-" + id} name={id} placeholder={ph} className={inputCls} /></Field>)}
        <Actions onClose={onClose} cta="Add to stock" />
      </form>
    </Modal>
  );
}

/** Set a stone from the register into a piece. The piece's trace then names the stone. */
export function SetStone({ open, onClose, recId }: { open: boolean; onClose: () => void; recId: string }) {
  const { s, act } = useStore();
  const pieces = s.items.filter((i) => i.status !== "Sold");
  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); act((d) => setStoneIn(d, recId, String(new FormData(e.currentTarget).get("tag")))); onClose(); };
  return (
    <Modal open={open} onClose={onClose} title="Set stone in a piece">
      <form onSubmit={submit} className="grid">
        <Field label="Piece, by tag" htmlFor="ss-tag"><select id="ss-tag" name="tag" className={inputCls}>{pieces.map((i) => <option key={i.tag} value={i.tag}>{i.tag} · {i.name}</option>)}</select></Field>
        <Actions onClose={onClose} cta="Set stone" />
      </form>
    </Modal>
  );
}
