"use client";
// Per-browser preferences (table density, text size, notification choices). Kept in localStorage.
import { useSyncExternalStore } from "react";
import { USERS } from "./mock";
import type { Role } from "./data";

export interface Prefs { density: "comfortable" | "compact"; text: "normal" | "large"; notify: Record<string, boolean> }
export const DEFAULT: Prefs = { density: "comfortable", text: "normal", notify: { approvals: true, orders: true, stock: true, payments: false } };
const KEY = "akoirah:prefs";

let cache = DEFAULT;
let raw: string | null = null;
const subs = new Set<() => void>();

function read(): Prefs {
  try {
    const r = localStorage.getItem(KEY);
    if (r !== raw) {
      raw = r;
      const p = r ? JSON.parse(r) : {};
      cache = { ...DEFAULT, ...p, notify: { ...DEFAULT.notify, ...p.notify } };
    }
  } catch { /* storage blocked: keep defaults */ }
  return cache;
}

export function applyPrefs(p: Prefs) {
  document.documentElement.dataset.density = p.density;
  document.documentElement.dataset.text = p.text;
}

export function setPrefs(patch: Partial<Prefs>) {
  const next = { ...read(), ...patch };
  cache = next;
  try { raw = JSON.stringify(next); localStorage.setItem(KEY, raw); } catch { /* not saved */ }
  applyPrefs(next);
  subs.forEach((f) => f());
}

export const usePrefs = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, read, () => DEFAULT);

/** Who the demo says is signed in for a role. */
export function profileFor(role: Role, records: { kind: string; id: string; f: Record<string, string> }[] = []) {
  const u = USERS.find((x) => x.role === role);
  const base = u ? { name: u.name, email: u.email, phone: "+91 98200 00000" } : { name: "Shree Karigar Works", email: "vendor@akoirah.demo", phone: "+91 98200 00000" };
  const saved = records.find((x) => x.kind === "profile" && x.id === role);
  return saved ? { ...base, ...saved.f } : base;
}
