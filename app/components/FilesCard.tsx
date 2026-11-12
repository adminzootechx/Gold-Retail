"use client";
import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { Btn, Card } from "./ui";

interface Row { key: string; name: string; size: number; at?: string }
const kb = (n: number) => (n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1024 / 1024).toFixed(1) + " MB");

/** Files for one record (a design's CAD and references, a piece's certificate PDF), stored in Neon Object Storage. */
export default function FilesCard({ folder, title }: { folder: string; title: string }) {
  const { say } = useStore();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);

  const [tick, setTick] = useState(0);
  const load = () => setTick((n) => n + 1);

  // Fetch inside the effect and set state in the callback, so a change of record or an upload refreshes the list.
  useEffect(() => {
    let live = true;
    fetch("/api/files?folder=" + encodeURIComponent(folder), { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: await r.json() }))
      .then(({ ok, j }) => { if (live) { setRows(ok ? j.files : []); if (!ok) say("Files unavailable: " + j.error); } })
      .catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, [folder, tick, say]);

  const upload = async (f: File) => {
    setBusy(true);
    const fd = new FormData();
    fd.set("folder", folder);
    fd.set("file", f);
    const r = await fetch("/api/files", { method: "POST", body: fd });
    const j = await r.json();
    setBusy(false);
    if (pick.current) pick.current.value = "";
    say(r.ok ? `${f.name} uploaded` : "Upload failed: " + j.error);
    if (r.ok) load();
  };

  const open = async (key: string) => {
    const r = await fetch("/api/files?key=" + encodeURIComponent(key));
    const j = await r.json();
    if (r.ok) window.open(j.url, "_blank", "noopener");
    else say("Could not open: " + j.error);
  };

  const remove = async (key: string) => {
    const r = await fetch("/api/files?key=" + encodeURIComponent(key), { method: "DELETE" });
    say(r.ok ? "File removed" : "Could not remove the file");
    if (r.ok) load();
  };

  return (
    <Card title={title}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input ref={pick} type="file" aria-label={"Choose a file for " + title} className="max-w-[16rem] text-[13px]" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }} disabled={busy} />
        {busy && <span className="text-muted-foreground">Uploading</span>}
      </div>
      {rows === null ? <p className="text-muted-foreground">Loading files</p> : !rows.length ? <p className="text-muted-foreground">No files yet. Up to 10 MB each.</p> : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
              <span className="min-w-0 truncate">{f.name} <span className="text-muted-foreground">{kb(f.size)}</span></span>
              <span className="flex flex-none gap-1.5"><Btn sm onClick={() => open(f.key)}>Open</Btn><Btn sm onClick={() => remove(f.key)}>Remove</Btn></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
