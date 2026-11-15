"use client";
import Link from "next/link";
import { useStore } from "./lib/store";
import { g, inr, jcCalc } from "./lib/calc";
import { STORE_TARGET, VENDOR_SELF, goldWhere, pipeline, revenueNow, salesMonth, salesToday, todos } from "./lib/home";
import { custName, dayLabel, lakh, plural, receivables, short } from "./lib/stats";
import { Card, PageHeader } from "./components/ui";
import { Grid, Pill } from "./components/kit";
import { ActivityFeed, Facts, GoldWhere, NeedsYou, Pipeline } from "./components/Home";
import type { State } from "./lib/data";

const both = ["Mumbai Flagship", "Delhi Store"];
const split = "grid items-start gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]";

function FounderHome({ s }: { s: State }) {
  const r = revenueNow(s);
  const live = s.items.filter((i) => i.status !== "Sold");
  const owed = receivables(s.invoices);
  const short = s.jcs.filter((j) => j.state === "Received" && !j.approved && jcCalc(j).unrec > 0).length;
  return (
    <>
      <Facts items={[
        { label: "Revenue this month", value: lakh(r.now), note: `Last month closed at ${lakh(r.prevTotal)}`, href: "/dashboards" },
        { label: "Stock value", value: lakh(live.reduce((a, i) => a + i.price, 0)), note: `${plural(live.length, "piece")} on the books`, href: "/inventory" },
        { label: "Owed to us", value: lakh(owed.reduce((a, v) => a + (v.amount - v.paid), 0)), note: `${plural(owed.length, "unpaid invoice")}`, href: "/finance" },
        { label: "Gold ledger", value: short ? plural(short, "card") + " short" : "Balanced", note: short ? "Job cards that do not reconcile" : "Every received job card reconciles", href: "/job-work", alert: short > 0 },
      ]} />
      <div className={split}>
        <NeedsYou items={todos(s, "Founder")} clear="Nothing needs a decision. Gold reconciles on every received job card and no payment is overdue." />
        <div className="flex flex-col gap-8">
          <GoldWhere parts={goldWhere(s)} />
          <ActivityFeed log={s.log} />
        </div>
      </div>
    </>
  );
}

function ProductionHome({ s }: { s: State }) {
  const open = s.jcs.filter((j) => j.state !== "Closed");
  return (
    <>
      <div className={split}>
        <NeedsYou items={todos(s, "Production manager")} clear="Nothing is waiting on you. Every received piece is tagged and every job card balances." />
        <div className="flex flex-col gap-8">
          <Pipeline steps={pipeline(s)} />
          <Card title="Gold on job cards">
            <Grid head={["Card", "Issued", "Status"]} num={[1]}
              rows={open.slice(0, 5).map((j) => {
                const c = jcCalc(j);
                return [<Link key="i" href={"/job-work?jc=" + j.id} className="inline-flex min-h-10 items-center font-mono text-[12.5px] text-primary underline">{j.id}</Link>, g(j.issued), j.state === "At vendor" ? <Pill key="s">At vendor</Pill> : c.unrec ? <Pill key="s">{"Short " + g(c.unrec)}</Pill> : <Pill key="s">Balanced</Pill>];
              })} />
          </Card>
        </div>
      </div>
    </>
  );
}

function StoreHome({ s }: { s: State }) {
  const today = salesToday(s, both);
  const month = salesMonth(s, both);
  const target = both.reduce((a, n) => a + STORE_TARGET[n], 0);
  const moving = s.orders.filter((o) => o.state < 7).length;
  const incoming = s.items.filter((i) => i.status === "InTransit").length;
  const latest = [...s.invoices].reverse().filter((v) => both.includes(v.store)).slice(0, 4);
  return (
    <>
      <Link href="/stores" className="mb-6 flex min-h-14 items-center justify-center rounded-2xl border border-gold bg-gold px-6 text-base font-semibold text-gold-fg hover:brightness-105 md:w-72">New bill</Link>
      <Facts items={[
        { label: "Sold today", value: today.length ? short(today.reduce((a, v) => a + v.amount, 0)) : "Nothing yet", note: plural(today.length, "bill"), href: "/stores" },
        { label: "This month", value: Math.round((month / target) * 100) + "%", note: `${lakh(month)} of ${lakh(target)} target`, href: "/stores" },
        { label: "Online orders to move", value: String(moving), note: "Not yet delivered", href: "/ecommerce" },
        { label: "Arriving at your stores", value: String(incoming), note: incoming ? "Receive them when they land" : "Nothing in transit", href: "/stores" },
      ]} />
      <div className={split}>
        <NeedsYou items={todos(s, "Store manager")} clear="Nothing needs you. All online orders are moving and no repair is waiting for a call." />
        <div className="flex flex-col gap-8">
          <Card title="Latest sales">
            <Grid head={["Invoice", "Customer", "Amount"]} num={[2]} rows={latest.map((v) => [v.id, custName(s.customers, v.custId), inr(v.amount)])} />
          </Card>
        </div>
      </div>
    </>
  );
}

function VendorHome({ s }: { s: State }) {
  const mine = s.jcs.filter((j) => j.vendor === VENDOR_SELF);
  const open = mine.filter((j) => j.state !== "Closed");
  const withYou = open.reduce((a, j) => a + Math.max(0, j.issued - j.pieces - j.scrap), 0);
  const stones = open.reduce((a, j) => a + (j.stI - j.stSet - j.stRet), 0);
  return (
    <>
      <Facts items={[
        { label: "Open job cards", value: String(open.length), note: `${plural(open.reduce((a, j) => a + j.qty, 0), "piece")} to make`, href: "/job-work" },
        { label: "Gold with you", value: g(withYou), note: "Fine gold not yet returned", href: "/job-work" },
        { label: "Stones with you", value: (stones / 100).toFixed(2) + " ct", note: "Issued, not set or returned", href: "/job-work" },
        { label: "Closed this season", value: String(mine.filter((j) => j.state === "Closed").length), note: "Reconciled by head office", href: "/job-work" },
      ]} />
      <div className={split}>
        <NeedsYou items={todos(s, "Vendor (portal)")} clear="Nothing is due from you." />
        <Card title="Your job cards">
          <Grid head={["Card", "Pieces", "Status"]} num={[1]} rows={mine.map((j) => [<Link key="i" href={"/job-work?jc=" + j.id} className="inline-flex min-h-10 items-center font-mono text-[12.5px] text-primary underline">{j.id}</Link>, j.qty, <Pill key="s">{j.state}</Pill>])} />
        </Card>
      </div>
    </>
  );
}

export default function Home() {
  const { s } = useStore();
  return (
    <>
      <PageHeader title="Today" sub={`${s.role === "Vendor (portal)" ? VENDOR_SELF : s.role}, ${dayLabel()}`} />
      {s.role === "Founder" && <FounderHome s={s} />}
      {s.role === "Production manager" && <ProductionHome s={s} />}
      {s.role === "Store manager" && <StoreHome s={s} />}
      {s.role === "Vendor (portal)" && <VendorHome s={s} />}
    </>
  );
}
