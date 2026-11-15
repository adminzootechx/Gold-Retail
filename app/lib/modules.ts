import type { Role } from "./data";

// [href, label, blueprint module number]
export type Mod = readonly [href: string, label: string, num: string];
export const MODS: ReadonlyArray<readonly [group: string, mods: ReadonlyArray<Mod>]> = [
  ["Insights", [["/dashboards", "Analytics dashboards", "17"], ["/reports", "Reports", "18"], ["/trace", "Trace a piece", ""], ["/demo", "Demo guide", ""]]],
  ["Design", [["/design", "Product development", "1"], ["/products", "Products and SKUs", "2"]]],
  ["Production", [["/planning", "Production planning", "3"], ["/raw-material", "Raw material", "4"], ["/procurement", "Procurement", "5"], ["/job-work", "Vendor job work", "6"]]],
  ["Stock", [["/inward", "HO inward and tagging", "7"], ["/inventory", "Inventory", "8"], ["/consignment", "Consignment", "14"]]],
  ["Sell", [["/sales", "Sales orders", "9"], ["/stores", "Store operations", "10"], ["/ecommerce", "E-commerce orders", "20"], ["/after-sales", "Repairs, exchange, refunds", "11-13"], ["/crm", "CRM and marketing", "16"]]],
  ["Admin", [["/finance", "Finance and accounts", "15"], ["/approvals", "Approvals", "19"], ["/security", "Users and access", "19"], ["/audit", "Audit log", "19"]]],
];

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
