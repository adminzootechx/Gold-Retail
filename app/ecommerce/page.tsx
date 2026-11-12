"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "../lib/store";
import { MTO_STEPS, SALE_STEPS, orderNext, releaseOrder } from "../lib/actions";
import { alloc } from "../lib/calc";
import { Badge, Btn, Card, PageHeader, Step, Table, Tabs, Tr } from "../components/ui";
import { Grid, Pill } from "../components/kit";

type Tab = "inbox" | "payments" | "pick" | "ship" | "notify";

function Ecommerce() {
  const { s, act, say } = useStore();
  const [tab, setTab] = useState<Tab>("inbox");
  const [sel, setSel] = useState(useSearchParams().get("order") ?? "WEB-5024");
  const o = s.orders.find((x) => x.id === sel) ?? s.orders[0];
  const a = alloc(s.items, o);
  const steps = o.mto || (o.state === 0 && a.mode === "mto") ? MTO_STEPS : SALE_STEPS;
  const label =
    a.mode === "mto" ? "No stock anywhere. Create a manufacturing order."
    : a.mode === "ho" ? `Reserve ${a.item.tag} at HO Vault.`
    : a.mode === "store" ? `Reserve ${a.item.tag} at ${a.item.loc}, ship direct or transfer.`
    : `Held: ${a.item?.tag} at ${a.item?.loc}.`;
  const stepName = (x: typeof o) => (x.mto ? MTO_STEPS : SALE_STEPS)[x.state];

  return (
    <>
      <PageHeader title="E-commerce orders" sub="The order exists from checkout. The piece is reserved before payment, so two buyers cannot pay for one piece." />
      <Tabs<Tab> tabs={[["inbox", "Order inbox"], ["payments", "Payment verification"], ["pick", "Pick and pack"], ["ship", "Shipping and tracking"], ["notify", "Notification log"]]} value={tab} onChange={setTab} />

      {tab === "inbox" && (
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Table head={["Order", "Customer", "Piece", "Step"]}>
            {s.orders.map((x) => (
              <Tr key={x.id} selected={x.id === o.id} onClick={() => setSel(x.id)}
                cells={[<span key="i" className="font-mono text-[12.5px]">{x.id}</span>, x.cust, `${x.sku} · ${x.variant}`, <Badge key="s" kind={x.state === 7 ? "ok" : "gold"}>{stepName(x)}</Badge>]} />
            ))}
          </Table>
          <Card title={`${o.id} · ${o.cust}`}>
            <div className="mb-3 rounded-[10px] bg-gold-light px-3 py-2.5"><b>Fulfilment engine</b><br />{label}</div>
            <div className="flex flex-col gap-2">{steps.map((st, i) => <Step key={st} done={i <= o.state} next={i === o.state + 1}><p>{st}</p></Step>)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {o.state < 7 ? <Btn gold onClick={() => act((d) => orderNext(d, o.id))}>Next step</Btn> : <Badge kind="ok">Delivered</Badge>}
              {o.state === 1 && !o.mto && <Btn onClick={() => act((d) => releaseOrder(d, o.id))}>Payment failed, release</Btn>}
            </div>
            {o.notes.length > 0 && (
              <>
                <h3 className="mb-1.5 mt-4 text-lg font-semibold">Customer notifications</h3>
                <ul className="list-disc pl-[18px]">{o.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === "payments" && (
        <Grid head={["Order", "Customer", "Method", "Status", ""]}
          rows={s.orders.map((x) => [x.id, x.cust, "UPI", <Pill key="s">{x.state >= 2 || x.mto && x.state >= 1 ? "Paid" : "Pending"}</Pill>, x.state < 2 ? <Btn key="b" sm onClick={() => say(x.id + ": use Next step in the order inbox to reserve and verify")}>Verify</Btn> : ""])} />
      )}

      {tab === "pick" && (
        <Grid head={["Order", "Piece", "Pick from", "Step"]}
          rows={s.orders.filter((x) => x.item).map((x) => { const it = s.items.find((i) => i.tag === x.item); return [x.id, x.item!, it?.loc ?? "-", <Pill key="s">{stepName(x)}</Pill>]; })} />
      )}

      {tab === "ship" && (
        <Grid head={["Order", "Courier", "Tracking no.", "Status"]}
          rows={s.orders.filter((x) => x.state >= 5).map((x) => [x.id, "BlueDart, insured", "BD" + (4410000 + x.id.length * 977), <Pill key="s">{x.state >= 7 ? "Delivered" : x.state === 6 ? "In transit" : "Packed"}</Pill>])} />
      )}
      {tab === "ship" && !s.orders.some((x) => x.state >= 5) && <p className="mt-2 text-muted-foreground">No orders packed yet. Move an order to Packed in the inbox.</p>}

      {tab === "notify" && (
        <Grid head={["Order", "Customer", "Message"]} rows={s.orders.flatMap((x) => x.notes.map((n) => [x.id, x.cust, n]))} />
      )}
      {tab === "notify" && !s.orders.some((x) => x.notes.length) && <p className="mt-2 text-muted-foreground">No messages yet.</p>}
    </>
  );
}

export default function EcommercePage() {
  return <Suspense fallback={null}><Ecommerce /></Suspense>;
}
