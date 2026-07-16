import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as repo from '@/lib/agents/repo';
import { resolveLocator } from '@/lib/nanda/index-client';
import { parseLocator } from '@/lib/nanda/config';
import type {
  AgentCard,
  CreateAgentInput,
} from '@/lib/agents/types';

// POST /api/agents/import — clone a published agent into the caller's account.
// Body: { locator } | { cardUrl } | { slug }
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const locator: string | undefined = body?.locator;
    const cardUrl: string | undefined = body?.cardUrl;
    const slug: string | undefined = body?.slug;

    let input: CreateAgentInput | null = null;

    // 1) Bare slug or a locator pointing at our own org -> clone from local data
    //    (we have the full definition, including the task template).
    const localSlug =
      slug ||
      (locator ? parseLocator(locator)?.slug : undefined);
    if (localSlug && !cardUrl) {
      const resolved = locator ? await resolveLocator(locator) : { local: true };
      if (!locator || (resolved && resolved.local)) {
        const source = await repo.getPublicBySlug(localSlug);
        if (source) {
          input = {
            name: source.name,
            description: source.description,
            taskTemplate: source.taskTemplate,
            runMode: source.runMode,
            runConfig: source.runConfig,
            requiredApps: source.requiredApps,
            capabilities: source.capabilities,
            skills: source.skills,
            inputModes: source.inputModes,
            outputModes: source.outputModes,
            tags: source.tags,
            visibility: 'private',
          };
        }
      }
    }

    // 2) Remote locator -> resolve to a registry, fetch the card.
    if (!input && locator) {
      const resolved = await resolveLocator(locator);
      if (!resolved) {
        return NextResponse.json(
          { error: `Could not resolve locator: ${locator}` },
          { status: 404 }
        );
      }
      const url = `${resolved.registryUrl}/agents/${resolved.identifier}/card`;
      input = await cardUrlToInput(url);
    }

    // 3) Direct card URL.
    if (!input && cardUrl) {
      input = await cardUrlToInput(cardUrl);
    }

    if (!input) {
      return NextResponse.json(
        { error: 'Provide a locator, cardUrl, or slug for a published agent.' },
        { status: 400 }
      );
    }

    const agent = await repo.create(clerkUserId, input);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('[API/agents/import] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 }
    );
  }
}

async function cardUrlToInput(url: string): Promise<CreateAgentInput> {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`Failed to fetch agent card (${res.status}) from ${url}`);
  }
  const card = (await res.json()) as AgentCard;
  return cardToCreateInput(card);
}

/**
 * Map a public A2A card to a private clone. The card intentionally does not
 * expose the owner's task template, so we seed it from the description for the
 * importer to refine.
 */
function cardToCreateInput(card: AgentCard): CreateAgentInput {
  const ext = card['x-agentos'];
  return {
    name: card.name,
    description: card.description,
    taskTemplate: card.description || card.name,
    runMode: ext?.runMode,
    requiredApps: ext?.requiredApps ?? [],
    skills: card.skills ?? [],
    inputModes: card.defaultInputModes,
    outputModes: card.defaultOutputModes,
    capabilities: { streaming: card.capabilities?.streaming ?? false },
    version: card.version,
    visibility: 'private',
  };
}
