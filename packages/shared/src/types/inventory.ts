import type { ComplianceStatus } from "../enums/compliance-status";

export type InventoryLotSummary = {
  chemicalCode: string;
  lotNo: string;
  availableQuantity: number;
  inboundDate: string;
  expiryDate?: string;
  complianceStatus: ComplianceStatus;
};
