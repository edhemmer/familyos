import { createAuthenticatedFunction, type AuthenticatedFunctionRequest } from "../authenticatedFunction";
import { noopIntegrationAuditWriter, type IntegrationAuditWriter } from "../integrations/integrationAudit";
import { assertNonEmptyString, assertUuid } from "../integrations/integrationSecurity";
import { createPlaidServerClient } from "../plaid/plaidClient";
import { mapPlaidTransaction } from "../plaid/plaidTransactionMapping";
import type { PlaidTransactionSyncRepository } from "../repositories/plaidTransactionSyncRepository";
import { getPlaidAccessTokenForConnection } from "../tokenVault/plaidTokenVault";
import { assertCanManageIntegrations, type TenantMembershipReader } from "../tenantAuthorization";

type PlaidTransactionSyncStatus = "completed" | "blocked" | "failed" | "unauthorized";

type PlaidSyncTransactionLike = Parameters<typeof mapPlaidTransaction>[0];
type PlaidRemovedTransactionLike = { transaction_id: string };

export type PlaidSyncTransactionsRequest = AuthenticatedFunctionRequest & {
  body: {
    householdId: string;
    providerConnectionId: string;
  };
};

export type PlaidSyncTransactionsResponse = {
  status: PlaidTransactionSyncStatus;
  provider: "plaid";
  provider_connection_id: string;
  added_count: number;
  modified_count: number;
  removed_count: number;
  warnings_count: number;
  cursor_stored: boolean;
  request_id: string | null;
  message: string;
};

export function buildPlaidSyncTransactionsFunction(dependencies: {
  membershipReader: TenantMembershipReader;
  repository: PlaidTransactionSyncRepository;
  auditWriter?: IntegrationAuditWriter;
}) {
  const auditWriter = dependencies.auditWriter ?? noopIntegrationAuditWriter;

  return createAuthenticatedFunction<PlaidSyncTransactionsRequest, PlaidSyncTransactionsResponse>(async ({ request, context }) => {
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
        action: "transaction_sync_failed",
        severity: "warning",
        message: "Plaid transaction sync denied because the user is not authorized to manage financial integrations for this household.",
      });
      return emptySyncResponse("unauthorized", providerConnectionId, "Current user cannot sync Plaid transactions for this household.");
    }

    const startedAt = new Date().toISOString();
    await auditWriter.writeIntegrationAuditEvent({
      householdId,
      providerConnectionId,
      actorUserId: context.userId,
      provider: "plaid",
      action: "transaction_sync_started",
      severity: "info",
      message: "Plaid transaction sync started from a vaulted server-side token.",
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
          title: "Plaid provider connection is not ready for transaction sync",
          description: "Transaction sync requires a connected Plaid provider connection with vaulted token storage.",
          actorUserId: context.userId,
          sourceRecordId: providerConnectionId,
        });
        return {
          ...emptySyncResponse("blocked", providerConnectionId, "Provider connection must be connected and vaulted before transaction sync."),
          warnings_count: 1,
        };
      }

      await dependencies.repository.markSyncStarted({ householdId, providerConnectionId, actorUserId: context.userId, startedAt });
      const syncState = await dependencies.repository.getSyncState({ householdId, providerConnectionId });
      const accessToken = await getPlaidAccessTokenForConnection({
        getActiveProviderToken: (input) => dependencies.repository.getActiveProviderToken({ householdId, providerConnectionId: input.providerConnectionId }),
        markProviderTokenUsed: dependencies.repository.markProviderTokenUsed,
      }, providerConnectionId);

      const plaid = createPlaidServerClient();
      let cursor = syncState?.cursor ?? undefined;
      let hasMore = true;
      let requestId: string | null = null;
      const added: PlaidSyncTransactionLike[] = [];
      const modified: PlaidSyncTransactionLike[] = [];
      const removed: PlaidRemovedTransactionLike[] = [];

      while (hasMore) {
        const response = await plaid.transactionsSync({
          access_token: accessToken,
          cursor,
          count: 500,
        });

        requestId = response.data.request_id ?? requestId;
        added.push(...response.data.added as PlaidSyncTransactionLike[]);
        modified.push(...response.data.modified as PlaidSyncTransactionLike[]);
        removed.push(...response.data.removed as PlaidRemovedTransactionLike[]);
        cursor = response.data.next_cursor;
        hasMore = response.data.has_more;
      }

      const syncedAt = new Date().toISOString();
      let addedCount = 0;
      let modifiedCount = 0;
      let removedCount = 0;
      let warningsCount = 0;

      for (const transaction of added) {
        const result = await persistPlaidTransaction({
          transaction,
          mode: "added",
          householdId,
          actorUserId: context.userId,
          syncedAt,
          repository: dependencies.repository,
        });
        if (result.persisted) addedCount += 1;
        warningsCount += result.warnings;
      }

      for (const transaction of modified) {
        const result = await persistPlaidTransaction({
          transaction,
          mode: "modified",
          householdId,
          actorUserId: context.userId,
          syncedAt,
          repository: dependencies.repository,
        });
        if (result.persisted) modifiedCount += 1;
        warningsCount += result.warnings;
      }

      for (const transaction of removed) {
        if (!transaction.transaction_id) {
          warningsCount += 1;
          await dependencies.repository.createDataQualityEvent({
            householdId,
            eventType: "missing_source",
            severity: "medium",
            title: "Plaid removed transaction missing transaction ID",
            description: "A removed transaction event was skipped because Plaid did not include a transaction ID.",
            actorUserId: context.userId,
          });
          continue;
        }

        const removal = await dependencies.repository.markTransactionRemoved({
          householdId,
          providerTransactionId: transaction.transaction_id,
          actorUserId: context.userId,
          removedAt: syncedAt,
        });

        if (removal.removed && removal.id) {
          removedCount += 1;
          await dependencies.repository.createFinancialAudit({
            householdId,
            actorUserId: context.userId,
            action: "transaction_removed",
            entityType: "financial_transaction",
            entityId: removal.id,
            afterSnapshot: { provider: "plaid", providerTransactionId: transaction.transaction_id, removedAt: syncedAt },
            sourceRecordId: transaction.transaction_id,
          });
        } else {
          warningsCount += 1;
          await dependencies.repository.createDataQualityEvent({
            householdId,
            eventType: "missing_source",
            severity: "low",
            title: "Plaid removed transaction was not found locally",
            description: "Plaid reported a removed transaction that has not been stored in Family Office OS.",
            actorUserId: context.userId,
            sourceRecordId: transaction.transaction_id,
          });
        }
      }

      if (!cursor) {
        throw new Error("Plaid transactions/sync completed without returning a cursor.");
      }

      await dependencies.repository.markSyncCompleted({ householdId, providerConnectionId, cursor, completedAt: syncedAt, actorUserId: context.userId });
      await dependencies.repository.createFinancialAudit({
        householdId,
        actorUserId: context.userId,
        action: "transaction_sync_cursor_updated",
        entityType: "plaid_transaction_sync_state",
        entityId: providerConnectionId,
        afterSnapshot: { provider: "plaid", cursorStored: true, addedCount, modifiedCount, removedCount },
        sourceRecordId: providerConnectionId,
      });

      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "transaction_sync_completed",
        severity: warningsCount > 0 ? "warning" : "info",
        message: "Plaid transaction sync completed. Browser received only a safe summary.",
        metadata: { requestId, addedCount, modifiedCount, removedCount, warningsCount, cursorStored: true },
      });

      return {
        status: "completed",
        provider: "plaid",
        provider_connection_id: providerConnectionId,
        added_count: addedCount,
        modified_count: modifiedCount,
        removed_count: removedCount,
        warnings_count: warningsCount,
        cursor_stored: true,
        request_id: requestId,
        message: "Plaid transactions were synced server-side. Dashboard/reporting are not wired to this data yet.",
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Plaid transaction sync error.";
      const requiresRelink = /ITEM_LOGIN_REQUIRED|INVALID_ACCESS_TOKEN|access token/i.test(message);
      await dependencies.repository.markSyncFailed({
        householdId,
        providerConnectionId,
        failedAt: new Date().toISOString(),
        errorCode: requiresRelink ? "requires_relink" : null,
        errorMessage: message,
        actorUserId: context.userId,
        requiresRelink,
      });
      await dependencies.repository.createDataQualityEvent({
        householdId,
        relatedEntityType: "integration_provider_connection",
        relatedEntityId: providerConnectionId,
        eventType: "sync_failure",
        severity: requiresRelink ? "critical" : "high",
        title: requiresRelink ? "Plaid transaction sync requires relink" : "Plaid transaction sync failed",
        description: message,
        actorUserId: context.userId,
        sourceRecordId: providerConnectionId,
      });
      await auditWriter.writeIntegrationAuditEvent({
        householdId,
        providerConnectionId,
        actorUserId: context.userId,
        provider: "plaid",
        action: "transaction_sync_failed",
        severity: "error",
        message: "Plaid transaction sync failed. No tokens were exposed to the browser.",
      });

      return {
        ...emptySyncResponse("failed", providerConnectionId, requiresRelink ? "Plaid requires relink before transactions can sync." : "Plaid transaction sync failed. Review data quality events and server logs."),
        warnings_count: 1,
      };
    }
  });
}

async function persistPlaidTransaction(input: {
  transaction: PlaidSyncTransactionLike;
  mode: "added" | "modified";
  householdId: string;
  actorUserId: string;
  syncedAt: string;
  repository: PlaidTransactionSyncRepository;
}) {
  const mapped = mapPlaidTransaction(input.transaction);
  let warnings = 0;

  if (!mapped.providerTransactionId || !mapped.providerAccountId || !mapped.transactionDate || mapped.amount === null || Number.isNaN(mapped.amount)) {
    await input.repository.createDataQualityEvent({
      householdId: input.householdId,
      eventType: "missing_source",
      severity: "medium",
      title: "Plaid transaction missing required source fields",
      description: "A Plaid transaction was skipped because it lacked transaction ID, account ID, date, or amount.",
      actorUserId: input.actorUserId,
      sourceRecordId: mapped.providerTransactionId || null,
    });
    return { persisted: false, warnings: warnings + 1 };
  }

  const account = await input.repository.getAccountByProviderAccountId({
    householdId: input.householdId,
    providerAccountId: mapped.providerAccountId,
  });

  if (!account) {
    await input.repository.createDataQualityEvent({
      householdId: input.householdId,
      eventType: "missing_source",
      severity: "high",
      title: "Plaid transaction skipped because account mapping is missing",
      description: "Run account discovery before transaction sync or repair the missing Plaid account mapping.",
      actorUserId: input.actorUserId,
      sourceRecordId: mapped.providerAccountId,
    });
    return { persisted: false, warnings: warnings + 1 };
  }

  const currency = mapped.currency ?? "USD";
  if (!mapped.currency) {
    warnings += 1;
    await input.repository.createDataQualityEvent({
      householdId: input.householdId,
      relatedEntityType: "financial_account",
      relatedEntityId: account.id,
      eventType: "missing_source",
      severity: "low",
      title: "Plaid transaction currency is missing",
      description: "Plaid did not return a currency code for this transaction. Family Office OS used USD as a temporary fallback.",
      actorUserId: input.actorUserId,
      sourceRecordId: mapped.providerTransactionId,
    });
  } else if (mapped.currency !== "USD") {
    warnings += 1;
    await input.repository.createDataQualityEvent({
      householdId: input.householdId,
      relatedEntityType: "financial_account",
      relatedEntityId: account.id,
      eventType: "manual_review",
      severity: "medium",
      title: "Plaid transaction uses non-USD currency",
      description: "The transaction currency was preserved from Plaid and should be reviewed before reporting.",
      actorUserId: input.actorUserId,
      sourceRecordId: mapped.providerTransactionId,
    });
  }

  const persisted = await input.repository.upsertTransaction({
    householdId: input.householdId,
    accountId: account.id,
    institutionId: account.institutionId,
    providerAccountId: mapped.providerAccountId,
    providerTransactionId: mapped.providerTransactionId,
    transactionDate: mapped.transactionDate,
    postedDate: mapped.postedDate,
    authorizedDate: mapped.authorizedDate,
    description: mapped.description,
    merchantName: mapped.merchantName,
    amount: mapped.amount,
    currency,
    direction: mapped.direction,
    pending: mapped.pending,
    transfer: mapped.transfer,
    categoryPrimary: mapped.categoryPrimary,
    categoryDetailed: mapped.categoryDetailed,
    reviewStatus: mapped.pending ? "needs_review" : "unreviewed",
    actorUserId: input.actorUserId,
    syncedAt: input.syncedAt,
  });

  await input.repository.createFinancialAudit({
    householdId: input.householdId,
    actorUserId: input.actorUserId,
    action: input.mode === "added" && persisted.created ? "transaction_added" : "transaction_modified",
    entityType: "financial_transaction",
    entityId: persisted.id,
    afterSnapshot: {
      provider: "plaid",
      providerTransactionId: mapped.providerTransactionId,
      providerAccountId: mapped.providerAccountId,
      amount: mapped.amount,
      currency,
      pending: mapped.pending,
      transfer: mapped.transfer,
      reviewStatusPreserved: persisted.previousReviewStatus === "reviewed" || persisted.previousReviewStatus === "excluded",
    },
    sourceRecordId: mapped.providerTransactionId,
  });

  return { persisted: true, warnings };
}

function emptySyncResponse(status: PlaidTransactionSyncStatus, providerConnectionId: string, message: string): PlaidSyncTransactionsResponse {
  return {
    status,
    provider: "plaid",
    provider_connection_id: providerConnectionId,
    added_count: 0,
    modified_count: 0,
    removed_count: 0,
    warnings_count: 0,
    cursor_stored: false,
    request_id: null,
    message,
  };
}
