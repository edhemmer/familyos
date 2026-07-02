import { createAuthenticatedFunction, type AuthenticatedFunctionRequest } from "../authenticatedFunction";
import { createPlaidServerClient } from "../plaid/plaidClient";
import { assertCanManageIntegrations, type TenantMembershipReader } from "../tenantAuthorization";
import { noopIntegrationAuditWriter, type IntegrationAuditWriter } from "../integrations/integrationAudit";
import { type ProviderTokenVaultStore } from "../integrations/providerConnectionStore";
import { assertNonEmptyString, assertUuid } from "../integrations/integrationSecurity";
import { encryptToken, TokenVaultConfigurationError } from "../tokenVault/tokenVault";

export type PlaidExchangePublicTokenRequest = AuthenticatedFunctionRequest & {
  body: {
    householdId: string;
    providerConnectionId: string;
    publicToken: string;
  };
};

export type PlaidExchangePublicTokenResponse = {
  status: "connected" | "vaulting_required" | "vaulting_failed" | "unauthorized";
  provider: "plaid";
  item_id: string | null;
  request_id: string | null;
  access_token_stored: boolean;
};

export function buildPlaidExchangePublicTokenFunction(dependencies: {
  membershipReader: TenantMembershipReader;
  tokenVaultStore: ProviderTokenVaultStore;
  auditWriter?: IntegrationAuditWriter;
}) {
  const auditWriter = dependencies.auditWriter ?? noopIntegrationAuditWriter;

  return createAuthenticatedFunction<PlaidExchangePublicTokenRequest, PlaidExchangePublicTokenResponse>(async ({ request, context }) => {
    const { householdId, providerConnectionId, publicToken } = request.body;
    assertUuid(householdId, "householdId");
    assertUuid(providerConnectionId, "providerConnectionId");
    assertNonEmptyString(publicToken, "publicToken", 2048);

    try {
      await assertCanManageIntegrations(dependencies.membershipReader, householdId, context.userId);
    } catch {
      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "authorization_checked",
        severity: "warning",
        message: "Plaid public token exchange denied because the user is not authorized for this household.",
      });
      return { status: "unauthorized", provider: "plaid", item_id: null, request_id: null, access_token_stored: false };
    }

    const plaid = createPlaidServerClient();
    const response = await plaid.itemPublicTokenExchange({ public_token: publicToken });
    const itemId = response.data.item_id ?? null;
    const requestId = response.data.request_id ?? null;

    try {
      const encryptedToken = await encryptToken(response.data.access_token);
      await dependencies.tokenVaultStore.storeEncryptedProviderToken({
        householdId,
        providerConnectionId,
        provider: "plaid",
        providerItemId: itemId,
        tokenStorageStatus: "vaulted",
        actorUserId: context.userId,
        encryptedToken,
      });

      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "token_vaulted",
        severity: "info",
        message: "Plaid public token exchange succeeded and encrypted access-token storage completed.",
        metadata: { itemId, requestId, keyVersion: encryptedToken.keyVersion, algorithm: encryptedToken.algorithm },
      });

      return { status: "connected", provider: "plaid", item_id: itemId, request_id: requestId, access_token_stored: true };
    } catch (vaultError) {
      const status = vaultError instanceof TokenVaultConfigurationError ? "vaulting_required" : "vaulting_failed";
      await dependencies.tokenVaultStore.updateProviderConnectionTokenStatus({
        householdId,
        providerConnectionId,
        provider: "plaid",
        providerItemId: itemId,
        tokenStorageStatus: status === "vaulting_required" ? "server_vault_required" : "vaulting_failed",
        actorUserId: context.userId,
      });

      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: status === "vaulting_required" ? "token_exchange_blocked" : "token_vaulting_failed",
        severity: "warning",
        message: status === "vaulting_required"
          ? "Plaid public token exchange succeeded, but TOKEN_ENCRYPTION_KEY is not configured strongly enough for persistent storage. Access token was discarded."
          : "Plaid public token exchange succeeded, but encrypted token vault storage failed. Access token was discarded.",
        metadata: { itemId, requestId, accessTokenStored: false },
      });

      return { status, provider: "plaid", item_id: itemId, request_id: requestId, access_token_stored: false };
    }
  });
}
