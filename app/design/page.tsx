"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import Link from "../components/Go";
import { DESIGN_STAGES, advanceDesign } from "../lib/actions";
import { NewSku } from "../components/Create";
import { addDesign } from "../lib/actions2";
import { Badge, Btn, Card, PageHeader, Rec, Tabs } from "../components/ui";
import { FormCard, Grid, Pill } from "../components/kit";
import FilesCard from "../components/FilesCard";
import type { Design } from "../lib/data";

const COLS = DESIGN_STAGES;
const LABEL = ["Start CAD", "Send for internal review", "Pass internal review", "Approve CAD, send to RPT", "Receive prototype", "Approve prototype, lock final CAD"];
type Tab = "board" | "cad" | "rpt" | "new";

export default function DesignPage() {
  const { s, act } = useStore();
  const [tab, setTab] = useState<Tab>("board");
  const [sel, setSel] = useState("D-118");
  const [sku, setSku] = useState<string | null>(null);
  const d0 = s.designs.find((d) => d.id === sel) ?? s.designs[0];
  const action = (d: Design) =>
    d.stage === 7 ? <span className="flex flex-wrap items-center gap-2"><Badge kind="ok">SKU live</Badge><Link href="/planning" className="font-semibold text-primary hover:underline">Plan production</Link></span>
    : d.stage === 6 ? <Btn gold sm onClick={() => setSku(d.id)}>Create SKU</Btn>
    : d.lockPending ? <Badge kind="warn">Awaiting approval</Badge>
    : <Btn gold sm onClick={() => act((x) => advanceDesign(x, d.id))}>{LABEL[d.stage]}</Btn>;

  return (
    <>
      <PageHeader title="Product Development" sub="Design origin to CAD, RPT, final CAD lock and SKU." />
      <NewSku open={!!sku} onClose={() => setSku(null)} design={sku ?? ""} />
      <Tabs<Tab> tabs={[["board", "Design board"], ["cad", "CAD versions"], ["rpt", "RPT tracker"], ["new", "New design request"]]} value={tab} onChange={setTab} />

      {tab === "board" && (
        <>
          <div className="grid grid-cols-[repeat(8,minmax(200px,1fr))] gap-3 overflow-x-auto pb-2">
            {COLS.map((c, i) => {
              const list = s.designs.filter((d) => d.stage === i);
              return (
                <section key={c} className="min-h-[160px] rounded-[var(--radius)] bg-muted p-2.5">
                  <h4 className="mb-2 flex justify-between text-xs font-semibold tracking-wide text-muted-foreground"><span>{c}</span><span>{list.length}</span></h4>
                  {list.map((d) => (
                    <div key={d.id} className={"mb-2 rounded-[10px] border bg-card px-3 py-2.5 " + (d.id === d0.id ? "border-gold" : "border-border")}>
                      <button className="block text-left text-[13px] font-bold hover:underline" onClick={() => setSel(d.id)}>{d.name}</button>
                      <small className="mb-2 block text-muted-foreground">{d.id} · {d.origin} · {d.owner}</small>
                      {action(d)}
                    </div>
                  ))}
                </section>
              );
            })}
          </div>
          <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
            <Card title={`Design detail, ${d0.id}`}>
              <Rec rows={[["Name", d0.name], ["Origin", d0.origin], ["Owner", d0.owner], ["Stage", COLS[d0.stage]], ["Requested", "04 Nov"], ["Target SKU", d0.stage === 7 ? "Created" : d0.stage === 6 ? "Ready to create" : "After final CAD lock"]]} />
            </Card>
            <FilesCard key={d0.id} folder={`designs/${d0.id}`} title={`CAD files and references, ${d0.id}`} />
            <Card title="References and history">
              <ul className="flex list-disc flex-col gap-1.5 pl-[18px] text-muted-foreground">
                <li>Reference images: 3 uploaded (sample)</li>
                <li>Sketch received from {d0.origin.toLowerCase()}</li>
                <li>CAD v1 shared for review, comments logged under CAD versions</li>
                <li>Locking the final CAD freezes all files for this design</li>
              </ul>
            </Card>
          </div>
        </>
      )}

      {tab === "cad" && (
        <Grid head={["Design", "Version", "File", "Reviewer", "Comment", "Status"]} rows={[
          ["D-118", "v3", "halo_v3.3dm", "Meera Kapoor", "Reduce halo thickness by 0.2 mm", <Pill key="a">In progress</Pill>],
          ["D-118", "v2", "halo_v2.3dm", "Meera Kapoor", "Prong spacing too tight", <Pill key="b">Rejected</Pill>],
          ["D-122", "v1", "arc_v1.3dm", "Aarav Shah", "Check bail strength for rose gold", <Pill key="c">Pending</Pill>],
          ["D-121", "v1", "lotus_v1.3dm", "Meera Kapoor", "Approved for RPT", <Pill key="d">Approved</Pill>],
        ]} />
      )}

      {tab === "rpt" && (
        <Grid head={["Design", "Name", "Prototype", "Stage", "Status"]}
          rows={s.designs.filter((d) => d.stage >= 4).map((d) => [d.id, d.name, d.stage === 4 ? "In production" : "Received", COLS[d.stage], <Pill key="s">{d.stage === 4 ? "In progress" : d.stage === 5 ? "Awaiting approval" : "Approved"}</Pill>])} />
      )}

      {tab === "new" && (
        <FormCard className="max-w-[560px]" title="New design request" cta="Create request" cols={1}
          fields={[
            { id: "name", label: "Design name", placeholder: "Leaf pendant" },
            { id: "origin", label: "Design origin", type: "select", options: ["Founder", "Client", "Social media", "Design team"] },
            { id: "brief", label: "Brief", type: "textarea", placeholder: "What should this piece feel like?" },
          ]}
          onSubmit={(v) => { act((d) => addDesign(d, v.name, v.origin)); setTab("board"); }} />
      )}
    </>
  );
}
