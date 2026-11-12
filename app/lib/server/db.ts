import path from "node:path";
import { mkdir } from "node:fs/promises";
import { attachDatabasePool } from "@vercel/functions";

/**
 * The database connection, the same way the gold ERP does it.
 *
 * Production runs on Neon: set DATABASE_URL to the project's pooled connection string
 * (the host containing "-pooler"). Without DATABASE_URL, `next dev` falls back to an
 * embedded Postgres (PGlite) stored in `.data/`. A production build never falls back:
 * it fails loudly instead of quietly writing to a disposable local file.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string): Promise<void>;
  kind: "neon" | "local";
  transaction<T>(run: (tx: Db) => Promise<T>): Promise<T>;
}

// Every entity is a row of JSON keyed by collection and position, so the screens keep their shape
// while the data lives in real tables. Split into proper columns table by table as modules harden.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS entities (
  coll       text NOT NULL,
  pos        integer NOT NULL,
  id         text,
  data       jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (coll, pos)
);
CREATE INDEX IF NOT EXISTS entities_id ON entities (coll, id);
`;

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { Pool } = await import("pg");
    // Pooled string for app traffic (Neon guidance for Vercel: node-postgres, pooled, pool attached to the function).
    const pool = new Pool({ connectionString: url, max: 3, idleTimeoutMillis: 10_000 });
    attachDatabasePool(pool);
    return {
      kind: "neon",
      async transaction(run) {
        const client = await pool.connect();
        const tx: Db = {
          kind: "neon",
          async query(text, params) { return (await client.query(text, params)).rows; },
          async exec(sql) { await client.query(sql); },
          transaction: async (nested) => nested(tx),
        };
        try {
          await client.query("BEGIN");
          const result = await run(tx);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
      async query(text, params) { return (await pool.query(text, params as unknown[] | undefined)).rows; },
      async exec(sql) { await pool.query(sql); },
    };
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DATABASE_URL is not set. Add the Neon connection string to the environment variables.");
  }

  const { PGlite } = await import("@electric-sql/pglite");
  const root = path.join(process.cwd(), ".data");
  await mkdir(root, { recursive: true });
  const local = new PGlite(path.join(root, "pglite"));
  return {
    kind: "local",
    async transaction(run) {
      return local.transaction(async (t) => {
        const tx: Db = {
          kind: "local",
          async query(text, params) { return (await t.query(text, params)).rows as never[]; },
          async exec(sql) { await t.exec(sql); },
          transaction: async (nested) => nested(tx),
        };
        return run(tx);
      });
    },
    async query(text, params) { return (await local.query(text, params as unknown[] | undefined)).rows as never[]; },
    async exec(sql) { await local.exec(sql); },
  };
}

declare global {
  // Survives hot reloads in development, so each edit does not open a new connection.
  var __akoirahDb: Promise<Db> | undefined;
}

/** Schema changes go over the direct (unpooled) string, as the Neon skill advises; the pooler does not support session state. */
async function migrate(d: Db) {
  const direct = process.env.DATABASE_URL_UNPOOLED;
  if (d.kind === "neon" && direct) {
    const { Client } = await import("pg");
    const c = new Client({ connectionString: direct });
    await c.connect();
    try { await c.query(SCHEMA); } finally { await c.end(); }
    return;
  }
  await d.exec(SCHEMA);
}

export function getDb(): Promise<Db> {
  if (!globalThis.__akoirahDb) {
    globalThis.__akoirahDb = connect()
      .then(async (d) => { await migrate(d); return d; })
      .catch((e) => { globalThis.__akoirahDb = undefined; throw e; });
  }
  return globalThis.__akoirahDb;
}
