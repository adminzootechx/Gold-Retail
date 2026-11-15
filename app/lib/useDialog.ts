"use client";
import { useEffect, useEffectEvent, type RefObject } from "react";

/** What a modal dialog needs: focus moves in on open, Tab stays inside, Escape closes, focus goes back on close. */
export function useDialog(open: boolean, onClose: () => void, panel: RefObject<HTMLElement | null>, first?: RefObject<HTMLElement | null>) {
  // The close handler changes on every render, so it is read through an event: the dialog must not re-run (and steal focus) when it does.
  const close = useEffectEvent(onClose);
  useEffect(() => {
    if (!open) return;
    const from = document.activeElement as HTMLElement | null;
    // The panel turns visible as it starts to slide, so focus moves a moment later.
    const t = setTimeout(() => (first?.current ?? panel.current?.querySelector<HTMLElement>("button, a, input"))?.focus(), 60);
    const keys = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close(); }
      if (e.key !== "Tab" || !panel.current) return;
      const f = [...panel.current.querySelectorAll<HTMLElement>('a, button, input, [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
      if (!f.length) return;
      const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { clearTimeout(t); document.removeEventListener("keydown", keys); from?.focus(); };
  }, [open, panel, first]);
}
