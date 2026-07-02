export type IntegrationProvider = "plaid" | "manual" | "file_import" | "other";

export type IntegrationProviderEnvironment = "sandbox" | "development" | "production";

export type IntegrationConnectionStatus = "not_connected" | "pending" | "connected" | "needs_attention" | "disconnected" | "disabled";

export type IntegrationSyncStatus = "not_started" | "ready" | "syncing" | "stale" | "error";

export type IntegrationTokenStorageStatus = "not_stored" | "server_vault_required";

export type IntegrationAuditAction =
  | "connection_placeholder_created"
  | "connection_placeholder_updated"
  | "authorization_checked"
  | "provider_call_blocked"
  | "token_exchange_blocked"
  | "sync_blocked";

export type IntegrationAuditSeverity = "info" | "warning" | "error";

export type IntegrationProviderConnection = {
  id: string;
  householdId: string;
  provider: IntegrationProvider;
  providerEnvironment: IntegrationProviderEnvironment;
  displayName: string;
  externalConnectionId: string | null;
  providerItemId: string | null;
  providerInstitutionId: string | null;
  providerInstitutionName: string | null;
  connectionStatus: IntegrationConnectionStatus;
  syncStatus: IntegrationSyncStatus;
  tokenStorageStatus: IntegrationTokenStorageStatus;
  lastHealthCheckAt: string | null;
  lastSyncedAt: string | null;
  metadata: Record<string, unknown>;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationAuditLogEntry = {
  id: string;
  householdId: string;
  providerConnectionId: string | null;
  actorUserId: string;
  provider: IntegrationProvider | null;
  action: IntegrationAuditAction;
  severity: IntegrationAuditSeverity;
  message: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type IntegrationBoundaryResult<T> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: string;
};

