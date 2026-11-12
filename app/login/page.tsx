"use client";
import { useRouter } from "next/navigation";
import { useStore } from "../lib/store";
import { ROLES, firstAllowed } from "../lib/modules";
import type { Role } from "../lib/data";

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useStore();
  const go = (r: Role) => { signIn(r); router.push(firstAllowed(r)); };

  return (
    <div className="grid min-h-dvh md:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden p-7 text-white md:flex"
        style={{ background: "radial-gradient(ellipse at 52% 62%, #f7c25a 0, #c0701c 14%, #4a2a12 38%, #120c07 72%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-full border-[1.5px] border-gold-mid font-display text-sm font-bold text-gold-mid">A</div>
          <div>
            <b className="font-display text-[13px] tracking-[0.22em] text-gold-mid">AKOIRAH</b>
            <small className="block text-[10.5px] text-[#e8dcc4]">Lab-grown diamond jewellery</small>
          </div>
        </div>
        <div>
          <h2 className="mb-2.5 text-balance font-display text-[clamp(28px,3.4vw,42px)] font-semibold leading-[1.1]">Every gram and every stone, on the books.</h2>
          <p className="max-w-[40ch] text-[#eadfc9]">From the first sketch to the customer&apos;s door, each piece is traced.</p>
        </div>
      </div>
      <div className="flex items-center justify-center bg-[#fff8ea] p-8 text-[#0f172a]">
        <div className="w-full max-w-[420px]">
          <h1 className="mb-1.5 text-[32px] font-semibold">Sign in</h1>
          <p className="mb-5 text-muted-foreground">Use the email your AKOIRAH administrator added.</p>
          <form onSubmit={(e) => { e.preventDefault(); go("Founder"); }}>
            <label htmlFor="em" className="mb-1 block text-[12.5px] font-semibold">Email</label>
            <input id="em" defaultValue="founder@akoirah.demo" className="mb-3 h-11 w-full rounded-lg border border-[#d9c9a4] bg-white px-3 outline-none focus:border-gold focus:ring-[3px] focus:ring-gold/25" />
            <label htmlFor="pw" className="mb-1 block text-[12.5px] font-semibold">Password</label>
            <input id="pw" type="password" defaultValue="demo-password" className="mb-4 h-11 w-full rounded-lg border border-[#d9c9a4] bg-white px-3 outline-none focus:border-gold focus:ring-[3px] focus:ring-gold/25" />
            <button className="h-11 w-full rounded-lg border border-gold bg-gold text-[15px] font-semibold text-gold-fg hover:brightness-110">Sign in</button>
          </form>
          <div className="mt-5 border-t border-[#e8dcc0] pt-4">
            <small className="text-muted-foreground">Prototype: sign in as a role to see only the screens that role gets.</small>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {(Object.keys(ROLES) as Role[]).map((r) => (
                <button key={r} onClick={() => go(r)} className="rounded-lg border border-[#d9c9a4] bg-[#fffdf6] px-3 py-1.5 text-[12.5px] font-semibold hover:bg-[#fef3d0]">{r}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
