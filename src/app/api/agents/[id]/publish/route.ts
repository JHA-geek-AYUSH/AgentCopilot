import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { nandaConfig } from '@/lib/nanda/config';
import {
  PublishValidationError,
  publishAgent,
  unpublishAgent,
} from '@/lib/nanda/publish';
import type { Visibility } from '@/lib/agents/types';

type Params = { params: Promise<{ id: string }> };

// POST /api/agents/:id/publish — validate, render card, mark published.
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!nandaConfig.enabled) {
      return NextResponse.json(
        { error: 'NANDA publishing is disabled (NANDA_ENABLED=false).' },
        { status: 503 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const visibility: Visibility | undefined =
      body?.visibility === 'public' || body?.visibility === 'unlisted'
        ? body.visibility
        : undefined;

    const result = await publishAgent(id, clerkUserId, {
      visibility: visibility as 'public' | 'unlisted' | undefined,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof PublishValidationError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error('[API/agents/:id/publish] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Publish failed' },
      { status: 500 }
    );
  }
}

// DELETE /api/agents/:id/publish — unpublish.
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const agent = await unpublishAgent(id, clerkUserId);
    return NextResponse.json({ agent });
  } catch (error) {
    if (error instanceof PublishValidationError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('[API/agents/:id/publish] unpublish error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unpublish failed' },
      { status: 500 }
    );
  }
}
