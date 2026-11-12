// End-to-end proof that the running app is on Neon: Postgres and Object Storage.
// Run the app first (npm run dev -- -p 3100), then: node --env-file=.env.local scripts/check-neon.mjs
import pg from "pg";
import { randomBytes } from "node:crypto";

const base = process.env.APP_URL ?? "http://localhost:3100";
const results = [];
const check = (name, ok, detail = "") => { results.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const must = (r) => { if (!r.ok) throw new Error(`${r.status} ${r.url}`); return r; };

// --- Postgres -------------------------------------------------------------
const sql = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED });
await sql.connect();
const host = new URL(process.env.DATABASE_URL_UNPOOLED).host.replace(/^[^.]+/, (x) => x.slice(0, 8) + "...");
const who = (await sql.query("select current_database() as db, current_setting('server_version') as v")).rows[0];
check("direct connection to Neon Postgres", !!who.db, `host ${host}, db ${who.db}, postgres ${who.v}`);

const got = await (await fetch(`${base}/api/state`, { cache: "no-store" }).then(must)).json();
check("app reports the Neon driver", got.kind === "neon", `kind=${got.kind}`);

const counts = async () => Object.fromEntries((await sql.query("select coll, count(*)::int n from entities group by coll order by coll")).rows.map((r) => [r.coll, r.n]));
const before = await counts();
check("seed rows are in the Neon entities table", before.items === got.state.items.length && before.invoices === got.state.invoices.length, `items=${before.items}, invoices=${before.invoices}, customers=${before.customers}`);

const marker = `neon-check ${Date.now()}`;
got.state.log.unshift({ t: "check", u: "check-neon", text: marker });
await fetch(`${base}/api/state`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(got.state) }).then(must);
const row = (await sql.query("select data->>'text' as text from entities where coll='log' and pos=0")).rows[0];
check("a change made through the app is stored in Neon", row?.text === marker, `log[0]="${row?.text}"`);
const again = await (await fetch(`${base}/api/state`, { cache: "no-store" }).then(must)).json();
check("and reads back through the app", again.state.log[0].text === marker);

// put the data back the way it was
await fetch(`${base}/api/state`, { method: "DELETE" }).then(must);
const after = await counts();
check("reset restores the sample data in Neon", after.log === before.log && after.invoices === before.invoices, `log=${after.log}, invoices=${after.invoices}`);
await sql.end();

// --- Object Storage -------------------------------------------------------
const folder = "documents/neon-check";
const bytes = randomBytes(4096);
const fd = new FormData();
fd.set("folder", folder);
fd.set("file", new File([bytes], "proof.bin", { type: "application/octet-stream" }));
const up = await (await fetch(`${base}/api/files`, { method: "POST", body: fd }).then(must)).json();
check("upload to the assets bucket", !!up.key && up.size === 4096, `key=${up.key}`);

const list = await (await fetch(`${base}/api/files?folder=${folder}`).then(must)).json();
check("file is listed", list.files.some((f) => f.key === up.key), `${list.files.length} file(s), name="${list.files[0]?.name}"`);

const link = await (await fetch(`${base}/api/files?key=${encodeURIComponent(up.key)}`).then(must)).json();
const back = Buffer.from(await (await fetch(link.url).then(must)).arrayBuffer());
check("presigned download returns identical bytes", back.equals(bytes), `${back.length} bytes`);

const bad = await fetch(`${base}/api/files?key=${encodeURIComponent("../secrets/x")}`);
check("bad keys are refused", bad.status === 400, `status ${bad.status}`);

await fetch(`${base}/api/files?key=${encodeURIComponent(up.key)}`, { method: "DELETE" }).then(must);
const gone = await (await fetch(`${base}/api/files?folder=${folder}`).then(must)).json();
check("delete removes it", !gone.files.some((f) => f.key === up.key));

console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
process.exit(results.every(Boolean) ? 0 : 1);
