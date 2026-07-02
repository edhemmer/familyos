import { supabase } from "../lib/supabase";

export type PlaidTransactionSyncResult = {
  status: "completed" | "blocked" | "failed" | "unauthorized";
  provider: "plaid";
  providerConnectionId: string;
  addedCount: number;
  modifiedCount: number;
  removedCount: number;
  warningsCount: number;
  cursorStored: boolean;
  requestId: string | null;
  message: string;
};

type PlaidTransactionSyncResponse = {
  status: PlaidTransactionSyncResult["status"];
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

export async function syncPlaidTransactions(tenantId: string, providerConnectionId: string): Promise<PlaidTransactionSyncResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Unable to read auth session: ${error.message}`);

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Authentication is required for Plaid transaction sync.");

  const response = await fetch("/api/plaid-sync-transactions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ householdId: tenantId, providerConnectionId }),
  });

  if (!response.ok) {
    throw new Error(`Secure Plaid transaction sync request failed: ${response.status}`);
  }

  const result = await response.json() as PlaidTransactionSyncResponse;
  return {
    status: result.status,
    provider: result.provider,
    providerConnectionId: result.provider_connection_id,
    addedCount: result.added_count,
    modifiedCount: result.modified_count,
    removedCount: result.removed_count,
    warningsCount: result.warnings_count,
    cursorStored: result.cursor_stored,
    requestId: result.request_id,
    message: result.message,
  };
}
