import { seed, type Stored } from "../data";
import { getDb, type Db } from "./db";

export const COLLECTIONS = ["lots", "designs", "skus", "jcs", "inw", "approvals", "repairs", "orders", "items", "log", "pos", "memos", "messages", "customers", "invoices"] as const;
type Coll = (typeof COLLECTIONS)[number];

const idOf = (v: unknown): string | null => {
  const o = v as { id?: unknown; tag?: unknown } | null;
  return typeof o?.id === "string" ? o.id : typeof o?.tag === "string" ? o.tag : null;
};

async function write(tx: Db, s: Stored) {
  for (const c of COLLECTIONS) {
    await tx.query("DELETE FROM entities WHERE coll = $1", [c]);
    const rows = s[c as Coll] as unknown[];
    for (let at = 0; at < rows.length; at += 200) {
      const chunk = rows.slice(at, at + 200);
      const params: unknown[] = [];
      const values = chunk.map((row, i) => {
        params.push(c, at + i, idOf(row), JSON.stringify(row));
        const n = i * 4;
        return `($${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}::jsonb)`;
      });
      await tx.query(`INSERT INTO entities (coll, pos, id, data) VALUES ${values.join(",")}`, params);
    }
  }
}

// One save at a time, in the order they arrive.
let chain: Promise<unknown> = Promise.resolve();
const serial = <T>(run: () => Promise<T>) => { const next = chain.then(run, run); chain = next.catch(() => undefined); return next; };

export async function saveState(s: Stored) {
  const db = await getDb();
  await serial(() => db.transaction((tx) => write(tx, s)));
}

/** The saved state. The first call on an empty database seeds it with the sample data. */
export async function loadState(): Promise<{ state: Stored; kind: Db["kind"] }> {
  const db = await getDb();
  const rows = await db.query<{ coll: string; data: unknown }>("SELECT coll, data FROM entities ORDER BY coll, pos");
  const fresh = seed();
  if (!rows.length) {
    await saveState(fresh);
    return { state: fresh, kind: db.kind };
  }
  const state = Object.fromEntries(COLLECTIONS.map((c) => [c, [] as unknown[]])) as unknown as Record<Coll, unknown[]>;
  for (const r of rows) state[r.coll as Coll]?.push(r.data);
  // A collection added after the database was first seeded starts from its sample rows.
  for (const c of COLLECTIONS) if (!state[c].length) state[c] = fresh[c] as unknown[];
  return { state: state as unknown as Stored, kind: db.kind };
}

export async function resetState() {
  const fresh = seed();
  await saveState(fresh);
  return fresh;
}

export const isStored = (v: unknown): v is Stored =>
  !!v && typeof v === "object" && COLLECTIONS.every((c) => Array.isArray((v as Record<string, unknown>)[c]));
