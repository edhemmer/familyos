import type { IntegrationAuditAction, IntegrationAuditSeverity, IntegrationProvider } from "../../domain/integration";

export type IntegrationAuditWriter = {
  writeIntegrationAuditEvent(input: {
    householdId: string;
    actorUserId: string;
    providerConnectionId?: string | null;
    provider?: IntegrationProvider | null;
    action: IntegrationAuditAction;
    severity: IntegrationAuditSeverity;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
};

export const noopIntegrationAuditWriter: IntegrationAuditWriter = {
  async writeIntegrationAuditEvent() {
    return;
  },
};
