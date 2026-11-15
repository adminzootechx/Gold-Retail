"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3, ChevronDown, Boxes, ClipboardList, Gem, Globe, Hammer, Handshake, Landmark, House,
  Bell, ChevronRight, Menu, Package, PanelLeftClose, PanelLeftOpen, PackageCheck, PenTool, Play, Receipt, ScrollText, Search, ShieldCheck, ShoppingCart, Store, Users, Wrench, type LucideIcon,
} from "lucide-react";
import { useStore } from "../lib/store";
import { MODS, allowed, firstAllowed } from "../lib/modules";
import { RATE24, inr } from "../lib/calc";
import { findPiece } from "../lib/search";
import { applyPrefs, usePrefs } from "../lib/prefs";
import AccountMenu from "./AccountMenu";
import NotificationDrawer from "./NotificationDrawer";
import { todos } from "../lib/home";
import { cx } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  "/": House, "/demo": Play, "/dashboards": BarChart3, "/security": Users, "/trace": Search, "/design": PenTool, "/products": Package, "/planning": ClipboardList,
  "/raw-material": Gem, "/procurement": ShoppingCart, "/job-work": Hammer, "/inward": PackageCheck, "/inventory": Boxes,
  "/sales": Receipt, "/stores": Store, "/ecommerce": Globe, "/after-sales": Wrench, "/consignment": Package,
  "/finance": Landmark, "/crm": Handshake, "/reports": ScrollText, "/approvals": ShieldCheck, "/audit": ClipboardList,
};

const GROUP_ICONS: Record<string, LucideIcon> = {
  Insights: BarChart3, Design: PenTool, Production: Hammer, Stock: Boxes, Sell: Receipt, Admin: ShieldCheck,
};

const control = "h-10 pointer-coarse:h-11 rounded-lg border border-border";

export default function Frame({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { s, ready, toast, act, undo } = useStore();
  const [notes, setNotes] = useState(false);
  const prefs = usePrefs();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const [fold, setFold] = useState<Record<string, boolean>>({});
  const login = path === "/login";
  const find = useRef<HTMLInputElement>(null);
  const count = todos(s, s.role).length;
  const crumb = (() => { for (const [group, mods] of MODS) { const m = mods.find((x) => x[0] === path); if (m) return { group, page: m[1] }; } return { group: "", page: path === "/" ? "Home" : path === "/account" ? "Account settings" : path === "/preferences" ? "Preferences" : "" }; })();
  const rail = (cls: string) => cx(collapsed && "lg:hidden", !open && "md:max-lg:hidden", cls);
  const ok = s.authed && allowed(s.role, path);

  useEffect(() => applyPrefs(prefs), [prefs]);

  useEffect(() => { if (path === "/") find.current?.focus(); }, [path, ready]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); find.current?.focus(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  useEffect(() => {
    if (!ready || login) return;
    if (!s.authed) router.replace("/login");
    else if (!ok) router.replace(firstAllowed(s.role));
  }, [ready, login, s.authed, s.role, ok, router]);

  const Toast = <div role="status" className={cx("fixed bottom-6 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-4 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background", !toast && "hidden")}>{toast}{undo && <button onClick={undo} className="-my-1 min-h-10 rounded-lg px-2 text-gold-mid underline underline-offset-2 hover:text-white">Undo</button>}</div>;
  if (login) return <>{children}{Toast}</>;
  if (!ready || !ok) return null;

  const search = (v: string) => {
    const it = findPiece(s.items, v);
    if (it) router.push("/trace?tag=" + it.tag);
    else if (v.trim()) act(() => "Nothing found for " + v);
  };

  return (
    <div className={cx("app-shell grid h-dvh bg-frame transition-[grid-template-columns] duration-300 ease-out motion-reduce:transition-none", "grid-cols-[minmax(0,1fr)] md:grid-cols-[64px_minmax(0,1fr)]", collapsed ? "lg:grid-cols-[64px_minmax(0,1fr)]" : "lg:grid-cols-[240px_minmax(0,1fr)]")}>
      <a href="#main" className="no-print sr-only z-50 rounded-lg bg-foreground px-4 py-2 font-semibold text-background focus:not-sr-only focus:fixed focus:left-3 focus:top-3">Skip to main content</a>
      <aside className={cx("no-print z-40 flex min-h-0 flex-col overflow-hidden bg-frame text-white max-md:transition-transform max-md:duration-300 max-md:ease-out", open ? "drawer-in max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:w-60 max-lg:shadow-xl" : "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:w-60 max-md:-translate-x-full")}>
        <div className="flex h-16 flex-none items-center gap-1 pl-4 pr-2">
        <Link href="/" aria-label="AKOIRAH home" className={cx("flex min-w-0 flex-1 items-center gap-2.5", collapsed && "lg:hidden")}>
          <div className="grid size-8 flex-none place-items-center rounded-full border-[1.5px] border-gold-mid font-display text-sm font-bold text-gold-mid">A</div>
          <div className={rail("")}>
            <b className="font-display text-[13px] tracking-[0.22em] text-gold-mid">AKOIRAH</b>
            <small className="block text-[11px] text-white/60">Jewellery ERP</small>
          </div>
        </Link>
        <button type="button" onClick={() => (window.innerWidth < 1024 ? setOpen(false) : setCollapsed(!collapsed))} aria-pressed={collapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cx("group size-10 flex-none items-center justify-center rounded-lg text-white/70 hover:bg-white/10 lg:inline-flex", open ? "inline-flex" : "hidden", collapsed && "lg:mx-auto")}>
          {collapsed ? (
            <>
              <span className="hidden size-9 place-items-center rounded-full lg:grid border-[1.5px] border-gold-mid font-display text-sm font-bold text-gold-mid lg:group-hover:hidden lg:group-focus-visible:hidden">A</span>
              <PanelLeftOpen className="hidden size-5 group-hover:block group-focus-visible:block" aria-hidden />
              <PanelLeftClose className="size-5 lg:hidden" aria-hidden />
            </>
          ) : <PanelLeftClose className="size-5" aria-hidden />}
        </button>
        </div>
        <nav aria-label="Modules" className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5">
          <Link href="/" onClick={() => { setOpen(false); setCollapsed(false); }} title="Home" aria-current={path === "/" ? "page" : undefined}
            className={cx("mb-1 flex min-h-11 items-center gap-2.5 rounded-lg px-2.5 font-semibold", collapsed && "lg:justify-center", !open && "md:max-lg:justify-center", path === "/" ? "bg-white text-primary" : "text-white hover:bg-white/10")}>
            <House className="size-4 flex-none" aria-hidden />
            <span className={rail("")}>Home</span>
          </Link>
          {MODS.map(([group, mods]) => {
            const list = mods.filter((m) => allowed(s.role, m[0]));
            if (!list.length) return null;
            const hasActive = list.some((m) => m[0] === path);
            const expanded = fold[group] ?? hasActive;
            return (
              <div key={group}>
                <button type="button" aria-expanded={expanded} title={group}
                  onClick={() => {
                    // In the icon rail a group icon opens the sidebar on that group.
                    const rail = window.innerWidth >= 1024 ? collapsed : !open;
                    if (rail) { setCollapsed(false); setOpen(true); setFold({ ...fold, [group]: true }); }
                    else setFold({ ...fold, [group]: !expanded });
                  }}
                  className={cx("mt-1.5 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm font-semibold tracking-wide hover:bg-white/10", collapsed && "lg:justify-center", !open && "md:max-lg:justify-center", hasActive ? "text-white" : "text-white/60", hasActive && collapsed && "lg:bg-white/15")}>
                  {(() => { const GI = GROUP_ICONS[group]; return <GI className={cx("hidden size-4 flex-none", collapsed && "lg:block", !open && "md:max-lg:block")} aria-hidden />; })()}
                  <span className={rail("flex-1")}>{group}</span>
                  <ChevronDown className={rail(cx("size-4 transition-transform", expanded && "rotate-180"))} aria-hidden />
                </button>
                <div className={cx(!expanded && "hidden", collapsed && "lg:hidden", !open && "md:max-lg:hidden", "pl-1 lg:pl-3")}>
                {list.map(([href, label]) => {
                  const Icon = ICONS[href];
                  const on = path === href;
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)} title={label} aria-current={on ? "page" : undefined}
                      className={cx("flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 font-medium text-white/75 hover:bg-white/10 hover:text-white pointer-coarse:min-h-11", collapsed && "lg:justify-center", !open && "md:max-lg:justify-center", on && "bg-white/15 text-white relative before:absolute before:-left-2.5 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-white")}>
                      <Icon className="size-4 flex-none" aria-hidden />
                      <span className={rail("truncate")}>{label}</span>
                    </Link>
                  );
                })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="no-print border-t border-white/10 p-2.5"><AccountMenu dark labelCls={rail("")} /></div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden bg-white md:m-3 md:ml-0 md:rounded-[28px] md:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_12px_40px_rgba(0,0,0,0.45)]">
        <header className="no-print flex h-16 flex-none items-center gap-3 border-b border-border bg-card px-4 md:px-6">
          <button className={cx(control, "inline-flex w-10 flex-none items-center justify-center hover:bg-muted pointer-coarse:w-11 lg:hidden")} onClick={() => setOpen(!open)} aria-label="Open menu" aria-expanded={open}>
            <Menu className="size-4" />
          </button>
          <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 whitespace-nowrap text-sm text-muted-foreground md:flex">
            <Link href="/" className="hover:text-foreground">AKOIRAH</Link>
            {crumb.group && <><ChevronRight className="size-3.5" aria-hidden /><span>{crumb.group}</span></>}
            <ChevronRight className="size-3.5" aria-hidden /><span className="font-semibold text-foreground">{crumb.page}</span>
          </nav>
          <div className="relative mx-auto hidden w-full max-w-[460px] flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input ref={find} aria-label="Search a tag, HUID, certificate or order" placeholder="Scan or search a tag, HUID, certificate or order"
              onKeyDown={(e) => { if (e.key === "Enter") search(e.currentTarget.value); }}
              className={cx(control, "w-full bg-background pl-9 pr-14 outline-none focus:border-gold focus:ring-[3px] focus:ring-gold/20")} />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[11px] text-muted-foreground">Ctrl K</kbd>
          </div>
          <span className="hidden whitespace-nowrap text-sm text-muted-foreground xl:block">24K <b className="tabular-nums text-foreground">{inr(RATE24)}</b>/g</span>
          <button type="button" onClick={() => setNotes(true)} aria-haspopup="dialog" aria-label={count ? `Notifications, ${count} waiting` : "Notifications"} className={cx(control, "relative ml-auto inline-flex w-10 flex-none items-center justify-center hover:bg-muted pointer-coarse:w-11 sm:ml-0")}>
            <Bell className="size-4" aria-hidden />
            {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold leading-5 text-white">{count}</span>}
          </button>
        </header>
        <main id="main" tabIndex={-1} className="app-main min-h-0 flex-1 overflow-auto p-5 outline-none md:p-10">
          <div className="mx-auto max-w-[1120px]">{children}</div>
        </main>
      </div>
      {open && <button aria-label="Close menu" className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <NotificationDrawer open={notes} onClose={() => setNotes(false)} />
      {Toast}
    </div>
  );
}
