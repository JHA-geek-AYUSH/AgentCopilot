import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getOrCreateClerkUser } from '@/lib/database';
import * as repo from '@/lib/agents/repo';
import { runOwnerAgent } from '@/lib/agents/runtime';

type Params = { params: Promise<{ id: string }> };

// POST /api/agents/:id/run — owner run (uses the owner's own integrations).
export async function POST(request: NextRequest, { params }: Params) {
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

    const body = await request.json().catch(() => ({}));
    const message: string | undefined =
      typeof body?.message === 'string' ? body.message : undefined;

    const user = await getOrCreateClerkUser(clerkUserId);
    const result = await runOwnerAgent(agent, message, user.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API/agents/:id/run] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Agent run failed' },
      { status: 500 }
    );
  }
}
