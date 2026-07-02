import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "../../lib/supabase";
import type { FinancialAccountSubtype, FinancialAccountType } from "../../domain/financial";
import type { IntegrationTokenStorageStatus } from "../../domain/integration";
import type { EncryptedTokenPayload } from "../tokenVault/tokenVault";

type ServerSupabaseClient = SupabaseClient<Database>;

export type ProviderConnectionForDiscovery = {
  id: string;
  householdId: string;
  provider: "plaid";
  connectionStatus: string;
  tokenStorageStatus: IntegrationTokenStorageStatus;
  providerItemId: string | null;
};

export type UpsertInstitutionInput = {
  householdId: string;
  providerInstitutionId: string;
  name: string;
  actorUserId: string;
  syncedAt: string;
};

export type UpsertAccountInput = {
  householdId: string;
  institutionId: string | null;
  providerAccountId: string;
  name: string;
  officialName: string | null;
  accountType: FinancialAccountType;
  accountSubtype: FinancialAccountSubtype;
  mask: string | null;
  currency: string;
  actorUserId: string;
  syncedAt: string;
};

export type UpsertBalanceInput = {
  householdId: string;
  accountId: string;
  providerAccountId: string;
  availableBalance: number | null;
  currentBalance: number;
  limitAmount: number | null;
  currency: string;
  actorUserId: string;
  syncedAt: string;
};

export type DataQualityEventInput = {
  householdId: string;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  eventType: "missing_source" | "sync_failure" | "manual_review";
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

export type PlaidAccountDiscoveryRepository = {
  getProviderConnection(input: { householdId: string; providerConnectionId: string }): Promise<ProviderConnectionForDiscovery | null>;
  getActiveProviderToken(input: { householdId: string; providerConnectionId: string }): Promise<EncryptedTokenPayload | null>;
  markProviderTokenUsed(input: { providerConnectionId: string }): Promise<void>;
  upsertInstitution(input: UpsertInstitutionInput): Promise<{ id: string; created: boolean }>;
  upsertAccount(input: UpsertAccountInput): Promise<{ id: string; created: boolean }>;
  upsertBalance(input: UpsertBalanceInput): Promise<{ id: string; created: boolean }>;
  updateProviderConnectionAfterDiscovery(input: { householdId: string; providerConnectionId: string; providerItemId: string | null; providerInstitutionId: string | null; providerInstitutionName: string | null; syncedAt: string; actorUserId: string }): Promise<void>;
  createFinancialAudit(input: FinancialAuditInput): Promise<void>;
  createDataQualityEvent(input: DataQualityEventInput): Promise<void>;
};

export function createSupabasePlaidAccountDiscoveryRepository(client: ServerSupabaseClient): PlaidAccountDiscoveryRepository {
  return {
    async getProviderConnection(input) {
      const { data, error } = await client
        .from("integration_provider_connections")
        .select("id, household_id, provider, connection_status, token_storage_status, provider_item_id")
        .eq("id", input.providerConnectionId)
        .eq("household_id", input.householdId)
        .eq("provider", "plaid")
        .maybeSingle();

      if (error) throw new Error(`Unable to load provider connection: ${error.message}`);
      if (!data) return null;

      return {
        id: data.id,
        householdId: data.household_id,
        provider: "plaid",
        connectionStatus: data.connection_status,
        tokenStorageStatus: data.token_storage_status,
        providerItemId: data.provider_item_id,
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

    async upsertInstitution(input) {
      const existing = await client
        .from("financial_institutions")
        .select("id")
        .eq("household_id", input.householdId)
        .eq("provider", "plaid")
        .eq("provider_institution_id", input.providerInstitutionId)
        .maybeSingle();

      if (existing.error) throw new Error(`Unable to check institution: ${existing.error.message}`);

      const { data, error } = await client
        .from("financial_institutions")
        .upsert({
          household_id: input.householdId,
          provider: "plaid",
          provider_institution_id: input.providerInstitutionId,
          name: input.name,
          connection_status: "connected",
          sync_status: "synced",
          last_synced_at: input.syncedAt,
          source_system: "plaid",
          source_record_id: input.providerInstitutionId,
          created_by: input.actorUserId,
          updated_by: input.actorUserId,
        }, { onConflict: "household_id,provider,provider_institution_id" })
        .select("id")
        .single();

      if (error) throw new Error(`Unable to upsert Plaid institution: ${error.message}`);
      return { id: data.id, created: !existing.data };
    },

    async upsertAccount(input) {
      const existing = await client
        .from("financial_accounts")
        .select("id")
        .eq("household_id", input.householdId)
        .eq("source_system", "plaid")
        .eq("provider_account_id", input.providerAccountId)
        .maybeSingle();

      if (existing.error) throw new Error(`Unable to check account: ${existing.error.message}`);

      const { data, error } = await client
        .from("financial_accounts")
        .upsert({
          household_id: input.householdId,
          institution_id: input.institutionId,
          provider_account_id: input.providerAccountId,
          name: input.name,
          official_name: input.officialName,
          account_type: input.accountType,
          account_subtype: input.accountSubtype,
          mask: input.mask,
          currency: input.currency,
          status: "active",
          sync_status: "synced",
          last_synced_at: input.syncedAt,
          source_system: "plaid",
          source_record_id: input.providerAccountId,
          created_by: input.actorUserId,
          updated_by: input.actorUserId,
        }, { onConflict: "household_id,source_system,provider_account_id" })
        .select("id")
        .single();

      if (error) throw new Error(`Unable to upsert Plaid account: ${error.message}`);
      return { id: data.id, created: !existing.data };
    },

    async upsertBalance(input) {
      const sourceRecordId = `${input.providerAccountId}:latest`;
      const existing = await client
        .from("financial_account_balances")
        .select("id")
        .eq("household_id", input.householdId)
        .eq("account_id", input.accountId)
        .eq("source_system", "plaid")
        .eq("source_record_id", sourceRecordId)
        .maybeSingle();

      if (existing.error) throw new Error(`Unable to check account balance: ${existing.error.message}`);

      const { data, error } = await client
        .from("financial_account_balances")
        .upsert({
          household_id: input.householdId,
          account_id: input.accountId,
          available_balance: input.availableBalance,
          current_balance: input.currentBalance,
          limit_amount: input.limitAmount,
          currency: input.currency,
          balance_as_of: input.syncedAt,
          sync_status: "synced",
          last_synced_at: input.syncedAt,
          source_system: "plaid",
          source_record_id: sourceRecordId,
          created_by: input.actorUserId,
          updated_by: input.actorUserId,
        }, { onConflict: "household_id,account_id,source_system,source_record_id" })
        .select("id")
        .single();

      if (error) throw new Error(`Unable to upsert Plaid balance: ${error.message}`);
      return { id: data.id, created: !existing.data };
    },

    async updateProviderConnectionAfterDiscovery(input) {
      const { error } = await client
        .from("integration_provider_connections")
        .update({
          provider_item_id: input.providerItemId,
          provider_institution_id: input.providerInstitutionId,
          provider_institution_name: input.providerInstitutionName,
          connection_status: "connected",
          sync_status: "ready",
          last_health_check_at: input.syncedAt,
          last_synced_at: input.syncedAt,
          updated_by: input.actorUserId,
        })
        .eq("id", input.providerConnectionId)
        .eq("household_id", input.householdId)
        .eq("provider", "plaid");

      if (error) throw new Error(`Unable to update provider connection after discovery: ${error.message}`);
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
