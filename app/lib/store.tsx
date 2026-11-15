"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { seed, type Role, type State, type Stored } from "./data";
import { setRate } from "./calc";
import { currentRate } from "./records";

export type Sync = "loading" | "saved" | "saving" | "offline";

interface Store {
  s: State;
  ready: boolean;
  /** Edit a draft copy of the state. Return a string to show it as a message. The change is saved to the database. */
  act: (fn: (d: State) => string | void, opts?: { undoable?: boolean }) => void;
  toast: string;
  /** Set while the last undoable change can still be taken back. */
  undo: (() => void) | null;
  /** Show a message without changing any data. */
  say: (m: string) => void;
  signIn: (role: Role) => void;
  signOut: () => void;
  setRole: (role: Role) => void;
  sync: Sync;
  /** Which database is behind the screens: Neon, the embedded local one, or none (browser memory only). */
  dbKind: "neon" | "local" | "none";
  /** Put the sample data back, everywhere. */
  reset: () => Promise<void>;
}

const Ctx = createContext<Store | null>(null);
const KEY = "akoirah:role";
const toStored = ({ authed: _a, role: _r, ...rest }: State): Stored => rest; // eslint-disable-line @typescript-eslint/no-unused-vars

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [s, setS] = useState<State>(() => ({ authed: false, role: "Founder", ...seed() }));
  const ref = useRef(s);
  const [roleRead, setRoleRead] = useState(false);
  const [sync, setSync] = useState<Sync>("loading");
  const [dbKind, setDbKind] = useState<Store["dbKind"]>("none");
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const saver = useRef<ReturnType<typeof setTimeout>>(undefined);

  const commit = useCallback((d: State) => { setRate(currentRate(d.records)); ref.current = d; setS(d); }, []);
  const prev = useRef<State | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const flash = useCallback((m: string, long = false) => {
    setToast(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => { setToast(""); setCanUndo(false); }, long ? 8000 : 2600);
  }, []);

  // Who is signed in lasts for the browser tab. Read it once on the client to avoid a hydration mismatch.
  useEffect(() => {
    try {
      const r = sessionStorage.getItem(KEY) as Role | null;
      if (r) commit({ ...ref.current, authed: true, role: r });
    } catch {}
    setRoleRead(true);
  }, [commit]);

  // The data comes from the database. If it cannot be reached the screens run on the bundled sample data.
  useEffect(() => {
    let live = true;
    fetch("/api/state", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { state: Stored; kind: "neon" | "local" }) => {
        if (!live) return;
        commit({ ...ref.current, ...j.state });
        setDbKind(j.kind);
        setSync("saved");
      })
      .catch(() => { if (live) { setSync("offline"); setDbKind("none"); } });
    return () => { live = false; };
  }, [commit]);

  const persist = useCallback(() => {
    clearTimeout(saver.current);
    setSync((v) => (v === "offline" ? v : "saving"));
    saver.current = setTimeout(() => {
      fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(toStored(ref.current)) })
        .then((r) => setSync(r.ok ? "saved" : "offline"))
        .catch(() => setSync("offline"));
    }, 500);
  }, []);

  const act = useCallback((fn: (d: State) => string | void, opts?: { undoable?: boolean }) => {
    const before = ref.current;
    const d = structuredClone(before);
    const m = fn(d);
    commit(d);
    persist();
    if (opts?.undoable) prev.current = before;
    setCanUndo(!!opts?.undoable);
    if (m) flash(m, !!opts?.undoable);
  }, [commit, flash, persist]);

  const undo = useCallback(() => {
    if (!prev.current) return;
    commit({ ...prev.current, authed: ref.current.authed, role: ref.current.role });
    prev.current = null;
    persist();
    setCanUndo(false);
    flash("Undone");
  }, [commit, flash, persist]);

  const reset = useCallback(async () => {
    try {
      const r = await fetch("/api/state", { method: "DELETE" });
      if (!r.ok) throw new Error(String(r.status));
      const j = (await r.json()) as { state: Stored };
      commit({ ...ref.current, ...j.state });
      setSync("saved");
      flash("Demo data reset");
    } catch {
      commit({ ...ref.current, ...seed() });
      setSync("offline");
      flash("Demo data reset in this browser only");
    }
  }, [commit, flash]);

  const remember = (r: Role | null) => { try { if (r) sessionStorage.setItem(KEY, r); else sessionStorage.removeItem(KEY); } catch {} };
  const signIn = (role: Role) => { remember(role); commit({ ...ref.current, authed: true, role }); };
  const signOut = () => { remember(null); commit({ ...ref.current, authed: false }); };
  const setRole = (role: Role) => { remember(role); commit({ ...ref.current, role }); };

  const ready = roleRead && sync !== "loading";
  return <Ctx.Provider value={{ s, ready, act, toast, undo: canUndo ? undo : null, say: flash, signIn, signOut, setRole, sync, dbKind, reset }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore outside StoreProvider");
  return v;
}
