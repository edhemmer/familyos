import { assertNoBrowserRuntime } from "../env";

const algorithm = "AES-GCM";
const keyVersion = "v1";
const ivByteLength = 12;

export type EncryptedTokenPayload = {
  ciphertext: string;
  iv: string;
  algorithm: typeof algorithm;
  keyVersion: typeof keyVersion;
};

export class TokenVaultConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenVaultConfigurationError";
  }
}

export async function encryptToken(plaintext: string): Promise<EncryptedTokenPayload> {
  assertNoBrowserRuntime();
  assertWebCryptoAvailable();
  if (!plaintext || plaintext.trim().length === 0) throw new Error("Token plaintext is required for encryption.");

  const key = await importTokenEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(ivByteLength));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: algorithm, iv }, key, encoded);

  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
    algorithm,
    keyVersion,
  };
}

export async function decryptToken(payload: EncryptedTokenPayload): Promise<string> {
  assertNoBrowserRuntime();
  assertWebCryptoAvailable();
  if (payload.algorithm !== algorithm) throw new Error(`Unsupported token encryption algorithm: ${payload.algorithm}`);
  if (payload.keyVersion !== keyVersion) throw new Error(`Unsupported token key version: ${payload.keyVersion}`);
  if (!payload.ciphertext || !payload.iv) throw new Error("Encrypted token payload is incomplete.");

  const key = await importTokenEncryptionKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: algorithm, iv: fromBase64(payload.iv) },
    key,
    fromBase64(payload.ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}

export function assertTokenVaultConfigured() {
  assertNoBrowserRuntime();
  assertWebCryptoAvailable();
  readTokenEncryptionKeyMaterial();
}

async function importTokenEncryptionKey() {
  const keyMaterial = readTokenEncryptionKeyMaterial();
  const raw = new TextEncoder().encode(keyMaterial);
  return crypto.subtle.importKey("raw", raw, algorithm, false, ["encrypt", "decrypt"]);
}

function readTokenEncryptionKeyMaterial() {
  const source = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  const value = source.TOKEN_ENCRYPTION_KEY?.trim();
  if (!value) {
    throw new TokenVaultConfigurationError("TOKEN_ENCRYPTION_KEY is required before persistent provider token storage is enabled.");
  }

  const byteLength = new TextEncoder().encode(value).byteLength;
  if (byteLength < 32) {
    throw new TokenVaultConfigurationError("TOKEN_ENCRYPTION_KEY must be at least 32 bytes of strong random secret material.");
  }

  // Rotation limitation: Milestone 5 supports a single key version only. Future rotation must add
  // multi-key decrypt support, re-encryption jobs, and audit events before changing keyVersion.
  return value;
}

function assertWebCryptoAvailable() {
  if (!globalThis.crypto?.subtle || typeof globalThis.crypto.getRandomValues !== "function") {
    throw new TokenVaultConfigurationError("Web Crypto API is required for token vault encryption.");
  }
}

function toBase64(value: Uint8Array) {
  let binary = "";
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
