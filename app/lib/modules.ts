import type { Role } from "./data";

// [href, label, blueprint module number]
export type Mod = readonly [href: string, label: string, num: string];

/** The twenty modules, in the order and with the names the functional blueprint gives them (section "End-to-End Business Modules"). */
export const MODULES: ReadonlyArray<Mod> = [
  ["/design", "Product Development", "1"],
  ["/products", "Product Master & SKU Management", "2"],
  ["/planning", "Production Planning", "3"],
  ["/raw-material", "Raw Material Management", "4"],
  ["/procurement", "Procurement", "5"],
  ["/job-work", "Vendor Job Work", "6"],
  ["/inward", "Head Office Inward", "7"],
  ["/inventory", "Inventory Management", "8"],
  ["/sales", "Sales Order Management", "9"],
  ["/stores", "Store Operations", "10"],
  ["/repairs", "Repairs", "11"],
  ["/exchange", "Lifetime Exchange", "12"],
  ["/refunds", "Refunds", "13"],
  ["/consignment", "Consignment", "14"],
  ["/finance", "Finance & Accounts", "15"],
  ["/crm", "CRM & Marketing", "16"],
  ["/dashboards", "Dashboards & Analytics", "17"],
  ["/reports", "Reports", "18"],
  ["/security", "Security & Approval Matrix", "19"],
  ["/ecommerce", "E-commerce Order Management", "20"],
];

/** After the twenty: the blueprint's "Mandatory Traceability" section, then the client walk-through. */
const EXTRA: ReadonlyArray<Mod> = [["/trace", "Mandatory Traceability", ""], ["/demo", "Demo Guide", ""]];

/** The sidebar: the same tiles and collapsible groups as before, in the blueprint's order (module numbers in the comments). */
export type Section = { tile: Mod; group?: undefined } | { group: readonly [name: string, mods: ReadonlyArray<Mod>]; tile?: undefined };
export const SECTIONS: ReadonlyArray<Section> = [
  { group: ["Design", [["/design", "Product design", "1"], ["/products", "Products", "2"]]] },
  { group: ["Production", [["/planning", "Planning", "3"], ["/raw-material", "Raw material", "4"], ["/procurement", "Procurement", "5"], ["/job-work", "Vendor job work", "6"], ["/inward", "Inward", "7"]]] },
  { tile: ["/inventory", "Inventory", "8"] },
  { tile: ["/sales", "Sales orders", "9"] },
  { tile: ["/stores", "Store operations", "10"] },
  { group: ["After-sales", [["/repairs", "Repairs", "11"], ["/exchange", "Lifetime exchange", "12"], ["/refunds", "Refunds", "13"], ["/consignment", "Consignment", "14"]]] },
  { group: ["Admin", [["/finance", "Finance", "15"], ["/crm", "CRM", "16"], ["/dashboards", "Dashboards", "17"], ["/reports", "Reports", "18"], ["/security", "Security", "19"]]] },
  { tile: ["/ecommerce", "Online orders", "20"] },
  { group: ["Tools", [["/trace", "Trace a piece", ""], ["/demo", "Demo guide", ""]]] },
];

/** Every screen, with the blueprint's heading as its page title. */
export const ALL_MODS: ReadonlyArray<Mod> = [...MODULES, ...EXTRA];

export const ROLES: Record<Role, string[] | null> = {
  Founder: null,
  "Production manager": ["/", "/demo", "/dashboards", "/trace", "/planning", "/raw-material", "/procurement", "/job-work", "/inward", "/inventory", "/reports", "/security"],
  "Store manager": ["/", "/demo", "/dashboards", "/trace", "/inventory", "/sales", "/stores", "/repairs", "/exchange", "/refunds", "/ecommerce", "/consignment", "/crm", "/reports", "/security"],
  "Vendor (portal)": ["/", "/job-work"],
};

/** Every signed-in person can open their own account and preferences. */
const OWN = ["/account", "/preferences", "/approvals", "/audit", "/after-sales"]; // the last three only redirect to their new homes
export const allowed = (role: Role, href: string) => OWN.includes(href) || !ROLES[role] || ROLES[role]!.includes(href);
export const firstAllowed = (role: Role) => ROLES[role]?.[0] ?? "/";
