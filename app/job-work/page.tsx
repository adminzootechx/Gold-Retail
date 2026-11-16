"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "../lib/store";
import { ct, g, inr } from "../lib/calc";
import { Badge, Btn, Card, Field, PageHeader, Table, Tabs, Tr, inputCls } from "../components/ui";
import { FormCard, Grid, Pill } from "../components/kit";
import { VENDORS } from "../lib/mock";
import { issueSlip, returnSlip } from "../lib/actions3";
import { ofKind } from "../lib/records";
import { NewJobCard } from "../components/Create";
import { useDetail } from "../lib/detail";

type Tab = "cards" | "vendors" | "issue" | "return" | "account" | "invoices";

function JobWork() {
  const { s, act } = useStore();
  const isVendor = s.role.startsWith("Vendor");
  const [tab, setTab] = useState<Tab>("cards");
  const asked = useSearchParams().get("jc");
  const { open: openDetail } = useDetail();
  // A link or a new card names the card to show: it opens in the side panel.
  useEffect(() => { if (asked) openDetail({ kind: "jobcard", id: asked }); }, [asked, openDetail]);
  const [creating, setCreating] = useState(false);
  const [rj, setRj] = useState("");
  const [acct, setAcct] = useState("Shree Karigar Works");
  const list = isVendor ? s.jcs.filter((j) => j.vendor === "Shree Karigar Works") : s.jcs;
  const vendors = isVendor ? VENDORS.filter((v) => v.name === "Shree Karigar Works") : VENDORS;
  const tabs: [Tab, string][] = [["cards", "Job cards"], ["vendors", "Vendors"], ["issue", "Material issue"], ["return", "Return receipt"], ["account", "Vendor account"], ["invoices", "Job-work invoices"]];

  const acctRows = s.jcs.filter((x) => x.vendor === acct);
  const bal = acctRows.reduce((a, x) => a + (x.state === "Closed" ? 0 : x.issued - x.pieces - x.scrap), 0);

  return (
    <>
      <PageHeader title="Vendor Job Work" sub="Gold and stones per job card, to the milligram.">
        {!isVendor && <Btn gold onClick={() => setCreating(true)}>New job card</Btn>}
      </PageHeader>
      <NewJobCard open={creating} onClose={() => setCreating(false)} />
      <Tabs<Tab> tabs={isVendor ? tabs.filter((t) => t[0] === "cards" || t[0] === "account") : tabs} value={tab} onChange={setTab} />

      {tab === "cards" && (
        <>
          <Table head={["Job card", "Vendor", "SKU", "Qty", "Status"]} num={[3]}>
            {list.map((x) => (
              <Tr key={x.id} onClick={() => openDetail({ kind: "jobcard", id: x.id })} num={[3]}
                cells={[<span key="i" className="font-mono text-[12.5px]">{x.id}</span>, x.vendor, x.sku, x.qty, <Badge key="s" kind={x.state === "Closed" ? "ok" : x.state === "At vendor" ? "info" : "warn"}>{x.state}</Badge>]} />
            ))}
          </Table>
          <p className="mt-3 text-muted-foreground">Click a job card to open its details and {isVendor ? "see where it stands" : "change its status"}.</p>
        </>
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
          ]} onSubmit={(v) => act((d) => issueSlip(d, v.jc, +v.gold, +v.stones))} />
          <p className="text-muted-foreground">Gold is issued in fine gold from a metal lot. Stones go by certificate for singles and by weight for melee. Both show on the vendor&apos;s account at once.</p>
          <div className="lg:col-span-2"><Grid head={["Slip", "Date", "Job card", "Vendor", "Fine gold", "Stones", "Metal lot", "By"]} num={[4, 5]}
            rows={ofKind(s.records, "slip").map((x) => [x.id, x.date, x.f.jc, x.f.vendor, g(+x.f.gold), ct(+x.f.stones), x.f.lot, x.by])} /></div>
        </div>
      )}

      {tab === "return" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          {(() => {
            // The form starts from a balanced return for the card, so the usual case is one click. Change any figure to record a real difference.
            const open = s.jcs.filter((x) => x.state !== "Closed");
            const rc = open.find((x) => x.id === rj) ?? open[0];
            const left = rc ? Math.max(0, rc.issued - rc.pieces - rc.scrap) : 0;
            const scrapD = rc ? Math.round(left * 0.03) : 0;
            const goldD = rc ? Math.round(left * 0.97) - Math.round(rc.issued * 0.005) : 0;
            const stLeft = rc ? Math.max(0, rc.stI - rc.stSet - rc.stRet) : 0;
            const retD = Math.round(stLeft * 0.03);
            return (
              <Card title="Return receipt">
                <form key={rc?.id + ":" + (rc?.pieces ?? 0)} onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  act((d) => returnSlip(d, rc.id, +String(f.get("n")), Math.round(+String(f.get("gold")) * 1000), Math.round(+String(f.get("scrap")) * 1000), +String(f.get("set")), +String(f.get("ret"))));
                }}>
                  <Field label="Job card" htmlFor="rjc"><select id="rjc" value={rc?.id ?? ""} onChange={(e) => setRj(e.target.value)} className={inputCls}>{open.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.vendor} · {g(x.issued)} issued</option>)}</select></Field>
                  <Field label="Pieces received" htmlFor="rn"><input id="rn" name="n" type="number" min={1} defaultValue={rc?.qty ?? 1} className={inputCls} /></Field>
                  <Field label="Fine gold in the pieces, in grams" htmlFor="rgold"><input id="rgold" name="gold" type="number" min={0} step="0.001" defaultValue={(goldD / 1000).toFixed(3)} className={inputCls} /></Field>
                  <Field label="Scrap and dust, fine gold in grams" htmlFor="rscrap"><input id="rscrap" name="scrap" type="number" min={0} step="0.001" defaultValue={(scrapD / 1000).toFixed(3)} className={inputCls} /></Field>
                  <Field label="Stones set, in points" htmlFor="rset"><input id="rset" name="set" type="number" min={0} defaultValue={stLeft - retD} className={inputCls} /></Field>
                  <Field label="Stones returned, in points" htmlFor="rret"><input id="rret" name="ret" type="number" min={0} defaultValue={retD} className={inputCls} /></Field>
                  <Btn gold type="submit" disabled={!rc}>Record return</Btn>
                </form>
              </Card>
            );
          })()}
          <p className="text-muted-foreground">The card reconciles gold issued against the gold in the pieces plus scrap, within the 1.5% allowance, and stones issued against stones set plus returned. Returned pieces then go to Head Office Inward. The card closes once it balances.</p>
          <div className="lg:col-span-2"><Grid head={["Return", "Date", "Job card", "Vendor", "Pieces", "Gold in pieces", "Scrap", "By"]} num={[4, 5, 6]}
            rows={ofKind(s.records, "ret").map((x) => [x.id, x.date, x.f.jc, x.f.vendor, x.f.pieces, g(+x.f.gold || 0), g(+x.f.scrap), x.by])} /></div>
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
