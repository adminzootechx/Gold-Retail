"use client";
import Link from "./Go";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, Settings, SlidersHorizontal } from "lucide-react";
import { useStore } from "../lib/store";
import { ROLES, firstAllowed } from "../lib/modules";
import { profileFor } from "../lib/prefs";
import { cx } from "./ui";
import type { Role } from "../lib/data";

const item = "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-left hover:bg-muted pointer-coarse:min-h-11";

export default function AccountMenu({ dark = false, labelCls = "hidden md:block" }: { dark?: boolean; labelCls?: string }) {
  const { s, signOut, setRole } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const me = profileFor(s.role, s.records);
  const initials = me.name.split(" ").map((w) => w[0]).slice(0, 2).join("");

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <div ref={box} className={cx("relative", dark ? "w-full" : "flex-none")}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className={cx("flex items-center gap-2 rounded-xl pl-1.5 pr-2 pointer-coarse:h-12", dark ? "h-12 w-full text-white hover:bg-white/10" : "h-10 border border-border hover:bg-muted")}>
        <span className="grid size-8 flex-none place-items-center rounded-full bg-gold text-xs font-bold text-gold-fg">{initials}</span>
        <span className={cx("min-w-0 flex-1 text-left leading-tight", labelCls)}>
          <b className="block break-words text-[13px]">{me.name}</b>
          <small className={cx("block text-xs", dark ? "text-white/60" : "text-muted-foreground")}>{s.role === "Vendor (portal)" ? "Vendor" : s.role}</small>
        </span>
        <ChevronDown className={cx("size-4 flex-none", dark ? "text-white/60 " + labelCls : "text-muted-foreground")} aria-hidden />
      </button>
      {open && (
        <div role="menu" className={cx("z-50 w-72 rounded-2xl border border-border bg-card p-1.5 text-foreground shadow-xl", dark ? "fixed bottom-20 left-3" : "absolute right-0 top-12")}>
          <div className="border-b border-border px-2.5 pb-2.5 pt-1.5">
            <b className="block">{me.name}</b>
            <small className="text-muted-foreground">{me.email}</small>
          </div>
          <div className="py-1.5">
            <Link role="menuitem" href="/account" onClick={() => setOpen(false)} className={item}><Settings className="size-4" aria-hidden />Account settings</Link>
            <Link role="menuitem" href="/preferences" onClick={() => setOpen(false)} className={item}><SlidersHorizontal className="size-4" aria-hidden />Preferences</Link>
          </div>
          <div className="border-t border-border py-1.5">
            <p className="px-2.5 pb-1 pt-0.5 text-xs font-semibold tracking-wide text-muted-foreground">Switch role (demo)</p>
            {(Object.keys(ROLES) as Role[]).map((r) => (
              <button key={r} role="menuitemradio" aria-checked={r === s.role} onClick={() => { setRole(r); go(firstAllowed(r)); }} className={cx(item, r === s.role && "font-semibold")}>
                <Check className={cx("size-4", r !== s.role && "invisible")} aria-hidden />{r}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-1.5">
            <button role="menuitem" onClick={() => { setOpen(false); signOut(); router.push("/login"); }} className={cx(item, "text-danger")}><LogOut className="size-4" aria-hidden />Sign out</button>
          </div>
        </div>
      )}
    </div>
  );
}
