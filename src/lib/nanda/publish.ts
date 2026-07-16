// Publish / unpublish service. See docs/prd.md §9.

import * as repo from '@/lib/agents/repo';
import type { Agent } from '@/lib/agents/types';
import { isValidSlug } from '@/lib/agents/slug';
import { buildAgentCard } from './card';
import { buildLocator, nandaConfig } from './config';
import { ensureIndexOrg } from './index-client';
import {
  deleteFromExternalRegistry,
  mirrorToExternalRegistry,
} from './registry-client';

export class PublishValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublishValidationError';
  }
}

/** Throw a PublishValidationError if the agent is not ready to publish. */
export function assertPublishable(agent: Agent): void {
  if (!agent.name?.trim()) {
    throw new PublishValidationError('Agent name is required.');
  }
  if (!agent.description?.trim()) {
    throw new PublishValidationError('A description is required to publish.');
  }
  if (!isValidSlug(agent.slug)) {
    throw new PublishValidationError(
      `Slug "${agent.slug}" is not URN-safe or is reserved.`
    );
  }
  const hasSkill = agent.skills.length > 0;
  const hasTask = agent.taskTemplate.trim().length >= 12;
  if (!hasSkill && !hasTask) {
    throw new PublishValidationError(
      'Add at least one skill or a non-trivial task before publishing.'
    );
  }
}

export interface PublishResult {
  ok: true;
  agent: Agent;
  locator: string;
  cardUrl: string;
  directoryUrl: string;
  warning?: string;
}

export async function publishAgent(
  agentId: string,
  userId: string,
  opts?: { visibility?: 'public' | 'unlisted' }
): Promise<PublishResult> {
  const agent = await repo.getOwned(agentId, userId);
  if (!agent) throw new PublishValidationError('Agent not found.');

  assertPublishable(agent);

  await repo.setStatus(agent.id, 'publishing');
  try {
    const { warning } = await ensureIndexOrg();

    // Resolve target visibility: explicit choice wins, else promote private->public.
    const visibility =
      opts?.visibility ??
      (agent.visibility === 'private' ? 'public' : agent.visibility);

    const card = buildAgentCard({ ...agent, visibility });

    const updated = await repo.update(agent.id, {
      card,
      visibility,
      nandaStatus: 'published',
      nandaIdentifier: agent.slug,
      nandaRegistryUrl: nandaConfig.registryBaseUrl,
      publishedAt: new Date().toISOString(),
    });

    if (nandaConfig.externalRegistryUrl) {
      await mirrorToExternalRegistry(updated, card);
    }

    return {
      ok: true,
      agent: updated,
      locator: buildLocator(agent.slug),
      cardUrl: `${nandaConfig.registryBaseUrl}/agents/${agent.slug}/card`,
      directoryUrl: `${nandaConfig.registryBaseUrl}/agents/${agent.slug}`,
      warning,
    };
  } catch (e) {
    await repo.setStatus(agent.id, 'failed');
    throw e;
  }
}

export async function unpublishAgent(
  agentId: string,
  userId: string
): Promise<Agent> {
  const agent = await repo.getOwned(agentId, userId);
  if (!agent) throw new PublishValidationError('Agent not found.');

  if (nandaConfig.externalRegistryUrl) {
    await deleteFromExternalRegistry(agent.slug);
  }

  return repo.update(agent.id, {
    nandaStatus: 'unpublished',
    visibility: 'private',
  });
}
