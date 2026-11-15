"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { posSale, receiveItem } from "../lib/actions2";
import { saveWalkin } from "../lib/actions3";
import { ofKind } from "../lib/records";
import { g, inr } from "../lib/calc";
import { THIS_MONTH, TODAY, custName, lakh, monthKey } from "../lib/stats";
import { Bars, Btn, Card, Field, PageHeader, Rec, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";
import { PrintButton } from "../components/Labels";
import { STORES } from "../lib/mock";
import type { Item } from "../lib/data";

type Tab = "pos" | "stock" | "receipt" | "day" | "targets" | "walkin";
const TARGET: Record<string, number> = { "Mumbai Flagship": 4000000, "Delhi Store": 2000000 };

export default function Stores() {
  const { s, act, say } = useStore();
  const [tab, setTab] = useState<Tab>("pos");
  const [store, setStore] = useState(STORES[0]);
  const [cart, setCart] = useState<string[]>([]);
  const [pick, setPick] = useState("");
  const [scan, setScan] = useState("");
  const [cust, setCust] = useState("Walk-in customer");
  const [sale, setSale] = useState<{ inv: string; lines: Item[]; who: string } | null>(null);
  const [open, setOpen] = useState(false);

  const here = s.items.filter((i) => i.loc === store && i.status === "InStock");
  const choices = here.filter((i) => !cart.includes(i.tag));
  const lines = cart.map((t) => s.items.find((i) => i.tag === t)!).filter(Boolean);
  const subtotal = lines.reduce((a, i) => a + i.price, 0);
  const sold = (n: string) => s.invoices.filter((v) => v.store === n && monthKey(v.date) === THIS_MONTH).reduce((a, v) => a + v.amount, 0);

  // A barcode scanner types the tag and presses Enter, exactly like a keyboard.
  const addScanned = () => {
    const t = scan.trim().toUpperCase();
    if (!t) return;
    const it = s.items.find((i) => i.tag === t);
    if (!it) say(`No piece with tag ${t}`);
    else if (it.status !== "InStock" || it.loc !== store) say(`${t} is not in stock at ${store} (${it.status} at ${it.loc})`);
    else if (cart.includes(t)) say(`${t} is already on the bill`);
    else setCart([...cart, t]);
    setScan("");
  };

  const complete = () => {
    const inv = "INV-" + (3200 + s.invoices.length);
    setSale({ inv, lines, who: cust });
    act((d) => posSale(d, cart, cust, store));
    setCart([]);
  };

  return (
    <>
      <PageHeader title="Store operations" sub="POS with tag scan, store stock, goods receipt from HO, day open and close, targets.">
        <select aria-label="Store" className="h-9 rounded-lg border border-border bg-card px-2" value={store} onChange={(e) => { setStore(e.target.value); setCart([]); }}>{STORES.map((x) => <option key={x}>{x}</option>)}</select>
      </PageHeader>
      <Tabs<Tab> tabs={[["pos", "POS"], ["stock", "Store stock"], ["receipt", "Goods receipt"], ["day", "Day open and close"], ["targets", "Targets"], ["walkin", "Walk-ins"]]} value={tab} onChange={setTab} />

      {tab === "pos" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1.2fr_1fr]">
          <Card title="Bill a sale">
            <Field label="Scan a tag with the barcode scanner, then Enter" htmlFor="scan">
              <input id="scan" autoFocus value={scan} onChange={(e) => setScan(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addScanned(); }} placeholder="AK-RNG-014-0003" className={inputCls + " font-mono"} />
            </Field>
            <Field label="Or choose a piece (this store only)" htmlFor="pick">
              <div className="flex gap-2">
                <select id="pick" className={inputCls + " flex-1"} value={pick} onChange={(e) => setPick(e.target.value)}>
                  <option value="">Choose a piece</option>{choices.map((i) => <option key={i.tag} value={i.tag}>{i.tag} · {i.variant}</option>)}
                </select>
                <Btn onClick={() => { if (pick) { setCart([...cart, pick]); setPick(""); } }}>Add</Btn>
              </div>
            </Field>
            <Field label="Customer" htmlFor="cust"><select id="cust" className={inputCls} value={cust} onChange={(e) => setCust(e.target.value)}>{["Walk-in customer", ...s.customers.map((c) => c.name)].map((n) => <option key={n}>{n}</option>)}</select></Field>
            <Grid head={["Tag", "Piece", "Price"]} num={[2]} rows={lines.map((i) => [i.tag, `${i.name}, ${i.variant}`, inr(i.price)])} />
            {!lines.length && <p className="mt-2 text-muted-foreground">No pieces added yet. {here.length} in stock at {store}.</p>}
          </Card>
          <div className="flex flex-col gap-3.5">
            <Card title="Bill">
              <Rec rows={[["Pieces", String(lines.length)], ["Taxable value", inr(subtotal / 1.03)], ["GST (rate from configuration)", inr(subtotal - subtotal / 1.03)], ["Total", inr(subtotal), true]]} />
              <div className="mt-3"><Btn gold disabled={!lines.length} onClick={complete}>Complete sale</Btn></div>
            </Card>
            {sale && (
              <Card title={`Receipt ${sale.inv}`}>
                <div className="print-area rounded-lg border border-dashed border-border bg-white p-4 text-[13px] text-black">
                  <div className="text-center"><b className="font-display tracking-[0.2em]">AKOIRAH</b><div className="text-xs">{store}</div><div className="text-xs">{sale.inv} · 12 Nov 2026</div></div>
                  <div className="my-2 border-t border-dashed border-black/40" />
                  {sale.lines.map((i) => (
                    <div key={i.tag} className="mb-1.5"><div className="flex justify-between"><span>{i.name}, {i.variant}</span><span>{inr(i.price)}</span></div><div className="font-mono text-[11px]">{i.tag} · HUID {i.huid} · {g(i.net)}</div></div>
                  ))}
                  <div className="my-2 border-t border-dashed border-black/40" />
                  <div className="flex justify-between font-bold"><span>Total</span><span>{inr(sale.lines.reduce((a, i) => a + i.price, 0))}</span></div>
                  <div className="text-xs">Customer: {sale.who}</div>
                  <div className="mt-2 text-center text-[11px]">Lifetime exchange on every piece. Thank you.</div>
                </div>
                <div className="mt-2.5"><PrintButton>Print receipt</PrintButton></div>
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === "stock" && (
        <Grid head={["Tag", "Piece", "Variant", "HUID", "Status", "Price"]} num={[5]}
          rows={s.items.filter((i) => i.loc === store).map((i) => [i.tag, i.name, i.variant, i.huid, <Pill key="s">{i.status === "InStock" ? "In stock" : i.status}</Pill>, inr(i.price)])} />
      )}

      {tab === "receipt" && (
        <>
          <Grid head={["Piece", "Route", "Status", ""]}
            rows={s.items.filter((i) => i.status === "InTransit" && i.to === store).map((i) => [i.tag, i.loc, <Pill key="s">In transit</Pill>, <Btn key="b" sm gold onClick={() => act((d) => receiveItem(d, i.tag))}>Receive</Btn>])} />
          {!s.items.some((i) => i.status === "InTransit" && i.to === store) && <p className="mt-2 text-muted-foreground">Nothing in transit to {store}. Send a piece from Inventory, Transfers.</p>}
        </>
      )}

      {tab === "day" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <FormCard title={open ? "Close the day" : "Open the day"} cta={open ? "Close day" : "Open day"} fields={[
            { id: "cash", label: open ? "Closing cash counted" : "Opening cash", type: "number", value: open ? "186400" : "20000" },
            { id: "note", label: "Note", type: "textarea" },
          ]} onSubmit={() => { setOpen(!open); say(open ? "Day closed, sales summary sent to HO (prototype)" : store + " opened for the day (prototype)"); }} />
          <Card title="Today"><Rec rows={[["Store", store], ["Status", open ? "Open" : "Closed"], ["Sales today", String(s.invoices.filter((v) => v.store === store && v.date === TODAY).length)]]} /></Card>
        </div>
      )}

      {tab === "targets" && (
        <>
          <Kpis items={STORES.map((n) => [n, Math.round((sold(n) / TARGET[n]) * 100) + "%", `${lakh(sold(n))} of ${lakh(TARGET[n])}`] as [string, string, string])} />
          <Card title="Sales vs target, this month"><Bars data={STORES.map((n) => [n, Math.round((sold(n) / TARGET[n]) * 100)] as [string, number])} fmt={(v) => v + "%"} /></Card>
          <h3 className="mb-2 mt-5 text-lg font-semibold">Latest sales at {store}</h3>
          <Grid head={["Invoice", "Date", "Customer", "Amount"]} num={[3]} rows={[...s.invoices].reverse().filter((v) => v.store === store).slice(0, 6).map((v) => [v.id, v.date, custName(s.customers, v.custId), inr(v.amount)])} />
        </>
      )}

      {tab === "walkin" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <FormCard title="Capture a walk-in" cta="Save walk-in" fields={[{ id: "name", label: "Name" }, { id: "interest", label: "Interested in", value: "Solitaire ring" }]}
            onSubmit={(v) => act((d) => saveWalkin(d, v.name, v.interest, store))} />
          <Grid head={["Date", "Name", "Interested in", "Store", "Captured by"]} rows={ofKind(s.records, "walkin").map((w) => [w.date, w.f.name, w.f.interest, w.f.store, w.by])} />
        </div>
      )}
    </>
  );
}
