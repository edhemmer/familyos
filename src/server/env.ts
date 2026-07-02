type ServerEnvironmentSource = Record<string, string | undefined>;

export type ServerEnvironment = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseJwtSecret: string;
};

export function readServerEnvironment(source: ServerEnvironmentSource = getProcessEnv()): ServerEnvironment {
  assertNoBrowserRuntime();
  return {
    supabaseUrl: requireUrlEnv(source, "SUPABASE_URL"),
    supabaseServiceRoleKey: requireServerSecret(source, "SUPABASE_SERVICE_ROLE_KEY", 32),
    supabaseJwtSecret: requireServerSecret(source, "SUPABASE_JWT_SECRET", 32),
  };
}

export function assertNoBrowserRuntime() {
  if (typeof window !== "undefined") {
    throw new Error("Server-only integration code must not run in the browser.");
  }
}

function requireServerEnv(source: ServerEnvironmentSource, key: keyof ServerEnvironmentSource) {
  const value = source[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required server environment variable: ${String(key)}`);
  }
  return value.trim();
}

function requireUrlEnv(source: ServerEnvironmentSource, key: keyof ServerEnvironmentSource) {
  const value = requireServerEnv(source, key);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") {
      throw new Error("Server URL must use HTTPS.");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    throw new Error(`${String(key)} must be a valid HTTPS URL.`);
  }
}

function requireServerSecret(source: ServerEnvironmentSource, key: keyof ServerEnvironmentSource, minimumBytes: number) {
  const value = requireServerEnv(source, key);
  const byteLength = new TextEncoder().encode(value).byteLength;
  if (byteLength < minimumBytes) {
    throw new Error(`${String(key)} must be at least ${minimumBytes} bytes of secret material.`);
  }
  return value;
}

function getProcessEnv(): ServerEnvironmentSource {
  const candidate = globalThis as unknown as { process?: { env?: ServerEnvironmentSource } };
  return candidate.process?.env ?? {};
}
