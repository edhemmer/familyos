import { createAuthenticatedFunction, type AuthenticatedFunctionRequest } from "../authenticatedFunction";
import { plaidSandboxCountryCodes, plaidSandboxProducts, createPlaidServerClient } from "../plaid/plaidClient";
import { assertActiveTenantMember, type TenantMembershipReader } from "../tenantAuthorization";
import { noopIntegrationAuditWriter, type IntegrationAuditWriter } from "../integrations/integrationAudit";

export type PlaidCreateLinkTokenRequest = AuthenticatedFunctionRequest & {
  body: {
    householdId: string;
  };
};

export type PlaidCreateLinkTokenResponse = {
  link_token: string;
  expiration: string | null;
  request_id: string | null;
  environment: "sandbox";
};

export function buildPlaidCreateLinkTokenFunction(dependencies: {
  membershipReader: TenantMembershipReader;
  auditWriter?: IntegrationAuditWriter;
}) {
  const auditWriter = dependencies.auditWriter ?? noopIntegrationAuditWriter;

  return createAuthenticatedFunction<PlaidCreateLinkTokenRequest, PlaidCreateLinkTokenResponse>(async ({ request, context }) => {
    const householdId = request.body.householdId;
    await assertActiveTenantMember(dependencies.membershipReader, householdId, context.userId);

    const plaid = createPlaidServerClient();
    const response = await plaid.linkTokenCreate({
      user: { client_user_id: context.userId },
      client_name: "Family Office OS Sandbox",
      products: plaidSandboxProducts,
      country_codes: plaidSandboxCountryCodes,
      language: "en",
      webhook: undefined,
    });

    await auditWriter.writeIntegrationAuditEvent({
      householdId,
      actorUserId: context.userId,
      provider: "plaid",
      action: "authorization_checked",
      severity: "info",
      message: "Plaid sandbox link token created. No provider token was stored or returned.",
      metadata: { requestId: response.data.request_id ?? null },
    });

    return {
      link_token: response.data.link_token,
      expiration: response.data.expiration ?? null,
      request_id: response.data.request_id ?? null,
      environment: "sandbox",
    };
  });
}
