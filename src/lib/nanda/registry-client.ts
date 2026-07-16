// Optional external nanda-registry mirror. See docs/prd.md §4.1 (Option B), §9.
// Off by default; only active when NANDA_EXTERNAL_REGISTRY_URL is set.

import type { Agent, AgentCard } from '@/lib/agents/types';
import { toCatalogEntry } from './catalog';
import { nandaConfig } from './config';

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (nandaConfig.externalRegistryJwt) {
    h.authorization = `Bearer ${nandaConfig.externalRegistryJwt}`;
  }
  return h;
}

/** Push a CatalogEntry to the external registry. Returns the remote id if known. */
export async function mirrorToExternalRegistry(
  agent: Agent,
  card: AgentCard
): Promise<{ remoteId?: string } | null> {
  if (!nandaConfig.externalRegistryUrl) return null;
  const body = { ...toCatalogEntry(agent), card };
  const res = await fetch(`${nandaConfig.externalRegistryUrl}/agents`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `External registry mirror failed (${res.status}): ${await safeText(res)}`
    );
  }
  const json = await res.json().catch(() => ({}));
  return { remoteId: json.id || json.identifier };
}

export async function deleteFromExternalRegistry(slug: string): Promise<void> {
  if (!nandaConfig.externalRegistryUrl) return;
  await fetch(`${nandaConfig.externalRegistryUrl}/agents/${slug}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).catch(() => {
    /* best-effort */
  });
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '<no body>';
  }
}
