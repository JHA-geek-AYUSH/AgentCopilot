import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as repo from '@/lib/agents/repo';
import { buildAgentCard } from '@/lib/nanda/card';
import { unpublishAgent } from '@/lib/nanda/publish';
import type { UpdateAgentInput } from '@/lib/agents/types';

type Params = { params: Promise<{ id: string }> };

// Bump the patch component of a semver-ish version string.
function bumpVersion(version: string): string {
  const parts = version.split('.');
  if (parts.length === 3 && /^\d+$/.test(parts[2])) {
    parts[2] = String(Number(parts[2]) + 1);
    return parts.join('.');
  }
  return version;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const agent = await repo.getOwned(id, clerkUserId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }
    return NextResponse.json({ agent });
  } catch (error) {
    console.error('[API/agents/:id] get error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to read agent' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await repo.getOwned(id, clerkUserId);
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const body = (await request.json()) as UpdateAgentInput;

    // Whitelist editable fields (slug, ownership and NANDA status are not editable here).
    const patch: Parameters<typeof repo.update>[1] = {};
    if (body.name !== undefined) patch.name = body.name;
    if (body.description !== undefined) patch.description = body.description;
    if (body.taskTemplate !== undefined) patch.taskTemplate = body.taskTemplate;
    if (body.runMode !== undefined) patch.runMode = body.runMode;
    if (body.runConfig !== undefined) patch.runConfig = body.runConfig;
    if (body.requiredApps !== undefined) patch.requiredApps = body.requiredApps;
    if (body.capabilities !== undefined) patch.capabilities = body.capabilities;
    if (body.skills !== undefined) patch.skills = body.skills;
    if (body.inputModes !== undefined) patch.inputModes = body.inputModes;
    if (body.outputModes !== undefined) patch.outputModes = body.outputModes;
    if (body.tags !== undefined) patch.tags = body.tags;
    if (body.visibility !== undefined) patch.visibility = body.visibility;

    // Any change bumps the version.
    patch.version = bumpVersion(existing.version);

    let updated = await repo.update(id, patch);

    // If already published, re-render and cache the card so the public
    // surface reflects the update (propagation).
    if (updated.nandaStatus === 'published') {
      updated = await repo.update(id, { card: buildAgentCard(updated) });
    }

    return NextResponse.json({ agent: updated });
  } catch (error) {
    console.error('[API/agents/:id] patch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update agent' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const existing = await repo.getOwned(id, clerkUserId);
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Unpublish first (removes external mirror) when needed.
    if (existing.nandaStatus === 'published') {
      await unpublishAgent(id, clerkUserId);
    }
    await repo.remove(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API/agents/:id] delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete agent' },
      { status: 500 }
    );
  }
}
