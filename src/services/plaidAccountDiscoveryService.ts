import { supabase } from "../lib/supabase";

export type PlaidAccountDiscoveryResult = {
  status: "completed" | "blocked" | "failed" | "unauthorized";
  provider: "plaid";
  providerConnectionId: string;
  institutionsFound: number;
  accountsFound: number;
  balancesUpdated: number;
  dataQualityEventsCreated: number;
  requestId: string | null;
  message: string;
};

type PlaidAccountDiscoveryResponse = {
  status: PlaidAccountDiscoveryResult["status"];
  provider: "plaid";
  provider_connection_id: string;
  institutions_found: number;
  accounts_found: number;
  balances_updated: number;
  data_quality_events_created: number;
  request_id: string | null;
  message: string;
};

export async function discoverPlaidAccounts(tenantId: string, providerConnectionId: string): Promise<PlaidAccountDiscoveryResult> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Unable to read auth session: ${error.message}`);

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Authentication is required for Plaid account discovery.");

  const response = await fetch("/api/plaid-discover-accounts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ householdId: tenantId, providerConnectionId }),
  });

  if (!response.ok) {
    throw new Error(`Secure Plaid account discovery request failed: ${response.status}`);
  }

  const result = await response.json() as PlaidAccountDiscoveryResponse;
  return {
    status: result.status,
    provider: result.provider,
    providerConnectionId: result.provider_connection_id,
    institutionsFound: result.institutions_found,
    accountsFound: result.accounts_found,
    balancesUpdated: result.balances_updated,
    dataQualityEventsCreated: result.data_quality_events_created,
    requestId: result.request_id,
    message: result.message,
  };
}
