// Supplier balances: the open bills, less any payment vouchers posted against the same party.
import { AP } from "./mock";
import type { State } from "./data";
import { ofKind } from "./records";

export function payables(s: Pick<State, "records">) {
  const paid: Record<string, number> = {};
  for (const v of ofKind(s.records, "voucher")) if (v.f.type === "Payment") paid[v.f.party] = (paid[v.f.party] ?? 0) + Number(v.f.amount);
  return AP.map((r) => {
    const take = Math.min(r.due, paid[r.party] ?? 0);
    paid[r.party] = (paid[r.party] ?? 0) - take;
    return { ...r, due: r.due - take };
  }).filter((r) => r.due > 0);
}
