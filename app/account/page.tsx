"use client";
import { useRouter } from "next/navigation";
import { useStore } from "../lib/store";
import { MODS, allowed } from "../lib/modules";
import { profileFor } from "../lib/prefs";
import { saveProfile } from "../lib/actions3";
import { Btn, Card, PageHeader, Rec } from "../components/ui";
import { FormCard } from "../components/kit";

export default function Account() {
  const { s, act, signOut } = useStore();
  const router = useRouter();
  const me = profileFor(s.role, s.records);
  const screens = MODS.flatMap(([, mods]) => mods).filter((m) => allowed(s.role, m[0])).map((m) => m[1]);

  return (
    <>
      <PageHeader title="Account settings" sub="Your profile and what your role can open." />
      <div className="grid items-start gap-3.5 lg:grid-cols-2">
        <FormCard title="Profile" cta="Save profile" onSubmit={(v) => act((d) => saveProfile(d, { name: v.name, email: v.email, phone: v.phone }))}
          fields={[{ id: "name", label: "Full name", value: me.name }, { id: "email", label: "Email", type: "email", value: me.email }, { id: "phone", label: "Phone", type: "tel", value: me.phone }]} />
        <Card title="Your access">
          <Rec rows={[["Role", s.role], ["Screens you can open", String(screens.length + 1)]]} />
          <p className="mt-2.5 text-muted-foreground">{["Home", ...screens].join(", ")}.</p>
        </Card>
        <Card title="Session">
          <Rec rows={[["Signed in as", me.email], ["Data saved to", "Neon (sample data)"]]} />
          <div className="mt-3"><Btn onClick={() => { signOut(); router.push("/login"); }}>Sign out</Btn></div>
        </Card>
      </div>
    </>
  );
}
