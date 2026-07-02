import { assertNoBrowserRuntime, readServerEnvironment } from "./env";

export type AuthenticatedFunctionRequest = {
  headers: Record<string, string | undefined>;
  body?: unknown;
};

export type AuthenticatedFunctionContext = {
  userId: string;
  accessToken: string;
  requestId: string;
};

export type AuthenticatedFunctionHandler<TRequest extends AuthenticatedFunctionRequest, TResult> = (input: {
  request: TRequest;
  context: AuthenticatedFunctionContext;
}) => Promise<TResult>;

export function createAuthenticatedFunction<TRequest extends AuthenticatedFunctionRequest, TResult>(
  handler: AuthenticatedFunctionHandler<TRequest, TResult>,
) {
  return async function authenticatedFunction(request: TRequest): Promise<TResult> {
    assertNoBrowserRuntime();
    readServerEnvironment();

    const accessToken = readBearerToken(request.headers.authorization ?? request.headers.Authorization);
    const context = await verifyAccessTokenPlaceholder(accessToken);
    return handler({ request, context });
  };
}

function readBearerToken(header: string | undefined) {
  if (!header?.startsWith("Bearer ")) {
    throw new Error("Missing bearer token.");
  }
  return header.slice("Bearer ".length).trim();
}

async function verifyAccessTokenPlaceholder(accessToken: string): Promise<AuthenticatedFunctionContext> {
  if (!accessToken) {
    throw new Error("Missing access token.");
  }

  throw new Error("Access token verification is a server-only placeholder. Wire this to Supabase Auth verification before enabling integrations.");
}
