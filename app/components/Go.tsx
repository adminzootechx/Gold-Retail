"use client";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent } from "react";

/** A link that goes to a page without showing the address in the browser's corner when hovered. Works with click, Enter and Ctrl-click. */
export default function Link({ href, onClick, className, children, ...rest }: Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { href: string }) {
  const router = useRouter();
  const go = (e: MouseEvent<HTMLAnchorElement> | null) => {
    if (e) { onClick?.(e); if (e.defaultPrevented) return; }
    if (e && (e.metaKey || e.ctrlKey)) window.open(href, "_blank");
    else router.push(href);
  };
  return (
    <a role="link" tabIndex={0} {...rest} className={(className ?? "") + " cursor-pointer"} onClick={go}
      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onClick?.(e as unknown as MouseEvent<HTMLAnchorElement>); router.push(href); } }}
      onMouseEnter={() => router.prefetch(href)}>
      {children}
    </a>
  );
}
