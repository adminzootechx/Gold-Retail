"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "../lib/store";
import { receiveItem, transferItem } from "../lib/actions2";
import { g, inr } from "../lib/calc";
import { Btn, Card, Field, PageHeader, StatusBadge, STATUS_LABEL, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";
import type { Status } from "../lib/data";

const STATUSES: Status[] = ["InStock", "Reserved", "InTransit", "OnConsignment", "Sold", "InRepair", "AtHallmark"];
const sel = "h-9 rounded-lg border border-border bg-card px-2";
type Tab = "register" | "locations" | "transfers" | "audit" | "ageing";
const days = (tag: string) => 5 + ([...tag].reduce((a, c) => a + c.charCodeAt(0), 0) % 140); // sample: days since tagging

export default function Inventory() {
  const { s, act } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("register");
  const [status, setStatus] = useState("");
  const [loc, setLoc] = useState("");
  const [auditLoc, setAuditLoc] = useState("HO Vault");
  const [scan, setScan] = useState("");
  const [audit, setAudit] = useState<{ found: string[]; missing: string[]; extra: string[] } | null>(null);
  const locs = [...new Set(s.items.map((i) => i.loc))];
  const rows = s.items.filter((i) => (!status || i.status === status) && (!loc || i.loc === loc));
  const live = s.items.filter((i) => i.status !== "Sold");

  const runAudit = () => {
    const expected = s.items.filter((i) => i.loc === auditLoc && i.status === "InStock").map((i) => i.tag);
    const scanned = scan.split(/[\s,]+/).map((t) => t.trim().toUpperCase()).filter(Boolean);
    setAudit({ found: expected.filter((t) => scanned.includes(t)), missing: expected.filter((t) => !scanned.includes(t)), extra: scanned.filter((t) => !expected.includes(t)) });
  };

  const buckets: [string, (d: number) => boolean][] = [["0-30 days", (d) => d <= 30], ["31-60 days", (d) => d > 30 && d <= 60], ["61-90 days", (d) => d > 60 && d <= 90], ["Over 90 days", (d) => d > 90]];
  const stock = s.items.filter((i) => i.status === "InStock");

  return (
    <>
      <PageHeader title="Inventory" sub="Every piece, every location. Select a row to trace it.">
        {tab === "register" && (
          <>
            <select aria-label="Status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {STATUSES.map((k) => <option key={k} value={k}>{STATUS_LABEL(k)}</option>)}
            </select>
            <select aria-label="Location" className={sel} value={loc} onChange={(e) => setLoc(e.target.value)}>
              <option value="">All locations</option>
              {locs.map((l) => <option key={l}>{l}</option>)}
            </select>
          </>
        )}
      </PageHeader>
      <Tabs<Tab> tabs={[["register", "Item register"], ["locations", "Stock by location"], ["transfers", "Transfers"], ["audit", "Stock audit"], ["ageing", "Ageing"]]} value={tab} onChange={setTab} />

      {tab === "register" && (
        <Grid head={["Tag", "Piece", "Variant", "Net metal", "HUID", "Certificate", "Location", "Status", "Price"]} num={[3, 8]}
          onRow={(i) => router.push("/trace?tag=" + rows[i].tag)}
          rows={rows.map((i) => [<span key="t" className="font-mono text-[12.5px]">{i.tag}</span>, i.name, i.variant, g(i.net), <span key="h" className="font-mono text-[12.5px]">{i.huid}</span>, i.cert, i.loc, <StatusBadge key="s" status={i.status} />, inr(i.price)])} />
      )}

      {tab === "locations" && (
        <>
          <Kpis items={[["Pieces on the books", String(live.length)], ["Stock value", inr(live.reduce((a, i) => a + i.price, 0))], ["In transit", String(s.items.filter((i) => i.status === "InTransit").length)], ["Locations", String(locs.length)]]} />
          <Grid head={["Location", "In stock", "Reserved", "Other", "Value"]} num={[1, 2, 3, 4]}
            rows={locs.filter((l) => l !== "Customer").map((l) => {
              const here = s.items.filter((i) => i.loc === l);
              return [l, here.filter((i) => i.status === "InStock").length, here.filter((i) => i.status === "Reserved").length, here.filter((i) => !["InStock", "Reserved"].includes(i.status)).length, inr(here.reduce((a, i) => a + i.price, 0))];
            })} />
        </>
      )}

      {tab === "transfers" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_1.4fr]">
          <FormCard title="New transfer" cta="Send" fields={[
            { id: "tag", label: "Piece", type: "select", options: stock.map((i) => i.tag) },
            { id: "to", label: "Send to", type: "select", options: ["HO Vault", "Mumbai Flagship", "Delhi Store"] },
          ]} onSubmit={(v) => act((d) => transferItem(d, v.tag, v.to))} />
          <div>
            <h3 className="mb-2 text-lg font-semibold">In transit</h3>
            <Grid head={["Piece", "Route", "Status", ""]}
              rows={s.items.filter((i) => i.status === "InTransit").map((i) => [<span key="t" className="font-mono text-[12.5px]">{i.tag}</span>, i.loc, <Pill key="s">In transit</Pill>, <Btn key="b" sm gold onClick={() => act((d) => receiveItem(d, i.tag))}>Receive</Btn>])} />
            <p className="mt-2 text-[12.5px] text-muted-foreground">Pieces in transit cannot be sold or allocated until they are received.</p>
          </div>
        </div>
      )}

      {tab === "audit" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <Card title="Scan and compare">
            <Field label="Location" htmlFor="al"><select id="al" className={inputCls} value={auditLoc} onChange={(e) => { setAuditLoc(e.target.value); setAudit(null); }}>{["HO Vault", "Mumbai Flagship", "Delhi Store"].map((l) => <option key={l}>{l}</option>)}</select></Field>
            <Field label="Scanned tags, one per line" htmlFor="sc"><textarea id="sc" value={scan} onChange={(e) => setScan(e.target.value)} className="min-h-28 rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-[12.5px]" placeholder={"AK-RNG-014-0001\nAK-RNG-014-0002"} /></Field>
            <Btn gold onClick={runAudit}>Run audit</Btn>
          </Card>
          <Card title="Result">
            {!audit ? <p className="text-muted-foreground">Scan the tags at the location, then run the audit. The books are compared with what was scanned.</p> : (
              <div className="flex flex-col gap-2.5">
                <div><Pill>{`Found ${audit.found.length}`}</Pill> <span className="text-muted-foreground">{audit.found.join(", ") || "none"}</span></div>
                <div><Pill>{`Missing ${audit.missing.length}`}</Pill> <span className="text-muted-foreground">{audit.missing.join(", ") || "none"}</span></div>
                <div><Pill>{`New ${audit.extra.length}`}</Pill> <span className="text-muted-foreground">{audit.extra.join(", ") || "none"}</span></div>
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === "ageing" && (
        <>
          <Grid head={["Age", "Pieces", "Value"]} num={[1, 2]}
            rows={buckets.map(([l, f]) => { const x = stock.filter((i) => f(days(i.tag))); return [l, x.length, inr(x.reduce((a, i) => a + i.price, 0))]; })} />
          <h3 className="mb-2 mt-5 text-lg font-semibold">Dead stock, over 90 days</h3>
          <Grid head={["Tag", "Piece", "Location", "Days", "Value"]} num={[3, 4]}
            rows={stock.filter((i) => days(i.tag) > 90).map((i) => [i.tag, i.name, i.loc, days(i.tag), inr(i.price)])} />
        </>
      )}
    </>
  );
}
