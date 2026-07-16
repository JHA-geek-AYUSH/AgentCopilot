import { NextResponse } from 'next/server';
import * as repo from '@/lib/agents/repo';
import { buildAgentCard } from '@/lib/nanda/card';
import { corsPreflight, withCors } from '@/lib/nanda/cors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export function OPTIONS() {
  return corsPreflight();
}

// GET /api/nanda/agents/:slug/card — the A2A agent card.
export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const agent = await repo.getPublicBySlug(slug);
    if (!agent) {
      return NextResponse.json(
        { error: 'Not found' },
        { status: 404, headers: withCors() }
      );
    }
    // Rebuild from the row so the card always reflects the latest shape
    // (e.g. agents published before `tags` was added to the card).
    const card = buildAgentCard(agent);
    return new NextResponse(JSON.stringify(card), {
      headers: withCors({
        'content-type': 'application/a2a-agent-card+json',
        'cache-control': 'public, max-age=30',
      }),
    });
  } catch (error) {
    console.error('[API/nanda/agents/:slug/card] error:', error);
    return NextResponse.json(
      { error: 'Lookup failed' },
      { status: 500, headers: withCors() }
    );
  }
}
