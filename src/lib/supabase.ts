import { createClient } from "@supabase/supabase-js";
import type { Household, HouseholdMembership, Profile } from "../domain/identity";
import type {
  IntegrationAuditAction,
  IntegrationAuditSeverity,
  IntegrationConnectionStatus,
  IntegrationProvider,
  IntegrationProviderEnvironment,
  IntegrationSyncStatus,
  IntegrationTokenStorageStatus,
} from "../domain/integration";
import type {
  FinancialAccountSubtype,
  FinancialAccountType,
  FinancialConnectionStatus,
  FinancialDataQualityEventType,
  FinancialDataQualitySeverity,
  FinancialDataQualityStatus,
  FinancialRecordStatus,
  FinancialSyncStatus,
  FinancialTransactionDirection,
  FinancialTransactionReviewStatus,
  FinancialTransactionSource,
} from "../domain/financial";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type FinancialInstitutionRow = {
  id: string;
  household_id: string;
  provider: string;
  provider_institution_id: string | null;
  name: string;
  connection_status: FinancialConnectionStatus;
  sync_status: FinancialSyncStatus;
  last_synced_at: string | null;
  source_system: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type FinancialAccountRow = {
  id: string;
  household_id: string;
  institution_id: string | null;
  provider_account_id: string | null;
  name: string;
  official_name: string | null;
  account_type: FinancialAccountType;
  account_subtype: FinancialAccountSubtype;
  mask: string | null;
  currency: string;
  status: FinancialRecordStatus;
  sync_status: FinancialSyncStatus;
  last_synced_at: string | null;
  source_system: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type FinancialAccountBalanceRow = {
  id: string;
  household_id: string;
  account_id: string;
  available_balance: number | null;
  current_balance: number;
  limit_amount: number | null;
  currency: string;
  balance_as_of: string;
  sync_status: FinancialSyncStatus;
  last_synced_at: string | null;
  source_system: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type FinancialTransactionRow = {
  id: string;
  household_id: string;
  account_id: string;
  institution_id: string | null;
  provider_transaction_id: string | null;
  transaction_date: string;
  posted_date: string | null;
  description: string;
  merchant_name: string | null;
  amount: number;
  currency: string;
  direction: FinancialTransactionDirection;
  category_id: string | null;
  category_name: string | null;
  pending: boolean;
  transfer: boolean;
  review_status: FinancialTransactionReviewStatus;
  notes: string | null;
  source: FinancialTransactionSource;
  sync_status: FinancialSyncStatus;
  last_synced_at: string | null;
  source_system: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type FinancialCategoryRow = {
  id: string;
  household_id: string | null;
  name: string;
  parent_category_id: string | null;
  category_group: string | null;
  is_system: boolean;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};

type FinancialAuditLogRow = {
  id: string;
  household_id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_snapshot: Json | null;
  after_snapshot: Json | null;
  source_system: string;
  source_record_id: string | null;
  created_at: string;
};

type FinancialDataQualityEventRow = {
  id: string;
  household_id: string;
  related_entity_type: string | null;
  related_entity_id: string | null;
  event_type: FinancialDataQualityEventType;
  severity: FinancialDataQualitySeverity;
  title: string;
  description: string | null;
  status: FinancialDataQualityStatus;
  detected_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  source_system: string;
  source_record_id: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
};


type IntegrationProviderConnectionRow = {
  id: string;
  household_id: string;
  provider: IntegrationProvider;
  provider_environment: IntegrationProviderEnvironment;
  display_name: string;
  external_connection_id: string | null;
  provider_item_id: string | null;
  provider_institution_id: string | null;
  provider_institution_name: string | null;
  connection_status: IntegrationConnectionStatus;
  sync_status: IntegrationSyncStatus;
  token_storage_status: IntegrationTokenStorageStatus;
  last_health_check_at: string | null;
  last_synced_at: string | null;
  metadata: Json;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type IntegrationAuditLogRow = {
  id: string;
  household_id: string;
  provider_connection_id: string | null;
  actor_user_id: string;
  provider: IntegrationProvider | null;
  action: IntegrationAuditAction;
  severity: IntegrationAuditSeverity;
  message: string;
  metadata: Json;
  created_at: string;
};

type ProviderTokenVaultRow = {
  id: string;
  household_id: string;
  provider_connection_id: string;
  provider: "plaid";
  token_ciphertext: string;
  token_iv: string;
  token_algorithm: "AES-GCM";
  key_version: "v1";
  status: "active" | "revoked" | "rotation_required";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};

type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, { id: string; email?: string | null; display_name?: string | null }, { email?: string | null; display_name?: string | null; updated_at?: string }>;
      households: Table<Household, { id?: string; name: string; created_by: string; created_at?: string; updated_at?: string }, { name?: string; updated_at?: string }>;
      household_memberships: Table<
        HouseholdMembership,
        { id?: string; household_id: string; user_id: string; role: HouseholdMembership["role"]; status: HouseholdMembership["status"]; created_at?: string; updated_at?: string },
        { role?: HouseholdMembership["role"]; status?: HouseholdMembership["status"]; updated_at?: string }
      >;
      financial_institutions: Table<FinancialInstitutionRow, Insert<FinancialInstitutionRow>, Update<FinancialInstitutionRow>>;
      financial_accounts: Table<FinancialAccountRow, Insert<FinancialAccountRow>, Update<FinancialAccountRow>>;
      financial_account_balances: Table<FinancialAccountBalanceRow, Insert<FinancialAccountBalanceRow>, Update<FinancialAccountBalanceRow>>;
      financial_transactions: Table<FinancialTransactionRow, Insert<FinancialTransactionRow>, Update<FinancialTransactionRow>>;
      financial_categories: Table<FinancialCategoryRow, Insert<FinancialCategoryRow>, Update<FinancialCategoryRow>>;
      financial_audit_log: Table<FinancialAuditLogRow, Insert<FinancialAuditLogRow>, never>;
      financial_data_quality_events: Table<FinancialDataQualityEventRow, Insert<FinancialDataQualityEventRow>, Update<FinancialDataQualityEventRow>>;
      integration_provider_connections: Table<IntegrationProviderConnectionRow, Insert<IntegrationProviderConnectionRow>, Update<IntegrationProviderConnectionRow>>;
      integration_audit_log: Table<IntegrationAuditLogRow, Insert<IntegrationAuditLogRow>, never>;
      provider_token_vault: Table<ProviderTokenVaultRow, Insert<ProviderTokenVaultRow>, Update<ProviderTokenVaultRow>>;
    };
    Views: Record<string, never>;
    Functions: {
      create_household_with_owner: {
        Args: { household_name: string };
        Returns: Household;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, Json>;
  };
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleLeak = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local .env file.");
}

if (serviceRoleLeak) {
  throw new Error("VITE_SUPABASE_SERVICE_ROLE_KEY must never be exposed to browser code.");
}

const parsedSupabaseUrl = new URL(supabaseUrl);
if (parsedSupabaseUrl.protocol !== "https:") {
  throw new Error("VITE_SUPABASE_URL must be a HTTPS Supabase project URL.");
}

export const supabase = createClient<Database>(parsedSupabaseUrl.toString().replace(/\/$/, ""), supabaseAnonKey.trim(), {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});



