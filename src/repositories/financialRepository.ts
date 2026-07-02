import { supabase } from "../lib/supabase";
import type { Json } from "../lib/supabase";
import type {
  CreateFinancialAuditLogEntryInput,
  FinancialAccount,
  FinancialAccountBalance,
  FinancialAuditLogEntry,
  FinancialCategory,
  FinancialDataQualityEvent,
  FinancialInstitution,
  FinancialTenantId,
  FinancialTransaction,
} from "../domain/financial";

function repositoryError(context: string, error: { message: string } | null) {
  return new Error(`${context}: ${error?.message ?? "Unknown Supabase error"}`);
}

export async function getFinancialInstitutions(householdId: FinancialTenantId): Promise<FinancialInstitution[]> {
  const { data, error } = await supabase.from("financial_institutions").select("*").eq("household_id", householdId).order("name", { ascending: true });
  if (error) throw repositoryError("Unable to load financial institutions", error);
  return (data ?? []).map(mapInstitution);
}

export async function getFinancialAccounts(householdId: FinancialTenantId): Promise<FinancialAccount[]> {
  const { data, error } = await supabase.from("financial_accounts").select("*").eq("household_id", householdId).order("name", { ascending: true });
  if (error) throw repositoryError("Unable to load financial accounts", error);
  return (data ?? []).map(mapAccount);
}

export async function getFinancialAccountBalances(householdId: FinancialTenantId): Promise<FinancialAccountBalance[]> {
  const { data, error } = await supabase
    .from("financial_account_balances")
    .select("*")
    .eq("household_id", householdId)
    .order("balance_as_of", { ascending: false });

  if (error) throw repositoryError("Unable to load financial account balances", error);
  return (data ?? []).map(mapBalance);
}

export async function getRecentFinancialTransactions(householdId: FinancialTenantId, limit = 25): Promise<FinancialTransaction[]> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .select("*")
    .eq("household_id", householdId)
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (error) throw repositoryError("Unable to load recent financial transactions", error);
  return (data ?? []).map(mapTransaction);
}

export async function getFinancialCategories(householdId: FinancialTenantId): Promise<FinancialCategory[]> {
  const { data, error } = await supabase
    .from("financial_categories")
    .select("*")
    .or(`household_id.eq.${householdId},household_id.is.null`)
    .order("sort_order", { ascending: true });

  if (error) throw repositoryError("Unable to load financial categories", error);
  return (data ?? []).map(mapCategory);
}

export async function getFinancialDataQualityEvents(householdId: FinancialTenantId): Promise<FinancialDataQualityEvent[]> {
  const { data, error } = await supabase
    .from("financial_data_quality_events")
    .select("*")
    .eq("household_id", householdId)
    .order("detected_at", { ascending: false });

  if (error) throw repositoryError("Unable to load financial data quality events", error);
  return (data ?? []).map(mapDataQualityEvent);
}

export async function createFinancialAuditLogEntry(input: CreateFinancialAuditLogEntryInput): Promise<FinancialAuditLogEntry> {
  const { data, error } = await supabase
    .from("financial_audit_log")
    .insert({
      household_id: input.householdId,
      actor_user_id: input.actorUserId,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      before_snapshot: input.beforeSnapshot as Json | null,
      after_snapshot: input.afterSnapshot as Json | null,
      source_system: input.sourceSystem,
      source_record_id: input.sourceRecordId,
    })
    .select("*")
    .single();

  if (error) throw repositoryError("Unable to create financial audit log entry", error);
  return mapAuditLogEntry(data);
}

function mapInstitution(row: Record<string, any>): FinancialInstitution {
  return {
    id: row.id,
    householdId: row.household_id,
    provider: row.provider,
    providerInstitutionId: row.provider_institution_id,
    name: row.name,
    connectionStatus: row.connection_status,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function mapAccount(row: Record<string, any>): FinancialAccount {
  return {
    id: row.id,
    householdId: row.household_id,
    institutionId: row.institution_id,
    providerAccountId: row.provider_account_id,
    name: row.name,
    officialName: row.official_name,
    type: row.account_type,
    subtype: row.account_subtype,
    mask: row.mask,
    currency: row.currency,
    status: row.status,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function mapBalance(row: Record<string, any>): FinancialAccountBalance {
  return {
    id: row.id,
    householdId: row.household_id,
    accountId: row.account_id,
    availableBalance: row.available_balance,
    currentBalance: row.current_balance,
    limitAmount: row.limit_amount,
    currency: row.currency,
    balanceAsOf: row.balance_as_of,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function mapTransaction(row: Record<string, any>): FinancialTransaction {
  return {
    id: row.id,
    householdId: row.household_id,
    accountId: row.account_id,
    institutionId: row.institution_id,
    providerTransactionId: row.provider_transaction_id,
    providerAccountId: row.provider_account_id,
    transactionDate: row.transaction_date,
    postedDate: row.posted_date,
    authorizedDate: row.authorized_date,
    description: row.description,
    merchantName: row.merchant_name,
    amount: row.amount,
    currency: row.currency,
    direction: row.direction,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categoryPrimary: row.category_primary,
    categoryDetailed: row.category_detailed,
    pending: row.pending,
    transfer: row.transfer,
    reviewStatus: row.review_status,
    notes: row.notes,
    source: row.source,
    syncStatus: row.sync_status,
    lastSyncedAt: row.last_synced_at,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    removedAt: row.removed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function mapCategory(row: Record<string, any>): FinancialCategory {
  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    parentCategoryId: row.parent_category_id,
    categoryGroup: row.category_group,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

function mapAuditLogEntry(row: Record<string, any>): FinancialAuditLogEntry {
  return {
    id: row.id,
    householdId: row.household_id,
    actorUserId: row.actor_user_id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    beforeSnapshot: row.before_snapshot,
    afterSnapshot: row.after_snapshot,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    createdAt: row.created_at,
  };
}

function mapDataQualityEvent(row: Record<string, any>): FinancialDataQualityEvent {
  return {
    id: row.id,
    householdId: row.household_id,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    eventType: row.event_type,
    severity: row.severity,
    title: row.title,
    description: row.description,
    status: row.status,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    sourceSystem: row.source_system,
    sourceRecordId: row.source_record_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
  };
}

