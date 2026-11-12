"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3, Boxes, ClipboardList, Gem, Globe, Hammer, Handshake, Landmark, LayoutDashboard,
  Menu, Package, PackageCheck, PenTool, Play, Receipt, ScrollText, Search, ShieldCheck, ShoppingCart, Store, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { useStore } from "../lib/store";
import { MODS, ROLES, allowed, firstAllowed } from "../lib/modules";
import { RATE24, inr } from "../lib/calc";
import { findPiece } from "../lib/search";
import type { Role } from "../lib/data";
import { cx } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  "/": LayoutDashboard, "/demo": Play, "/dashboards": BarChart3, "/security": Users, "/trace": Search, "/design": PenTool, "/products": Package, "/planning": ClipboardList,
  "/raw-material": Gem, "/procurement": ShoppingCart, "/job-work": Hammer, "/inward": PackageCheck, "/inventory": Boxes,
  "/sales": Receipt, "/stores": Store, "/ecommerce": Globe, "/after-sales": Wrench, "/consignment": Package,
  "/finance": Landmark, "/crm": Handshake, "/reports": ScrollText, "/approvals": ShieldCheck, "/audit": ClipboardList,
};

const control = "h-10 pointer-coarse:h-11 rounded-lg border border-border";

export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { s, ready, toast, act, signOut, setRole, sync, dbKind } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const login = path === "/login";
  const rail = (cls: string) => cx(collapsed && "lg:hidden", !open && "md:max-lg:hidden", cls);
  const ok = s.authed && allowed(s.role, path);

  useEffect(() => {
    if (!ready || login) return;
    if (!s.authed) router.replace("/login");
    else if (!ok) router.replace(firstAllowed(s.role));
  }, [ready, login, s.authed, s.role, ok, router]);

  const Toast = <div role="status" className={cx("fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 rounded-[10px] bg-foreground px-4 py-2.5 text-[13px] font-semibold text-background", !toast && "hidden")}>{toast}</div>;
  if (login) return <>{children}{Toast}</>;
  if (!ready || !ok) return null;

  const search = (v: string) => {
    const it = findPiece(s.items, v);
    if (it) router.push("/trace?tag=" + it.tag);
    else if (v.trim()) act(() => "Nothing found for " + v);
  };
  const saved = sync === "saved" ? (dbKind === "neon" ? "Saved to Neon" : "Saved to local database") : sync === "saving" ? "Saving" : "Not saved, offline";

  return (
    <div className={cx("app-shell grid h-dvh", "grid-cols-[minmax(0,1fr)] md:grid-cols-[64px_minmax(0,1fr)]", collapsed ? "lg:grid-cols-[64px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]")}>
      <a href="#main" className="no-print sr-only z-50 rounded-lg bg-foreground px-4 py-2 font-semibold text-background focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
      <aside className={cx("no-print z-40 flex min-h-0 flex-col border-r border-border bg-card max-md:transition-transform", open ? "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-60 max-lg:shadow-xl" : "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-60 max-md:-translate-x-full")}>
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
          <div className="grid size-8 flex-none place-items-center rounded-full border-[1.5px] border-gold font-display text-sm font-bold text-gold">A</div>
          <div className={rail("")}>
            <b className="font-display text-[13px] tracking-[0.22em] text-gold">AKOIRAH</b>
            <small className="block text-[11px] text-muted-foreground">ERP prototype</small>
          </div>
        </div>
        <nav aria-label="Modules" className="flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
          {MODS.map(([group, mods]) => {
            const list = mods.filter((m) => allowed(s.role, m[0]));
            if (!list.length) return null;
            return (
              <div key={group}>
                <p className={rail("mx-2.5 mb-1 mt-3.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground")}>{group}</p>
                {list.map(([href, label]) => {
                  const Icon = ICONS[href];
                  const on = path === href;
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)} title={label} aria-current={on ? "page" : undefined}
                      className={cx("flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 font-medium hover:bg-muted pointer-coarse:min-h-11", collapsed && "lg:justify-center", !open && "md:max-lg:justify-center", on && "bg-gold-light text-gold")}>
                      <Icon className="size-4 flex-none" aria-hidden />
                      <span className={rail("truncate")}>{label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col">
        <header className="no-print flex h-16 flex-none items-center gap-3 border-b border-border bg-card px-4 md:px-5">
          <button className={cx(control, "inline-flex w-10 flex-none items-center justify-center hover:bg-muted pointer-coarse:w-11")} onClick={() => (window.innerWidth < 1024 ? setOpen(!open) : setCollapsed(!collapsed))} aria-label="Toggle menu">
            <Menu className="size-4" />
          </button>
          <input aria-label="Search a tag, HUID, certificate or order" placeholder="Search tag, HUID or order"
            onKeyDown={(e) => { if (e.key === "Enter") search(e.currentTarget.value); }}
            className={cx(control, "hidden min-w-0 max-w-[420px] flex-1 bg-background px-3 outline-none focus:border-gold focus:ring-[3px] focus:ring-gold/20 sm:block")} />
          <Link href="/demo" className="ml-auto inline-flex min-h-10 flex-none items-center rounded-full bg-gold-light px-3 text-xs font-semibold text-foreground pointer-coarse:min-h-11" title="This demo runs on sample data. Open the demo guide.">
            Sample data
          </Link>
          <Link href="/demo" className="hidden min-h-10 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground lg:flex pointer-coarse:min-h-11" title="Where the data is saved">
            <i className={cx("size-2 rounded-full", sync === "saved" ? "bg-success" : sync === "saving" ? "bg-warning" : "bg-danger")} aria-hidden />
            {saved}
          </Link>
          <span className="hidden whitespace-nowrap text-xs text-muted-foreground xl:block">24K today <b className="tabular-nums text-foreground">{inr(RATE24)}</b>/g</span>
          <select aria-label="Role" value={s.role} onChange={(e) => { const r = e.target.value as Role; setRole(r); router.push(firstAllowed(r)); }}
            className={cx(control, "bg-card px-2")}>
            {(Object.keys(ROLES) as Role[]).map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className={cx(control, "px-3 hover:bg-muted")} onClick={() => { signOut(); router.push("/login"); }}>Sign out</button>
        </header>
        <main id="main" tabIndex={-1} className="app-main min-h-0 flex-1 overflow-auto p-4 outline-none md:p-6">
          <div className="mx-auto max-w-[1180px]">{children}</div>
        </main>
      </div>
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      {Toast}
    </div>
  );
}
