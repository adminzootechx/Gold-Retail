import type { Item } from "./data";

/** Find a piece from what a scanner or a person types: tag, HUID, certificate number or order id. */
export function findPiece(items: Item[], raw: string): Item | undefined {
  const q = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!q) return undefined;
  return items.find((i) => i.tag === q || i.huid.toUpperCase() === q || i.cert.toUpperCase().replace(/\s+/g, "") === q || i.order === q);
}
