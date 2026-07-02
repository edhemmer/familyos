import { createAuthenticatedFunction, type AuthenticatedFunctionRequest } from "../authenticatedFunction";
import { noopIntegrationAuditWriter, type IntegrationAuditWriter } from "../integrations/integrationAudit";
import { assertNonEmptyString, assertUuid } from "../integrations/integrationSecurity";
import { plaidSandboxCountryCodes, createPlaidServerClient } from "../plaid/plaidClient";
import { mapPlaidAccount } from "../plaid/plaidAccountMapping";
import type { PlaidAccountDiscoveryRepository } from "../repositories/plaidAccountDiscoveryRepository";
import { getPlaidAccessTokenForConnection } from "../tokenVault/plaidTokenVault";
import { assertCanManageIntegrations, type TenantMembershipReader } from "../tenantAuthorization";

type PlaidAccountDiscoveryStatus = "completed" | "blocked" | "failed" | "unauthorized";

export type PlaidDiscoverAccountsRequest = AuthenticatedFunctionRequest & {
  body: {
    householdId: string;
    providerConnectionId: string;
  };
};

export type PlaidDiscoverAccountsResponse = {
  status: PlaidAccountDiscoveryStatus;
  provider: "plaid";
  provider_connection_id: string;
  institutions_found: number;
  accounts_found: number;
  balances_updated: number;
  data_quality_events_created: number;
  request_id: string | null;
  message: string;
};

export function buildPlaidDiscoverAccountsFunction(dependencies: {
  membershipReader: TenantMembershipReader;
  repository: PlaidAccountDiscoveryRepository;
  auditWriter?: IntegrationAuditWriter;
}) {
  const auditWriter = dependencies.auditWriter ?? noopIntegrationAuditWriter;

  return createAuthenticatedFunction<PlaidDiscoverAccountsRequest, PlaidDiscoverAccountsResponse>(async ({ request, context }) => {
    const { householdId, providerConnectionId } = request.body;
    assertUuid(householdId, "householdId");
    assertUuid(providerConnectionId, "providerConnectionId");
    assertNonEmptyString(providerConnectionId, "providerConnectionId", 64);

    try {
      await assertCanManageIntegrations(dependencies.membershipReader, householdId, context.userId);
    } catch {
      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "account_discovery_failed",
        severity: "warning",
        message: "Plaid account discovery denied because the user is not authorized to manage integrations for this household.",
      });

      return emptyDiscoveryResponse("unauthorized", providerConnectionId, "Current user cannot manage Plaid connections for this household.");
    }

    await auditWriter.writeIntegrationAuditEvent({
      householdId,
      providerConnectionId,
      actorUserId: context.userId,
      provider: "plaid",
      action: "account_discovery_started",
      severity: "info",
      message: "Plaid account discovery started from a vaulted server-side token.",
    });

    try {
      const connection = await dependencies.repository.getProviderConnection({ householdId, providerConnectionId });
      if (!connection || connection.connectionStatus !== "connected" || connection.tokenStorageStatus !== "vaulted") {
        await dependencies.repository.createDataQualityEvent({
          householdId,
          relatedEntityType: "integration_provider_connection",
          relatedEntityId: providerConnectionId,
          eventType: "missing_source",
          severity: "high",
          title: "Plaid provider connection is not ready for account discovery",
          description: "Account discovery requires a connected Plaid provider connection with vaulted token storage.",
          actorUserId: context.userId,
          sourceRecordId: providerConnectionId,
        });

        await auditWriter.writeIntegrationAuditEvent({
          householdId,
          providerConnectionId,
          actorUserId: context.userId,
          provider: "plaid",
          action: "account_discovery_failed",
          severity: "warning",
          message: "Plaid account discovery blocked because the provider connection is not connected and vaulted.",
        });

        return {
          ...emptyDiscoveryResponse("blocked", providerConnectionId, "Provider connection must be connected and vaulted before account discovery."),
          data_quality_events_created: 1,
        };
      }

      const accessToken = await getPlaidAccessTokenForConnection({
        getActiveProviderToken: (input) => dependencies.repository.getActiveProviderToken({ householdId, providerConnectionId: input.providerConnectionId }),
        markProviderTokenUsed: dependencies.repository.markProviderTokenUsed,
      }, providerConnectionId);

      const plaid = createPlaidServerClient();
      const accountsResponse = await plaid.accountsGet({ access_token: accessToken });
      const accounts = accountsResponse.data.accounts.map(mapPlaidAccount);
      const item = accountsResponse.data.item;
      const requestId = accountsResponse.data.request_id ?? null;
      const providerInstitutionId = item.institution_id ?? null;
      const institutionName = await readInstitutionName(plaid, providerInstitutionId);
      const syncedAt = new Date().toISOString();

      let institutionId: string | null = null;
      let institutionsFound = 0;
      let dataQualityEventsCreated = 0;

      if (providerInstitutionId && institutionName) {
        const institution = await dependencies.repository.upsertInstitution({
          householdId,
          providerInstitutionId,
          name: institutionName,
          actorUserId: context.userId,
          syncedAt,
        });
        institutionId = institution.id;
        institutionsFound = 1;

        await dependencies.repository.createFinancialAudit({
          householdId,
          actorUserId: context.userId,
          action: institution.created ? "institution_discovered" : "institution_updated",
          entityType: "financial_institution",
          entityId: institution.id,
          afterSnapshot: { provider: "plaid", providerInstitutionId, name: institutionName },
          sourceRecordId: providerInstitutionId,
        });
      } else {
        dataQualityEventsCreated += 1;
        await dependencies.repository.createDataQualityEvent({
          householdId,
          relatedEntityType: "integration_provider_connection",
          relatedEntityId: providerConnectionId,
          eventType: "missing_source",
          severity: "medium",
          title: "Plaid institution mapping is incomplete",
          description: "Plaid account discovery returned accounts without complete institution metadata.",
          actorUserId: context.userId,
          sourceRecordId: providerInstitutionId ?? providerConnectionId,
        });
      }

      let accountsFound = 0;
      let balancesUpdated = 0;

      for (const account of accounts) {
        if (!account.providerAccountId || !account.name || account.currentBalance === null) {
          dataQualityEventsCreated += 1;
          await dependencies.repository.createDataQualityEvent({
            householdId,
            relatedEntityType: "financial_account",
            eventType: "missing_source",
            severity: "medium",
            title: "Plaid account is missing expected fields",
            description: "A Plaid account was skipped because it lacked account ID, name, or current balance.",
            actorUserId: context.userId,
            sourceRecordId: account.providerAccountId || null,
          });
          continue;
        }

        const currency = account.currency ?? "USD";
        if (!account.currency) {
          dataQualityEventsCreated += 1;
          await dependencies.repository.createDataQualityEvent({
            householdId,
            relatedEntityType: "financial_account",
            eventType: "missing_source",
            severity: "low",
            title: "Plaid account currency is missing",
            description: "Plaid did not return a currency code for this account. Family Office OS used USD as a temporary fallback.",
            actorUserId: context.userId,
            sourceRecordId: account.providerAccountId,
          });
        }

        const persistedAccount = await dependencies.repository.upsertAccount({
          householdId,
          institutionId,
          providerAccountId: account.providerAccountId,
          name: account.name,
          officialName: account.officialName,
          accountType: account.accountType,
          accountSubtype: account.accountSubtype,
          mask: account.mask,
          currency,
          actorUserId: context.userId,
          syncedAt,
        });
        accountsFound += 1;

        await dependencies.repository.createFinancialAudit({
          householdId,
          actorUserId: context.userId,
          action: persistedAccount.created ? "account_discovered" : "account_updated",
          entityType: "financial_account",
          entityId: persistedAccount.id,
          afterSnapshot: { provider: "plaid", providerAccountId: account.providerAccountId, name: account.name, type: account.accountType, subtype: account.accountSubtype },
          sourceRecordId: account.providerAccountId,
        });

        const persistedBalance = await dependencies.repository.upsertBalance({
          householdId,
          accountId: persistedAccount.id,
          providerAccountId: account.providerAccountId,
          availableBalance: account.availableBalance,
          currentBalance: account.currentBalance,
          limitAmount: account.limitAmount,
          currency,
          actorUserId: context.userId,
          syncedAt,
        });
        balancesUpdated += 1;

        await dependencies.repository.createFinancialAudit({
          householdId,
          actorUserId: context.userId,
          action: persistedBalance.created ? "balance_discovered" : "balance_updated",
          entityType: "financial_account_balance",
          entityId: persistedBalance.id,
          afterSnapshot: { provider: "plaid", providerAccountId: account.providerAccountId, currentBalance: account.currentBalance, currency },
          sourceRecordId: `${account.providerAccountId}:latest`,
        });
      }

      await dependencies.repository.updateProviderConnectionAfterDiscovery({
        householdId,
        providerConnectionId,
        providerItemId: item.item_id ?? null,
        providerInstitutionId,
        providerInstitutionName: institutionName,
        syncedAt,
        actorUserId: context.userId,
      });

      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "account_discovery_completed",
        severity: "info",
        message: "Plaid account discovery completed and safe account metadata was persisted.",
        metadata: { requestId, institutionsFound, accountsFound, balancesUpdated, dataQualityEventsCreated },
      });

      return {
        status: "completed",
        provider: "plaid",
        provider_connection_id: providerConnectionId,
        institutions_found: institutionsFound,
        accounts_found: accountsFound,
        balances_updated: balancesUpdated,
        data_quality_events_created: dataQualityEventsCreated,
        request_id: requestId,
        message: "Plaid account metadata and latest balances were discovered. Transaction sync is not active.",
      };
    } catch (error) {
      await dependencies.repository.createDataQualityEvent({
        householdId,
        relatedEntityType: "integration_provider_connection",
        relatedEntityId: providerConnectionId,
        eventType: "sync_failure",
        severity: "high",
        title: "Plaid account discovery failed",
        description: error instanceof Error ? error.message : "Unknown Plaid account discovery error.",
        actorUserId: context.userId,
        sourceRecordId: providerConnectionId,
      });

      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "account_discovery_failed",
        severity: "error",
        message: "Plaid account discovery failed. No tokens were exposed to the browser.",
      });

      return {
        ...emptyDiscoveryResponse("failed", providerConnectionId, "Plaid account discovery failed. Review data quality events and server logs."),
        data_quality_events_created: 1,
      };
    }
  });
}

function emptyDiscoveryResponse(status: PlaidAccountDiscoveryStatus, providerConnectionId: string, message: string): PlaidDiscoverAccountsResponse {
  return {
    status,
    provider: "plaid",
    provider_connection_id: providerConnectionId,
    institutions_found: 0,
    accounts_found: 0,
    balances_updated: 0,
    data_quality_events_created: 0,
    request_id: null,
    message,
  };
}

async function readInstitutionName(plaid: ReturnType<typeof createPlaidServerClient>, providerInstitutionId: string | null) {
  if (!providerInstitutionId) return null;

  try {
    const response = await plaid.institutionsGetById({
      institution_id: providerInstitutionId,
      country_codes: plaidSandboxCountryCodes,
    });
    return response.data.institution.name ?? null;
  } catch {
    return null;
  }
}
