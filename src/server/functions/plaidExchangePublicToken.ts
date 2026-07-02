import { createAuthenticatedFunction, type AuthenticatedFunctionRequest } from "../authenticatedFunction";
import { createPlaidServerClient } from "../plaid/plaidClient";
import { assertCanManageIntegrations, type TenantMembershipReader } from "../tenantAuthorization";
import { noopIntegrationAuditWriter, type IntegrationAuditWriter } from "../integrations/integrationAudit";

export type PlaidExchangePublicTokenRequest = AuthenticatedFunctionRequest & {
  body: {
    householdId: string;
    publicToken: string;
  };
};

export type PlaidExchangePublicTokenResponse = {
  status: "vaulting_required";
  provider: "plaid";
  item_id: string | null;
  request_id: string | null;
  access_token_stored: false;
};

export function buildPlaidExchangePublicTokenFunction(dependencies: {
  membershipReader: TenantMembershipReader;
  auditWriter?: IntegrationAuditWriter;
}) {
  const auditWriter = dependencies.auditWriter ?? noopIntegrationAuditWriter;

  return createAuthenticatedFunction<PlaidExchangePublicTokenRequest, PlaidExchangePublicTokenResponse>(async ({ request, context }) => {
    const { householdId, publicToken } = request.body;
    await assertCanManageIntegrations(dependencies.membershipReader, householdId, context.userId);

    const plaid = createPlaidServerClient();
    const response = await plaid.itemPublicTokenExchange({ public_token: publicToken });

    // Milestone 4 proof only: the access token is deliberately not persisted and never returned.
    const itemId = response.data.item_id ?? null;
    const requestId = response.data.request_id ?? null;

    await auditWriter.writeIntegrationAuditEvent({
      householdId,
      actorUserId: context.userId,
      provider: "plaid",
      action: "token_exchange_blocked",
      severity: "warning",
      message: "Plaid public token exchange succeeded, but persistent access-token storage is blocked until secure vaulting exists.",
      metadata: { itemId, requestId, accessTokenStored: false },
    });

    return {
      status: "vaulting_required",
      provider: "plaid",
      item_id: itemId,
      request_id: requestId,
      access_token_stored: false,
    };
  });
}
