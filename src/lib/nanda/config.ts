// Env-driven configuration for NANDA publishing. See docs/prd.md §13.

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

const publicBaseUrl = stripTrailingSlash(
  process.env.NANDA_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
);

export const nandaConfig = {
  /** Master switch — when false, publish/registry surfaces report disabled. */
  enabled: process.env.NANDA_ENABLED !== 'false',
  /** Public sandbox runtime switch (kill switch). */
  runtimeEnabled: process.env.NANDA_RUNTIME_ENABLED !== 'false',

  /** Canonical public origin, e.g. https://agentos.app */
  publicBaseUrl,
  /** What the NANDA Index points `registry_url` at. */
  registryBaseUrl: stripTrailingSlash(
    process.env.NANDA_REGISTRY_BASE_URL || `${publicBaseUrl}/api/nanda`
  ),
  /** NANDA Index API base. */
  indexApiUrl: stripTrailingSlash(
    process.env.NANDA_INDEX_API_URL || 'https://api.nandaindex.org'
  ),

  orgDomain: process.env.NANDA_ORG_DOMAIN || 'agentos.app',
  orgId: process.env.NANDA_ORG_ID || '',
  providerName: process.env.NANDA_PROVIDER_NAME || 'Paramarsh Labs',

  // Optional external nanda-registry mirror.
  externalRegistryUrl: process.env.NANDA_EXTERNAL_REGISTRY_URL
    ? stripTrailingSlash(process.env.NANDA_EXTERNAL_REGISTRY_URL)
    : '',
  externalRegistryJwt: process.env.NANDA_EXTERNAL_REGISTRY_JWT || '',
} as const;

/** Build the canonical NANDA locator URN for an agent slug. */
export function buildLocator(slug: string): string {
  return `urn:ai:domain:${nandaConfig.orgDomain}:agent:${slug}`;
}

/** Parse a `urn:ai:domain:<domain>:agent:<slug>` locator. */
export function parseLocator(
  locator: string
): { domain: string; slug: string } | null {
  const m = locator.match(/^urn:ai:domain:([^:]+):agent:([a-z0-9][a-z0-9-]{0,62})$/i);
  if (!m) return null;
  return { domain: m[1].toLowerCase(), slug: m[2].toLowerCase() };
}
