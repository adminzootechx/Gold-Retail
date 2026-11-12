"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "../lib/store";
import { closeJobCard, requestVariance } from "../lib/actions";
import { ct, g, inr, jcBalanced, jcCalc } from "../lib/calc";
import { Badge, Btn, Card, Field, PageHeader, Rec, Table, Tabs, Tr, inputCls } from "../components/ui";
import { FormCard, Grid, Pill } from "../components/kit";
import { VENDORS } from "../lib/mock";

type Tab = "cards" | "vendors" | "issue" | "return" | "account" | "invoices";

function JobWork() {
  const { s, act, say } = useStore();
  const isVendor = s.role.startsWith("Vendor");
  const [tab, setTab] = useState<Tab>("cards");
  const [sel, setSel] = useState(useSearchParams().get("jc") ?? "JC-2409");
  const [acct, setAcct] = useState("Shree Karigar Works");
  const list = isVendor ? s.jcs.filter((j) => j.vendor === "Shree Karigar Works") : s.jcs;
  const j = list.find((x) => x.id === sel) ?? list[0];
  const c = jcCalc(j);
  const requested = s.approvals.some((a) => a.type === "Metal variance" && a.ref === j.id);
  const canClose = j.state === "Received" && (jcBalanced(j) || j.approved);
  const vendors = isVendor ? VENDORS.filter((v) => v.name === "Shree Karigar Works") : VENDORS;
  const tabs: [Tab, string][] = [["cards", "Job cards"], ["vendors", "Vendors"], ["issue", "Material issue"], ["return", "Return receipt"], ["account", "Vendor account"], ["invoices", "Job-work invoices"]];

  const acctRows = s.jcs.filter((x) => x.vendor === acct);
  const bal = acctRows.reduce((a, x) => a + (x.state === "Closed" ? 0 : x.issued - x.pieces - x.scrap), 0);

  return (
    <>
      <PageHeader title="Vendor job work" sub="Metal and stone accounts per job card, reconciled in fine gold to the milligram." />
      <Tabs<Tab> tabs={isVendor ? tabs.filter((t) => t[0] === "cards" || t[0] === "account") : tabs} value={tab} onChange={setTab} />

      {tab === "cards" && (
        <div className="grid items-start gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Table head={["Job card", "Vendor", "SKU", "Qty", "Status"]} num={[3]}>
            {list.map((x) => (
              <Tr key={x.id} selected={x.id === j.id} onClick={() => setSel(x.id)} num={[3]}
                cells={[<span key="i" className="font-mono text-[12.5px]">{x.id}</span>, x.vendor, x.sku, x.qty, <Badge key="s" kind={x.state === "Closed" ? "ok" : x.state === "At vendor" ? "info" : "warn"}>{x.state}</Badge>]} />
            ))}
          </Table>
          <Card>
            <div className="mb-2.5 flex items-center justify-between"><h3 className="text-lg font-semibold">{j.id}</h3><span className="text-muted-foreground">{j.vendor}</span></div>
            {j.state === "At vendor" ? (
              <>
                <p className="mb-2 text-muted-foreground">Material is with the vendor. Reconciliation starts when pieces and scrap are received.</p>
                <Rec rows={[["Fine gold issued", g(j.issued)], ["Stones issued", ct(j.stI)]]} />
              </>
            ) : (
              <>
                <h3 className="mb-1.5 font-semibold">Gold, in fine gold</h3>
                <Rec rows={[[`Issued from ${j.lot}`, g(j.issued)], ["In finished pieces", g(j.pieces)], ["Scrap and dust returned", g(j.scrap)], ["Variance", g(c.variance)], ["Allowed wastage (1.5%)", g(c.allowed)], ["Unreconciled", g(c.unrec), true]]} />
                <h3 className="mb-1.5 mt-3.5 font-semibold">Stones</h3>
                <Rec rows={[["Issued", ct(j.stI)], ["Set in pieces", ct(j.stSet)], ["Returned", ct(j.stRet)], ["Difference", ct(c.stDiff), true]]} />
                <div className="mt-3.5 flex flex-wrap items-center gap-2">
                  {j.state === "Closed" ? <Badge kind="ok">Closed</Badge> : canClose ? (
                    <>
                      <Btn gold onClick={() => act((d) => closeJobCard(d, j.id))}>Close job card</Btn>
                      {j.approved && <Badge kind="ok">Variance approved</Badge>}
                    </>
                  ) : (
                    <>
                      <Btn gold disabled={requested} onClick={() => act((d) => requestVariance(d, j.id))}>{requested ? "Approval requested" : "Request variance approval"}</Btn>
                      <span className="text-muted-foreground">Cannot close until balances reconcile or the variance is approved.</span>
                    </>
                  )}
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {tab === "vendors" && (
        <Grid head={["Vendor", "City", "Work", "On time", "Wastage", "Open cards", "Rating"]} num={[3, 4, 5]}
          rows={vendors.map((v) => [v.name, v.city, v.work, v.onTime + "%", v.wastage + "%", s.jcs.filter((x) => x.vendor === v.name && x.state !== "Closed").length, <Pill key="r">{v.rating === "A" ? "Active, A" : "Active, B"}</Pill>])} />
      )}

      {tab === "issue" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <FormCard title="Material issue slip" cta="Issue material" fields={[
            { id: "jc", label: "Job card", type: "select", options: s.jcs.filter((x) => x.state === "At vendor").map((x) => x.id) },
            { id: "gold", label: "Fine gold (mg)", type: "number", value: "28400" },
            { id: "stones", label: "Stones (carat points)", type: "number", value: "80" },
          ]} onSubmit={(v) => say(`Slip created for ${v.jc}: ${g(+v.gold)}, ${ct(+v.stones)} (prototype)`)} />
          <Card title="Issue rules">
            <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-muted-foreground">
              <li>Gold is issued in fine gold, from a reserved metal lot.</li>
              <li>Stones are issued by certificate for singles, by weight and pieces for melee.</li>
              <li>Both appear on the vendor&apos;s account straight away.</li>
            </ul>
          </Card>
        </div>
      )}

      {tab === "return" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <FormCard title="Return receipt" cta="Record return" fields={[
            { id: "jc", label: "Job card", type: "select", options: s.jcs.map((x) => x.id) },
            { id: "pieces", label: "Pieces received", type: "number", value: "6" },
            { id: "scrap", label: "Scrap and dust (mg fine)", type: "number", value: "2480" },
          ]} onSubmit={(v) => say(`Return recorded for ${v.jc}: ${v.pieces} pieces, ${g(+v.scrap)} scrap (prototype)`)} />
          <Card title="After a return"><p className="text-muted-foreground">Pieces go to HO inward for stone matching, QC, hallmark and tagging. The job card closes once the reconciliation balances.</p></Card>
        </div>
      )}

      {tab === "account" && (
        <>
          {!isVendor && (
            <div className="mb-3.5 max-w-xs"><Field label="Vendor" htmlFor="acct"><select id="acct" className={inputCls} value={acct} onChange={(e) => setAcct(e.target.value)}>{VENDORS.map((v) => <option key={v.name}>{v.name}</option>)}</select></Field></div>
          )}
          <Grid head={["Job card", "Gold issued", "In pieces", "Scrap returned", "Stones issued", "Open balance"]} num={[1, 2, 3, 4, 5]}
            rows={[...acctRows.map((x) => [x.id, g(x.issued), g(x.pieces), g(x.scrap), ct(x.stI), g(x.state === "Closed" ? 0 : x.issued - x.pieces - x.scrap)]),
              [<b key="t">Total with vendor</b>, "", "", "", "", <b key="b">{g(bal)}</b>]]} />
        </>
      )}

      {tab === "invoices" && (
        <Grid head={["Invoice", "Vendor", "Job card", "Making charges", "Status"]} num={[3]}
          rows={s.jcs.filter((x) => x.state !== "At vendor").map((x, i) => [`VJ-${810 + i}`, x.vendor, x.id, inr(x.qty * 3500), <Pill key="s">{x.state === "Closed" ? "Paid" : "Pending"}</Pill>])} />
      )}
    </>
  );
}

export default function JobWorkPage() {
  return <Suspense fallback={null}><JobWork /></Suspense>;
}
