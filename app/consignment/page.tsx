"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { issueMemo, settleMemo } from "../lib/actions2";
import { inr } from "../lib/calc";
import { Btn, Card, Field, PageHeader, Tabs, inputCls } from "../components/ui";
import { FormCard, Grid, Kpis, Pill } from "../components/kit";
import { PARTNERS } from "../lib/mock";

type Tab = "memos" | "sent" | "received" | "stock" | "settle";

export default function Consignment() {
  const { s, act, say } = useStore();
  const [tab, setTab] = useState<Tab>("memos");
  const [party, setParty] = useState(PARTNERS[0]);
  const [picked, setPicked] = useState<string[]>([]);
  const stock = s.items.filter((i) => i.status === "InStock");
  const out = s.items.filter((i) => i.status === "OnConsignment");

  return (
    <>
      <PageHeader title="Consignment" sub="Sent stock stays on AKOIRAH's books at the partner. Received stock is held, never valued as own stock." />
      <Kpis items={[["Memos open", String(s.memos.filter((m) => m.state === "Out").length)], ["Pieces out at partners", String(out.length)], ["Value out", inr(out.reduce((a, i) => a + i.price, 0))], ["Held for others", String(s.memos.filter((m) => m.dir === "Received" && m.state === "Out").reduce((a, m) => a + m.tags.length, 0))]]} />
      <Tabs<Tab> tabs={[["memos", "All memos"], ["sent", "New memo, sent"], ["received", "New memo, received"], ["stock", "Partner stock"], ["settle", "Settlement"]]} value={tab} onChange={setTab} />

      {tab === "memos" && (
        <Grid head={["Memo", "Direction", "Party", "Pieces", "Status", ""]} num={[3]}
          rows={s.memos.map((m) => [<span key="i" className="font-mono text-[12.5px]">{m.id}</span>, m.dir, m.party, m.tags.length, <Pill key="s">{m.state}</Pill>,
            m.state === "Out" ? <span key="a" className="flex gap-1.5"><Btn sm gold onClick={() => act((d) => settleMemo(d, m.id, "Sold"))}>Sold</Btn><Btn sm onClick={() => act((d) => settleMemo(d, m.id, "Returned"))}>Returned</Btn></span> : ""])} />
      )}

      {tab === "sent" && (
        <div className="grid items-start gap-3.5 lg:grid-cols-2">
          <Card title="Memo builder, stock sent out">
            <Field label="Partner" htmlFor="party"><select id="party" className={inputCls} value={party} onChange={(e) => setParty(e.target.value)}>{PARTNERS.map((p) => <option key={p}>{p}</option>)}</select></Field>
            <p className="mb-1.5 text-[12.5px] font-semibold">Pieces in stock</p>
            <div className="mb-3 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
              {stock.map((i) => (
                <label key={i.tag} className="flex items-center gap-2.5">
                  <input type="checkbox" checked={picked.includes(i.tag)} onChange={(e) => setPicked(e.target.checked ? [...picked, i.tag] : picked.filter((t) => t !== i.tag))} className="size-4 accent-[var(--gold)]" />
                  <span className="font-mono text-[12.5px]">{i.tag}</span><span className="text-muted-foreground">{i.loc}</span>
                </label>
              ))}
            </div>
            <Btn gold disabled={!picked.length} onClick={() => { act((d) => issueMemo(d, party, picked)); setPicked([]); setTab("memos"); }}>Issue memo for {picked.length} piece(s)</Btn>
          </Card>
          <Card title="What happens"><p className="text-muted-foreground">Issued pieces move to the partner location with the status On consignment. They are no longer offered to online orders. When the partner sells, an invoice and settlement follow. Unsold pieces come back through QC.</p></Card>
        </div>
      )}

      {tab === "received" && (
        <FormCard className="max-w-[560px]" title="Memo for stock received" cta="Record receipt" fields={[
          { id: "from", label: "Received from", value: "Studio Rhea (designer)" },
          { id: "n", label: "Pieces", type: "number", value: "2" },
          { id: "note", label: "Terms", type: "textarea", value: "Sold pieces are bought at the agreed price. Unsold pieces go back." },
        ]} onSubmit={(v) => say(`${v.n} pieces received from ${v.from}, held in a separate location (prototype)`)} />
      )}

      {tab === "stock" && (
        <Grid head={["Piece", "Partner memo", "Location", "Value"]} num={[3]}
          rows={out.map((i) => [<span key="t" className="font-mono text-[12.5px]">{i.tag}</span>, i.memo ?? "-", i.loc, inr(i.price)])} />
      )}

      {tab === "settle" && (
        <Grid head={["Memo", "Party", "Direction", "Outcome"]}
          rows={s.memos.filter((m) => m.state !== "Out").map((m) => [m.id, m.party, m.dir, <Pill key="s">{m.state === "Sold" ? (m.dir === "Sent" ? "Sold, invoice raised" : "Sold, payable raised") : "Returned"}</Pill>])} />
      )}
      {tab === "settle" && !s.memos.some((m) => m.state !== "Out") && <p className="mt-2 text-muted-foreground">Nothing settled yet. Mark a memo as sold or returned under All memos.</p>}
    </>
  );
}
