"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStore } from "../lib/store";
import { ALL_MODS, ROLES, allowed } from "../lib/modules";
import { Btn, Field, PageHeader, Tabs, inputCls } from "../components/ui";
import { Grid, Pill } from "../components/kit";
import { USERS } from "../lib/mock";
import { saveRules } from "../lib/actions3";
import { decide } from "../lib/actions";
import { inr } from "../lib/calc";
import { Badge } from "../components/ui";
import { ofKind } from "../lib/records";
import type { Role } from "../lib/data";

type Tab = "approvals" | "users" | "permissions" | "rules" | "audit";

function Security() {
  const { s, act } = useStore();
  const asked = useSearchParams().get("tab") as Tab | null;
  const rules = ofKind(s.records, "rule");
  const all: [Tab, string][] = [["approvals", "Pending approvals"], ["users", "Users"], ["permissions", "Permission grid"], ["rules", "Approval rules"], ["audit", "Audit log"]];
  // The founder runs the whole matrix. Others decide requests, and the production manager also reads the audit log.
  const tabs = s.role === "Founder" ? all : all.filter((t) => t[0] === "approvals" || (t[0] === "audit" && s.role === "Production manager"));
  const [picked, setTab] = useState<Tab | null>(null);
  const want = picked ?? asked;
  const tab: Tab = tabs.some((t) => t[0] === want) ? want! : "approvals";
  const [who, setWho] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const limitOf = (id: string, saved: string) => edits[id] ?? saved;
  const roles = Object.keys(ROLES) as Role[];
  const mods = ALL_MODS;
  const users = [...new Set(s.log.map((l) => l.u))];

  return (
    <>
      <PageHeader title="Security & Approval Matrix" sub="Who can open what, what needs approval, and who decided." />
      <Tabs<Tab> tabs={tabs} value={tab} onChange={setTab} />

      {tab === "approvals" && (
        <Grid head={["Request", "Type", "Reference", "Raised by", "Detail", "Value", "Decision"]} num={[5]}
          rows={s.approvals.map((a) => [<span key="i" className="font-mono text-[12.5px]">{a.id}</span>, a.type, a.ref, a.by, a.detail, a.value ? inr(a.value) : "-",
            a.state !== "pending" ? <Badge key="d" kind={a.state === "approved" ? "ok" : "bad"}>{a.state === "approved" ? "Approved" : "Rejected"}</Badge>
            : a.by === s.role ? <span key="d" className="text-muted-foreground">Your own request</span>
            : <span key="d" className="flex gap-1.5"><Btn gold sm onClick={() => act((d) => decide(d, a.id, "approved"))}>Approve</Btn><Btn sm onClick={() => act((d) => decide(d, a.id, "rejected"))}>Reject</Btn></span>])} />
      )}

      {tab === "users" && <Grid head={["Name", "Email", "Role", "Status"]} rows={USERS.map((u) => [u.name, u.email, u.role, <Pill key="s">{u.state}</Pill>])} />}

      {tab === "permissions" && (
        <Grid head={["Screen", ...roles]} rows={mods.map(([href, label]) => [label, ...roles.map((r) => (allowed(r, href) ? <span key={r} className="font-bold text-success">Yes</span> : <span key={r} className="text-muted-foreground">-</span>))])} />
      )}

      {tab === "rules" && (
        <>
          <Grid head={["Approval", "Rule", "Limit", "Approver"]}
            rows={rules.map((r) => [r.f.name, r.f.rule, r.f.limit ? <input key={r.id} aria-label={r.f.name + " limit"} value={limitOf(r.id, r.f.limit)} onChange={(e) => setEdits({ ...edits, [r.id]: e.target.value })} className="h-8 w-28 rounded-md border border-border bg-background px-2" /> : "-", r.f.approver])} />
          <div className="mt-3"><Btn gold onClick={() => { act((d) => saveRules(d, edits)); setEdits({}); }}>Save rules</Btn></div>
          <p className="mt-2 text-[12.5px] text-muted-foreground">Limits are placeholders until AKOIRAH confirms its own. An edit to an approved value reopens approval, and nobody approves their own request.</p>
        </>
      )}

      {tab === "audit" && (
        <>
          <div className="mb-3.5 max-w-xs"><Field label="User" htmlFor="who"><select id="who" className={inputCls} value={who} onChange={(e) => setWho(e.target.value)}><option value="">Everyone</option>{users.map((u) => <option key={u}>{u}</option>)}</select></Field></div>
          <Grid head={["When", "Who", "What"]} rows={s.log.filter((l) => !who || l.u === who).map((l) => [l.t, l.u, l.text])} />
        </>
      )}
    </>
  );
}

export default function SecurityPage() {
  return <Suspense fallback={null}><Security /></Suspense>;
}
