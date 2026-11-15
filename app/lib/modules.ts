import type { Role } from "./data";

// [href, label, blueprint module number]
export type Mod = readonly [href: string, label: string, num: string];
/** The screens people use all day. They sit in the sidebar as their own tiles. */
export const TOP: ReadonlyArray<Mod> = [
  ["/dashboards", "Dashboards", "17"], ["/inventory", "Inventory", "8"], ["/sales", "Sales orders", "9"], ["/stores", "Store operations", "10"], ["/approvals", "Approvals", "19"],
];

/** Everything else, grouped by the work it belongs to. */
export const MODS: ReadonlyArray<readonly [group: string, mods: ReadonlyArray<Mod>]> = [
  ["Tools", [["/reports", "Reports", "18"], ["/trace", "Trace a piece", ""], ["/demo", "Demo guide", ""]]],
  ["Design", [["/design", "Product design", "1"], ["/products", "Products", "2"]]],
  ["Production", [["/planning", "Planning", "3"], ["/raw-material", "Raw material", "4"], ["/procurement", "Procurement", "5"], ["/job-work", "Vendor job work", "6"], ["/inward", "Inward", "7"]]],
  ["Customers", [["/ecommerce", "Online orders", "20"], ["/after-sales", "After-sales", "11-13"], ["/crm", "CRM", "16"], ["/consignment", "Consignment", "14"]]],
  ["Admin", [["/finance", "Finance", "15"], ["/security", "Users and access", "19"], ["/audit", "Audit log", "19"]]],
];

/** Every screen in the sidebar, standalone and grouped. */
export const ALL_MODS: ReadonlyArray<Mod> = [...TOP, ...MODS.flatMap(([, m]) => m)];

export const ROLES: Record<Role, string[] | null> = {
  Founder: null,
  "Production manager": ["/", "/demo", "/dashboards", "/trace", "/planning", "/raw-material", "/procurement", "/job-work", "/inward", "/inventory", "/reports", "/approvals", "/audit"],
  "Store manager": ["/", "/demo", "/dashboards", "/trace", "/inventory", "/sales", "/stores", "/ecommerce", "/after-sales", "/consignment", "/crm", "/reports", "/approvals"],
  "Vendor (portal)": ["/", "/job-work"],
};

/** Every signed-in person can open their own account and preferences. */
const OWN = ["/account", "/preferences"];
export const allowed = (role: Role, href: string) => OWN.includes(href) || !ROLES[role] || ROLES[role]!.includes(href);
export const firstAllowed = (role: Role) => ROLES[role]?.[0] ?? "/";
