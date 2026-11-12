"use client";
import { useState } from "react";
import { useStore } from "../lib/store";
import { MODS, ROLES, allowed } from "../lib/modules";
import { Btn, Field, PageHeader, Tabs, inputCls } from "../components/ui";
import { Grid, Pill } from "../components/kit";
import { APPROVAL_RULES, USERS } from "../lib/mock";
import type { Role } from "../lib/data";

type Tab = "users" | "permissions" | "rules" | "audit";

export default function Security() {
  const { s, say } = useStore();
  const [tab, setTab] = useState<Tab>("users");
  const [who, setWho] = useState("");
  const [limits, setLimits] = useState<Record<string, string>>(Object.fromEntries(APPROVAL_RULES.map((r) => [r.id, r.limit])));
  const roles = Object.keys(ROLES) as Role[];
  const mods = MODS.flatMap(([, m]) => m);
  const users = [...new Set(s.log.map((l) => l.u))];

  return (
    <>
      <PageHeader title="Users and access" sub="Who can open which screens, and which actions wait for approval." />
      <Tabs<Tab> tabs={[["users", "Users"], ["permissions", "Permission grid"], ["rules", "Approval rules"], ["audit", "Audit log"]]} value={tab} onChange={setTab} />

      {tab === "users" && <Grid head={["Name", "Email", "Role", "Status"]} rows={USERS.map((u) => [u.name, u.email, u.role, <Pill key="s">{u.state}</Pill>])} />}

      {tab === "permissions" && (
        <Grid head={["Screen", ...roles]} rows={mods.map(([href, label]) => [label, ...roles.map((r) => (allowed(r, href) ? <span key={r} className="font-bold text-success">Yes</span> : <span key={r} className="text-muted-foreground">-</span>))])} />
      )}

      {tab === "rules" && (
        <>
          <Grid head={["Approval", "Rule", "Limit", "Approver"]}
            rows={APPROVAL_RULES.map((r) => [r.name, r.rule, r.limit ? <input key={r.id} aria-label={r.name + " limit"} value={limits[r.id]} onChange={(e) => setLimits({ ...limits, [r.id]: e.target.value })} className="h-8 w-28 rounded-md border border-border bg-background px-2" /> : "-", r.approver])} />
          <div className="mt-3"><Btn gold onClick={() => say("Approval rules saved (prototype, not stored)")}>Save rules</Btn></div>
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
