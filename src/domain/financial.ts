export type FinancialTenantId = string;

export type FinancialAccountType = "depository" | "credit" | "loan" | "investment" | "real_estate" | "insurance" | "other";

export type FinancialAccountSubtype =
  | "checking"
  | "savings"
  | "money_market"
  | "credit_card"
  | "mortgage"
  | "auto_loan"
  | "student_loan"
  | "brokerage"
  | "retirement"
  | "property"
  | "policy"
  | "other";

export type FinancialTransactionDirection = "inflow" | "outflow" | "transfer";

export type FinancialTransactionReviewStatus = "unreviewed" | "reviewed" | "needs_review" | "excluded";

export type FinancialTransactionSource = "manual" | "provider" | "imported" | "system";

export type FinancialSyncStatus = "not_synced" | "syncing" | "synced" | "stale" | "error" | "removed";

export type FinancialConnectionStatus = "not_connected" | "connected" | "needs_attention" | "disconnected";

export type FinancialRecordStatus = "active" | "inactive" | "closed";

export type FinancialDataQualitySeverity = "low" | "medium" | "high" | "critical";

export type FinancialDataQualityEventType =
  | "stale_data"
  | "missing_source"
  | "duplicate_record"
  | "reconciliation_needed"
  | "low_confidence"
  | "sync_failure"
  | "manual_review";

export type FinancialDataQualityStatus = "open" | "resolved" | "ignored";

export type FinancialInstitution = {
  id: string;
  householdId: FinancialTenantId;
  provider: string;
  providerInstitutionId: string | null;
  name: string;
  connectionStatus: FinancialConnectionStatus;
  syncStatus: FinancialSyncStatus;
  lastSyncedAt: string | null;
  sourceSystem: string;
  sourceRecordId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type FinancialAccount = {
  id: string;
  householdId: FinancialTenantId;
  institutionId: string | null;
  providerAccountId: string | null;
  name: string;
  officialName: string | null;
  type: FinancialAccountType;
  subtype: FinancialAccountSubtype;
  mask: string | null;
  currency: string;
  status: FinancialRecordStatus;
  syncStatus: FinancialSyncStatus;
  lastSyncedAt: string | null;
  sourceSystem: string;
  sourceRecordId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type FinancialAccountBalance = {
  id: string;
  householdId: FinancialTenantId;
  accountId: string;
  availableBalance: number | null;
  currentBalance: number;
  limitAmount: number | null;
  currency: string;
  balanceAsOf: string;
  syncStatus: FinancialSyncStatus;
  lastSyncedAt: string | null;
  sourceSystem: string;
  sourceRecordId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type FinancialTransaction = {
  id: string;
  householdId: FinancialTenantId;
  accountId: string;
  institutionId: string | null;
  providerTransactionId: string | null;
  providerAccountId: string | null;
  transactionDate: string;
  postedDate: string | null;
  authorizedDate: string | null;
  description: string;
  merchantName: string | null;
  amount: number;
  currency: string;
  direction: FinancialTransactionDirection;
  categoryId: string | null;
  categoryName: string | null;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  pending: boolean;
  transfer: boolean;
  reviewStatus: FinancialTransactionReviewStatus;
  notes: string | null;
  source: FinancialTransactionSource;
  syncStatus: FinancialSyncStatus;
  lastSyncedAt: string | null;
  sourceSystem: string;
  sourceRecordId: string | null;
  removedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type FinancialCategory = {
  id: string;
  householdId: FinancialTenantId | null;
  name: string;
  parentCategoryId: string | null;
  categoryGroup: string | null;
  isSystem: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};

export type FinancialAuditLogEntry = {
  id: string;
  householdId: FinancialTenantId;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeSnapshot: Record<string, unknown> | null;
  afterSnapshot: Record<string, unknown> | null;
  sourceSystem: string;
  sourceRecordId: string | null;
  createdAt: string;
};

export type CreateFinancialAuditLogEntryInput = Omit<FinancialAuditLogEntry, "id" | "createdAt">;

export type FinancialDataQualityEvent = {
  id: string;
  householdId: FinancialTenantId;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  eventType: FinancialDataQualityEventType;
  severity: FinancialDataQualitySeverity;
  title: string;
  description: string | null;
  status: FinancialDataQualityStatus;
  detectedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  sourceSystem: string;
  sourceRecordId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
};
