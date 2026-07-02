const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const forbiddenMetadataKeyPattern = /(^|_)(access|public|refresh)?_?token$|secret|credential|password|api_?key/i;

export function assertUuid(value: string, label: string) {
  if (!uuidPattern.test(value)) {
    throw new Error(`${label} must be a valid UUID.`);
  }
}

export function assertNonEmptyString(value: string, label: string, maxLength: number) {
  if (!value || value.trim().length === 0) {
    throw new Error(`${label} is required.`);
  }
  if (value.length > maxLength) {
    throw new Error(`${label} exceeds the ${maxLength} character limit.`);
  }
}

export function assertSafeIntegrationMetadata(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return;

  const unsafePath = findUnsafeMetadataPath(metadata);
  if (unsafePath) {
    throw new Error(`Integration metadata must not contain secrets or provider tokens: ${unsafePath}.`);
  }
}

function findUnsafeMetadataPath(value: unknown, path = "metadata"): string | null {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const unsafePath = findUnsafeMetadataPath(value[index], `${path}[${index}]`);
      if (unsafePath) return unsafePath;
    }
    return null;
  }

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (forbiddenMetadataKeyPattern.test(key)) {
      return childPath;
    }

    const unsafePath = findUnsafeMetadataPath(child, childPath);
    if (unsafePath) return unsafePath;
  }

  return null;
}
