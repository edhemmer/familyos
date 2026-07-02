import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../lib/supabase";
import type { FinancialTransactionDirection, FinancialTransactionReviewStatus } from "../../domain/financial";
import type { EncryptedTokenPayload } from "../tokenVault/tokenVault";

type ServerSupabaseClient = SupabaseClient<Database>;

export type ProviderConnectionForTransactionSync = {
  id: string;
  householdId: string;
  connectionStatus: string;
  tokenStorageStatus: string;
};

export type FinancialAccountForTransactionSync = {
  id: string;
  institutionId: string | null;
  providerAccountId: string;
};

export type PlaidTransactionSyncState = {
  cursor: string | null;
  status: "idle" | "syncing" | "completed" | "failed" | "requires_relink";
};

export type UpsertTransactionInput = {
  householdId: string;
  accountId: string;
  institutionId: string | null;
  providerAccountId: string;
  providerTransactionId: string;
  transactionDate: string;
  postedDate: string | null;
  authorizedDate: string | null;
  description: string;
  merchantName: string | null;
  amount: number;
  currency: string;
  direction: FinancialTransactionDirection;
  pending: boolean;
  transfer: boolean;
  categoryPrimary: string | null;
  categoryDetailed: string | null;
  reviewStatus: FinancialTransactionReviewStatus;
  actorUserId: string;
  syncedAt: string;
};

export type DataQualityEventInput = {
  householdId: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  eventType: "missing_source" | "duplicate_record" | "sync_failure" | "manual_review";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description?: string | null;
  actorUserId: string;
  sourceRecordId?: string | null;
};

export type FinancialAuditInput = {
  householdId: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  afterSnapshot?: Record<string, unknown> | null;
  sourceRecordId?: string | null;
};

export type PlaidTransactionSyncRepository = {
  getProviderConnection(input: { householdId: string; providerConnectionId: string }): Promise<ProviderConnectionForTransactionSync | null>;
  getActiveProviderToken(input: { householdId: string; providerConnectionId: string }): Promise<EncryptedTokenPayload | null>;
  markProviderTokenUsed(input: { providerConnectionId: string }): Promise<void>;
  getSyncState(input: { householdId: string; providerConnectionId: string }): Promise<PlaidTransactionSyncState | null>;
  markSyncStarted(input: { householdId: string; providerConnectionId: string; actorUserId: string; startedAt: string }): Promise<void>;
  markSyncCompleted(input: { householdId: string; providerConnectionId: string; cursor: string; completedAt: string; actorUserId: string }): Promise<void>;
  markSyncFailed(input: { householdId: string; providerConnectionId: string; failedAt: string; errorCode: string | null; errorMessage: string; actorUserId: string; requiresRelink: boolean }): Promise<void>;
  getAccountByProviderAccountId(input: { householdId: string; providerAccountId: string }): Promise<FinancialAccountForTransactionSync | null>;
  upsertTransaction(input: UpsertTransactionInput): Promise<{ id: string; created: boolean; previousReviewStatus: FinancialTransactionReviewStatus | null }>;
  markTransactionRemoved(input: { householdId: string; providerTransactionId: string; actorUserId: string; removedAt: string }): Promise<{ id: string | null; removed: boolean }>;
  createFinancialAudit(input: FinancialAuditInput): Promise<void>;
  createDataQualityEvent(input: DataQualityEventInput): Promise<void>;
};

export function createSupabasePlaidTransactionSyncRepository(client: ServerSupabaseClient): PlaidTransactionSyncRepository {
  return {
    async getProviderConnection(input) {
      const { data, error } = await client
        .from("integration_provider_connections")
        .select("id, household_id, connection_status, token_storage_status")
        .eq("id", input.providerConnectionId)
        .eq("household_id", input.householdId)
        .eq("provider", "plaid")
        .maybeSingle();

      if (error) throw new Error(`Unable to load provider connection: ${error.message}`);
      if (!data) return null;
      return {
        id: data.id,
        householdId: data.household_id,
        connectionStatus: data.connection_status,
        tokenStorageStatus: data.token_storage_status,
      };
    },

    async getActiveProviderToken(input) {
      const { data, error } = await client
        .from("provider_token_vault")
        .select("token_ciphertext, token_iv, token_algorithm, key_version")
        .eq("household_id", input.householdId)
        .eq("provider_connection_id", input.providerConnectionId)
        .eq("provider", "plaid")
        .eq("status", "active")
        .maybeSingle();

      if (error) throw new Error(`Unable to load provider token vault row: ${error.message}`);
      if (!data) return null;

      return {
        ciphertext: data.token_ciphertext,
        iv: data.token_iv,
        algorithm: data.token_algorithm,
        keyVersion: data.key_version,
      };
    },

    async markProviderTokenUsed(input) {
      const { error } = await client
        .from("provider_token_vault")
        .update({ last_used_at: new Date().toISOString() })
        .eq("provider_connection_id", input.providerConnectionId)
        .eq("provider", "plaid")
        .eq("status", "active");

      if (error) throw new Error(`Unable to mark provider token used: ${error.message}`);
    },

    async getSyncState(input) {
      const { data, error } = await client
        .from("plaid_transaction_sync_state")
        .select("cursor, status")
        .eq("household_id", input.householdId)
        .eq("provider_connection_id", input.providerConnectionId)
        .maybeSingle();

      if (error) throw new Error(`Unable to load Plaid transaction sync state: ${error.message}`);
      if (!data) return null;
      return { cursor: data.cursor, status: data.status };
    },

    async markSyncStarted(input) {
      const { error } = await client
        .from("plaid_transaction_sync_state")
        .upsert({
          household_id: input.householdId,
          provider_connection_id: input.providerConnectionId,
          status: "syncing",
          last_started_at: input.startedAt,
          last_error_code: null,
          last_error_message: null,
        }, { onConflict: "provider_connection_id" });

      if (error) throw new Error(`Unable to mark Plaid transaction sync started: ${error.message}`);
    },

    async markSyncCompleted(input) {
      const { error } = await client
        .from("plaid_transaction_sync_state")
        .update({
          cursor: input.cursor,
          status: "completed",
          last_completed_at: input.completedAt,
          last_error_code: null,
          last_error_message: null,
        })
        .eq("household_id", input.householdId)
        .eq("provider_connection_id", input.providerConnectionId);

      if (error) throw new Error(`Unable to mark Plaid transaction sync completed: ${error.message}`);
    },

    async markSyncFailed(input) {
      const { error } = await client
        .from("plaid_transaction_sync_state")
        .upsert({
          household_id: input.householdId,
          provider_connection_id: input.providerConnectionId,
          status: input.requiresRelink ? "requires_relink" : "failed",
          last_failed_at: input.failedAt,
          last_error_code: input.errorCode,
          last_error_message: input.errorMessage,
        }, { onConflict: "provider_connection_id" });

      if (error) throw new Error(`Unable to mark Plaid transaction sync failed: ${error.message}`);
    },

    async getAccountByProviderAccountId(input) {
      const { data, error } = await client
        .from("financial_accounts")
        .select("id, institution_id, provider_account_id")
        .eq("household_id", input.householdId)
        .eq("source_system", "plaid")
        .eq("provider_account_id", input.providerAccountId)
        .maybeSingle();

      if (error) throw new Error(`Unable to map Plaid account to financial account: ${error.message}`);
      if (!data?.provider_account_id) return null;
      return { id: data.id, institutionId: data.institution_id, providerAccountId: data.provider_account_id };
    },

    async upsertTransaction(input) {
      const existing = await client
        .from("financial_transactions")
        .select("id, review_status")
        .eq("household_id", input.householdId)
        .eq("source_system", "plaid")
        .eq("provider_transaction_id", input.providerTransactionId)
        .maybeSingle();

      if (existing.error) throw new Error(`Unable to check Plaid transaction: ${existing.error.message}`);
      const existingReviewStatus = existing.data?.review_status ?? null;
      const reviewStatus = existingReviewStatus === "reviewed" || existingReviewStatus === "excluded"
        ? existingReviewStatus
        : input.reviewStatus;

      const { data, error } = await client
        .from("financial_transactions")
        .upsert({
          household_id: input.householdId,
          account_id: input.accountId,
          institution_id: input.institutionId,
          provider_transaction_id: input.providerTransactionId,
          provider_account_id: input.providerAccountId,
          transaction_date: input.transactionDate,
          posted_date: input.postedDate,
          authorized_date: input.authorizedDate,
          description: input.description,
          merchant_name: input.merchantName,
          amount: input.amount,
          currency: input.currency,
          direction: input.direction,
          category_primary: input.categoryPrimary,
          category_detailed: input.categoryDetailed,
          pending: input.pending,
          transfer: input.transfer,
          review_status: reviewStatus,
          source: "provider",
          sync_status: "synced",
          last_synced_at: input.syncedAt,
          source_system: "plaid",
          source_record_id: input.providerTransactionId,
          removed_at: null,
          created_by: input.actorUserId,
          updated_by: input.actorUserId,
        }, { onConflict: "household_id,source_system,provider_transaction_id" })
        .select("id")
        .single();

      if (error) throw new Error(`Unable to upsert Plaid transaction: ${error.message}`);
      return { id: data.id, created: !existing.data, previousReviewStatus: existingReviewStatus };
    },

    async markTransactionRemoved(input) {
      const existing = await client
        .from("financial_transactions")
        .select("id")
        .eq("household_id", input.householdId)
        .eq("source_system", "plaid")
        .eq("provider_transaction_id", input.providerTransactionId)
        .maybeSingle();

      if (existing.error) throw new Error(`Unable to check removed Plaid transaction: ${existing.error.message}`);
      if (!existing.data) return { id: null, removed: false };

      const { error } = await client
        .from("financial_transactions")
        .update({
          sync_status: "removed",
          removed_at: input.removedAt,
          updated_by: input.actorUserId,
          last_synced_at: input.removedAt,
        })
        .eq("id", existing.data.id)
        .eq("household_id", input.householdId);

      if (error) throw new Error(`Unable to mark Plaid transaction removed: ${error.message}`);
      return { id: existing.data.id, removed: true };
    },

    async createFinancialAudit(input) {
      const { error } = await client.from("financial_audit_log").insert({
        household_id: input.householdId,
        actor_user_id: input.actorUserId,
        action: input.action,
        entity_type: input.entityType,
        entity_id: input.entityId,
        before_snapshot: null,
        after_snapshot: input.afterSnapshot as Json | null,
        source_system: "plaid",
        source_record_id: input.sourceRecordId ?? null,
      });

      if (error) throw new Error(`Unable to write financial audit log: ${error.message}`);
    },

    async createDataQualityEvent(input) {
      const { error } = await client.from("financial_data_quality_events").insert({
        household_id: input.householdId,
        related_entity_type: input.relatedEntityType ?? null,
        related_entity_id: input.relatedEntityId ?? null,
        event_type: input.eventType,
        severity: input.severity,
        title: input.title,
        description: input.description ?? null,
        status: "open",
        source_system: "plaid",
        source_record_id: input.sourceRecordId ?? null,
        created_by: input.actorUserId,
        updated_by: input.actorUserId,
      });

      if (error) throw new Error(`Unable to write financial data quality event: ${error.message}`);
    },
  };
}
