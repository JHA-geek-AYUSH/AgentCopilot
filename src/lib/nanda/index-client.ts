// Thin client for the NANDA Index. See docs/prd.md §2, §9, §10.
//
// Two responsibilities:
//  - ensureIndexOrg(): confirm the AgentOS org is onboarded before publishing.
//  - resolveLocator(): hop-1 resolution (urn -> registry_url + identifier),
//    with a local fast-path when the locator points at our own org domain so
//    import works even without a live Index.

import { nandaConfig, parseLocator } from './config';

export interface EnsureOrgResult {
  ok: boolean;
  warning?: string;
}

/**
 * Confirm the org is registered in the NANDA Index. Self-registry publishing
 * works without it (the agent is still resolvable at our own registry surface),
 * but Index-level discovery requires NANDA_ORG_ID from the onboarding script.
 *
 * Set NANDA_REQUIRE_ORG=true to hard-fail publish until onboarding is complete.
 */
export async function ensureIndexOrg(): Promise<EnsureOrgResult> {
  if (nandaConfig.orgId) return { ok: true };

  const message =
    'NANDA org not onboarded (NANDA_ORG_ID is unset). Published agents are ' +
    'resolvable on this AgentOS registry surface but will not appear in the ' +
    'NANDA Index until you run scripts/nanda-onboard-org.ts. See docs/prd.md §10.';

  if (process.env.NANDA_REQUIRE_ORG === 'true') {
    throw new Error(message);
  }
  return { ok: true, warning: message };
}

export interface ResolvedLocator {
  registryUrl: string;
  identifier: string;
  /** True when resolved locally (our own org domain) without hitting the Index. */
  local: boolean;
}

/**
 * Resolve a NANDA locator URN to a registry URL + identifier (hop 1).
 * Falls back to local resolution for our own org domain.
 */
export async function resolveLocator(
  locator: string
): Promise<ResolvedLocator | null> {
  const parsed = parseLocator(locator);
  if (!parsed) return null;

  // Local fast-path: our own agents resolve to our own registry surface.
  if (parsed.domain === nandaConfig.orgDomain) {
    return {
      registryUrl: nandaConfig.registryBaseUrl,
      identifier: parsed.slug,
      local: true,
    };
  }

  // Remote: ask the Index where this org's registry lives.
  try {
    const url = `${nandaConfig.indexApiUrl}/api/v1/resolve?locator=${encodeURIComponent(locator)}`;
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) return null;
    const body = await res.json();
    const registryUrl: string | undefined =
      body.registry_url || body.registryUrl || body?.org?.registry_url;
    if (!registryUrl) return null;
    return {
      registryUrl: registryUrl.replace(/\/+$/, ''),
      identifier: body.identifier || parsed.slug,
      local: false,
    };
  } catch {
    return null;
  }
}
