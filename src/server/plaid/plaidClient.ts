import { Configuration, CountryCode, PlaidApi, PlaidEnvironments, Products } from "plaid";
import { assertNoBrowserRuntime } from "../env";

type PlaidEnv = "sandbox" | "development" | "production";

type PlaidEnvironmentSource = Record<string, string | undefined>;

export type PlaidServerEnvironment = {
  clientId: string;
  secret: string;
  env: PlaidEnv;
};

export function readPlaidServerEnvironment(source: PlaidEnvironmentSource = getProcessEnv()): PlaidServerEnvironment {
  assertNoBrowserRuntime();
  return {
    clientId: requireServerEnv(source, "PLAID_CLIENT_ID"),
    secret: requireServerEnv(source, "PLAID_SECRET"),
    env: readPlaidEnv(source.PLAID_ENV),
  };
}

export function createPlaidServerClient(env: PlaidServerEnvironment = readPlaidServerEnvironment()) {
  assertNoBrowserRuntime();
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env.env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": env.clientId,
        "PLAID-SECRET": env.secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export const plaidSandboxProducts = [Products.Transactions];
export const plaidSandboxCountryCodes = [CountryCode.Us];

function readPlaidEnv(value: string | undefined): PlaidEnv {
  if (!value) return "sandbox";
  if (value === "sandbox" || value === "development" || value === "production") return value;
  throw new Error("PLAID_ENV must be sandbox, development, or production.");
}

function requireServerEnv(source: PlaidEnvironmentSource, key: string) {
  const value = source[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required Plaid server environment variable: ${key}`);
  }
  return value;
}

function getProcessEnv(): PlaidEnvironmentSource {
  const candidate = globalThis as unknown as { process?: { env?: PlaidEnvironmentSource } };
  return candidate.process?.env ?? {};
}
