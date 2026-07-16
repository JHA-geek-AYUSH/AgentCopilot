import type { Agent, CatalogDocument, CatalogEntry } from '@/lib/agents/types';
import { nandaConfig } from './config';

/** Map a saved agent to a NANDA AI-Catalog entry. See docs/prd.md §7.2 / §8. */
export function toCatalogEntry(a: Agent): CatalogEntry {
  const base = nandaConfig.registryBaseUrl;
  return {
    id: a.slug,
    name: a.name,
    media_type: 'application/a2a-agent-card+json',
    url: `${base}/agents/${a.slug}/card`,
    tags: a.tags,
    version: a.version,
    updated_at: a.updatedAt,
    metadata: {
      provider: nandaConfig.providerName,
      platform: 'AgentOS',
      requiredApps: a.requiredApps,
      runMode: a.runMode,
      importUrl: `${nandaConfig.publicBaseUrl}/agent?import=${a.slug}`,
    },
  };
}

export function buildCatalogDocument(agents: Agent[]): CatalogDocument {
  const latest = agents.reduce(
    (acc, a) => (a.updatedAt > acc ? a.updatedAt : acc),
    new Date(0).toISOString()
  );
  return {
    media_type: 'application/ai-catalog+json',
    name: `${nandaConfig.providerName} — AgentOS Catalog`,
    provider: nandaConfig.providerName,
    updated_at: latest,
    agents: agents.map(toCatalogEntry),
  };
}
