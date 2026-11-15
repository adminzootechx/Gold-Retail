// Readers for the saved-forms collection. Newest first, so the first match is the current one.
import type { Rec, RecKind } from "./data";

export const ofKind = (r: Rec[], k: RecKind) => r.filter((x) => x.kind === k);
export const forSku = (r: Rec[], k: RecKind, sku: string) => r.find((x) => x.kind === k && x.f.sku === sku);
export const currentRate = (r: Rec[]) => Number(ofKind(r, "rate")[0]?.f.r24) || 13250;
export const limitOf = (r: Rec[], id: string, fallback: number) => Number(r.find((x) => x.kind === "rule" && x.id === id)?.f.limit) || fallback;

/** The next number for an id such as GRN-0458. `start` is the first number when nothing is saved yet. */
export const nextNo = (r: Rec[], kind: RecKind, start: number) => Math.max(start - 1, ...ofKind(r, kind).map((x) => +x.id.replace(/\D/g, "") || 0)) + 1;
