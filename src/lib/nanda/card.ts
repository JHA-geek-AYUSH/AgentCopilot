import type { Agent, AgentCard } from '@/lib/agents/types';
import { nandaConfig } from './config';

/** Build the A2A agent card for a saved agent. See docs/prd.md §8. */
export function buildAgentCard(a: Agent): AgentCard {
  const base = nandaConfig.publicBaseUrl;
  return {
    schemaVersion: '0.2.0',
    name: a.name,
    description: a.description,
    url: `${base}/api/a2a/agents/${a.slug}`, // runtime endpoint
    version: a.version,
    tags: a.tags,
    provider: { organization: nandaConfig.providerName, url: base },
    capabilities: {
      streaming: a.capabilities.streaming ?? false,
      stateTransitionHistory: false,
    },
    defaultInputModes: a.inputModes,
    defaultOutputModes: a.outputModes,
    skills: a.skills.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      tags: s.tags,
    })),
    // AgentOS extensions (namespaced so we don't collide with A2A core).
    'x-agentos': {
      runMode: a.runMode,
      requiredApps: a.requiredApps,
      importUrl: `${base}/agent?import=${a.slug}`,
    },
  };
}
