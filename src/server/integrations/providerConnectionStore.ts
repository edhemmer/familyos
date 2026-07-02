import type { EncryptedTokenPayload } from "../tokenVault/tokenVault";
import type { IntegrationTokenStorageStatus } from "../../domain/integration";

export type ProviderConnectionTokenMetadata = {
  householdId: string;
  providerConnectionId: string;
  provider: "plaid";
  providerItemId: string | null;
  tokenStorageStatus: IntegrationTokenStorageStatus;
  actorUserId: string;
};

export type ProviderTokenVaultStore = {
  storeEncryptedProviderToken(input: ProviderConnectionTokenMetadata & { encryptedToken: EncryptedTokenPayload }): Promise<void>;
  updateProviderConnectionTokenStatus(input: ProviderConnectionTokenMetadata): Promise<void>;
};
