import { redirect } from "next/navigation";

/** Dashboards now live on Home, under Analytics. Old links and bookmarks land there. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const n = new URLSearchParams({ view: "analytics" });
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string") n.set(k, v);
  redirect("/?" + n);
}
