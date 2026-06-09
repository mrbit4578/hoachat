export const ROUTES = [
  { path: "/chemicals", label: "Chemical Catalog", description: "Master data and usage status." },
  { path: "/zdhc", label: "ZDHC Compliance", description: "Compliance evidence and review state." },
  { path: "/inventory-lots", label: "Inventory Lots", description: "Lot.no, dates, and available stock." },
  { path: "/inbound", label: "Inbound", description: "Receipts, import validation, and lot creation." },
  { path: "/outbound", label: "Outbound", description: "Issue requests and lot suggestions." },
  { path: "/reports", label: "Reports", description: "Stock by lot, date, category, and compliance." },
] as const;
