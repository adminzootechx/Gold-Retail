import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";

/** Neon Object Storage, declared as the `assets` bucket in neon.ts. Credentials come from the AWS_* variables Neon injects. */
export const BUCKET = "assets";
export const MAX_BYTES = 10 * 1024 * 1024;

let client: Files | undefined;
export const files = () => (client ??= new Files({ adapter: neon({ bucket: BUCKET }) }));

// Files live under a known folder per record: designs/D-118, certificates/AK-RNG-014-0001, documents/PO-3316.
export const validFolder = (p: string) => /^(designs|certificates|documents)\/[A-Za-z0-9_-]{1,64}$/.test(p);
export const validKey = (k: string) => /^(designs|certificates|documents)\/[A-Za-z0-9_-]{1,64}\/[A-Za-z0-9._-]{1,140}$/.test(k);
export const safeName = (n: string) => n.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^\.+/, "").slice(-100) || "file";
