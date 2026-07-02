import { decryptToken, type EncryptedTokenPayload } from "./tokenVault";
import { assertNoBrowserRuntime } from "../env";

export type ProviderTokenVaultReader = {
  getActiveProviderToken(input: { providerConnectionId: string }): Promise<EncryptedTokenPayload | null>;
  markProviderTokenUsed?(input: { providerConnectionId: string }): Promise<void>;
};

export async function getPlaidAccessTokenForConnection(reader: ProviderTokenVaultReader, providerConnectionId: string): Promise<string> {
  assertNoBrowserRuntime();
  const encrypted = await reader.getActiveProviderToken({ providerConnectionId });
  if (!encrypted) {
    throw new Error("No active encrypted Plaid token exists for this provider connection.");
  }

  const token = await decryptToken(encrypted);
  await reader.markProviderTokenUsed?.({ providerConnectionId });
  return token;
}
