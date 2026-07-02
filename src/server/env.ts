type ServerEnvironmentSource = Record<string, string | undefined>;

export type ServerEnvironment = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  supabaseJwtSecret: string;
};

export function readServerEnvironment(source: ServerEnvironmentSource = getProcessEnv()): ServerEnvironment {
  return {
    supabaseUrl: requireServerEnv(source, "SUPABASE_URL"),
    supabaseServiceRoleKey: requireServerEnv(source, "SUPABASE_SERVICE_ROLE_KEY"),
    supabaseJwtSecret: requireServerEnv(source, "SUPABASE_JWT_SECRET"),
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
  return value;
}

function getProcessEnv(): ServerEnvironmentSource {
  const candidate = globalThis as unknown as { process?: { env?: ServerEnvironmentSource } };
  return candidate.process?.env ?? {};
}
