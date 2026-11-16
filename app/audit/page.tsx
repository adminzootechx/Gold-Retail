import { redirect } from "next/navigation";

/** The audit log is a tab of Security & Approval Matrix. Old links land there. */
export default function Page() { redirect("/security?tab=audit"); }
