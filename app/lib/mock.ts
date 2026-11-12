// Static sample rows for screens whose backend is not built yet.
export const VENDORS = [
  { name: "Shree Karigar Works", city: "Mumbai", work: "Casting and setting", onTime: 92, wastage: 1.2, rating: "A" },
  { name: "Mehta Jewel Casting", city: "Surat", work: "Casting", onTime: 84, wastage: 1.6, rating: "B" },
  { name: "Kalyan Setters", city: "Jaipur", work: "Stone setting", onTime: 96, wastage: 0.9, rating: "A" },
  { name: "Polish Point", city: "Mumbai", work: "Finishing and polish", onTime: 88, wastage: 0.5, rating: "B" },
];
export const SUPPLIERS = ["Lab Diamonds Surat", "Bullion Desk Mumbai", "Findings House", "Gem Source Jaipur", "Pack & Pride"];
export const PARTNERS = ["Anand Jewellers, Pune", "Royal Gems, Hyderabad", "Corporate Gifting Co."];
export const STORES = ["Mumbai Flagship", "Delhi Store"];

export const AP = [
  { party: "Lab Diamonds Surat", due: 620000, age: "0-30", note: "PO-3316" },
  { party: "Shree Karigar Works", due: 184000, age: "0-30", note: "Job-work JC-2411" },
  { party: "Mehta Jewel Casting", due: 96000, age: "31-60", note: "Job-work JC-2409" },
  { party: "Findings House", due: 84000, age: "61-90+", note: "PO-3305" },
];

export const USERS = [
  { name: "Aarav Shah", email: "founder@akoirah.demo", role: "Founder", state: "Active" },
  { name: "Meera Kapoor", email: "meera@akoirah.demo", role: "Design head", state: "Active" },
  { name: "Arjun Desai", email: "arjun@akoirah.demo", role: "Designer", state: "Active" },
  { name: "Nikhil Rao", email: "nikhil@akoirah.demo", role: "Production manager", state: "Active" },
  { name: "Priya Menon", email: "priya@akoirah.demo", role: "Store manager", state: "Active" },
  { name: "Tanvi Joshi", email: "tanvi@akoirah.demo", role: "Accounts", state: "Active" },
  { name: "Shree Karigar Works", email: "orders@shreekarigar.test", role: "Vendor (portal)", state: "Invited" },
];

export const APPROVAL_RULES = [
  { id: "r1", name: "Final CAD lock", rule: "Always", limit: "", approver: "Design head, then founder" },
  { id: "r2", name: "Purchase order", rule: "Above value", limit: "500000", approver: "Procurement head, founder above 5,00,000" },
  { id: "r3", name: "Discount", rule: "Above percent", limit: "10", approver: "Store manager up to 10%, founder above" },
  { id: "r4", name: "Metal variance", rule: "Beyond allowed wastage", limit: "1.5", approver: "Production manager, founder" },
  { id: "r5", name: "Refund", rule: "Always", limit: "", approver: "Store manager and accounts" },
  { id: "r6", name: "Stock write-off", rule: "Always", limit: "", approver: "Founder" },
];

export const GOLD_RATES = [
  ["12 Nov", "13,250", "9,938", "Manual"], ["11 Nov", "13,210", "9,908", "Manual"], ["10 Nov", "13,180", "9,885", "Manual"], ["07 Nov", "13,095", "9,821", "Manual"],
];
