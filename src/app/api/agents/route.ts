import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as repo from '@/lib/agents/repo';
import type { CreateAgentInput } from '@/lib/agents/types';

// GET /api/agents — list the caller's saved agents.
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const agents = await repo.listByUser(clerkUserId);
    return NextResponse.json({ agents });
  } catch (error) {
    console.error('[API/agents] list error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list agents' },
      { status: 500 }
    );
  }
}

// POST /api/agents — create an agent from the /agent config.
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CreateAgentInput>;
    if (!body?.name?.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!body?.taskTemplate?.trim()) {
      return NextResponse.json(
        { error: 'taskTemplate is required' },
        { status: 400 }
      );
    }

    const agent = await repo.create(clerkUserId, {
      name: body.name.trim(),
      description: body.description?.trim() ?? '',
      taskTemplate: body.taskTemplate.trim(),
      runMode: body.runMode,
      runConfig: body.runConfig,
      requiredApps: body.requiredApps,
      capabilities: body.capabilities,
      skills: body.skills,
      inputModes: body.inputModes,
      outputModes: body.outputModes,
      tags: body.tags,
      version: body.version,
      visibility: body.visibility,
    });

    return NextResponse.json({ agent }, { status: 201 });
  } catch (error) {
    console.error('[API/agents] create error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create agent' },
      { status: 500 }
    );
  }
}
