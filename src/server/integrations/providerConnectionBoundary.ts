import type { IntegrationBoundaryResult, IntegrationProvider, IntegrationProviderConnection } from "../../domain/integration";
import { assertNoBrowserRuntime } from "../env";
import { assertCanManageIntegrations, type TenantMembershipReader } from "../tenantAuthorization";

export type CreateProviderConnectionPlaceholderInput = {
  householdId: string;
  userId: string;
  provider: IntegrationProvider;
  displayName: string;
};

export async function createProviderConnectionPlaceholder(
  reader: TenantMembershipReader,
  input: CreateProviderConnectionPlaceholderInput,
): Promise<IntegrationBoundaryResult<Pick<IntegrationProviderConnection, "householdId" | "provider" | "displayName" | "connectionStatus" | "tokenStorageStatus">>> {
  assertNoBrowserRuntime();
  await assertCanManageIntegrations(reader, input.householdId, input.userId);

  return {
    ok: true,
    data: {
      householdId: input.householdId,
      provider: input.provider,
      displayName: input.displayName.trim(),
      connectionStatus: "pending",
      tokenStorageStatus: "not_stored",
    },
  };
}

export async function exchangeProviderTokenPlaceholder(): Promise<IntegrationBoundaryResult<never>> {
  assertNoBrowserRuntime();
  return { ok: false, error: "Provider token exchange is intentionally not implemented in Milestone 3." };
}

export async function syncProviderTransactionsPlaceholder(): Promise<IntegrationBoundaryResult<never>> {
  assertNoBrowserRuntime();
  return { ok: false, error: "Provider transaction sync is intentionally not implemented in Milestone 3." };
}

export async function callOpenAiAdvisorPlaceholder(): Promise<IntegrationBoundaryResult<never>> {
  assertNoBrowserRuntime();
  return { ok: false, error: "OpenAI advisor calls are intentionally not implemented in Milestone 3." };
}
