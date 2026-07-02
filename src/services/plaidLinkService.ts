import { supabase } from "../lib/supabase";

export type PlaidLinkTokenResult = {
  linkToken: string;
  expiration: string | null;
  requestId: string | null;
  environment: "sandbox";
};

export type PlaidExchangeResult = {
  status: "vaulting_required" | "connected";
  provider: "plaid";
  itemId: string | null;
  requestId: string | null;
  accessTokenStored: false;
};

async function postJson<TResponse>(url: string, body: Record<string, unknown>): Promise<TResponse> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(`Unable to read auth session: ${error.message}`);

  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error("Authentication is required for Plaid sandbox connection requests.");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Secure integration request failed: ${response.status}`);
  }

  return response.json() as Promise<TResponse>;
}

export async function createPlaidLinkToken(householdId: string): Promise<PlaidLinkTokenResult> {
  const result = await postJson<{ link_token: string; expiration: string | null; request_id: string | null; environment: "sandbox" }>(
    "/api/plaid-create-link-token",
    { householdId },
  );

  return {
    linkToken: result.link_token,
    expiration: result.expiration,
    requestId: result.request_id,
    environment: result.environment,
  };
}

export async function exchangePlaidPublicToken(householdId: string, publicToken: string): Promise<PlaidExchangeResult> {
  const result = await postJson<{ status: "vaulting_required"; provider: "plaid"; item_id: string | null; request_id: string | null; access_token_stored: false }>(
    "/api/plaid-exchange-public-token",
    { householdId, publicToken },
  );

  return {
    status: result.status,
    provider: result.provider,
    itemId: result.item_id,
    requestId: result.request_id,
    accessTokenStored: result.access_token_stored,
  };
}
