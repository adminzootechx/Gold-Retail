import { redirect } from "next/navigation";

/** Approvals are the "Pending approvals" tab of Security & Approval Matrix. Old links land there. */
export default function Page() { redirect("/security?tab=approvals"); }
