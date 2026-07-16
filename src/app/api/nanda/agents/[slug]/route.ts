import { NextResponse } from 'next/server';
import * as repo from '@/lib/agents/repo';
import { toCatalogEntry } from '@/lib/nanda/catalog';
import { corsPreflight, withCors } from '@/lib/nanda/cors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export function OPTIONS() {
  return corsPreflight();
}

// GET /api/nanda/agents/:slug — the CatalogEntry for a published agent.
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
    return new NextResponse(JSON.stringify(toCatalogEntry(agent)), {
      headers: withCors({ 'content-type': 'application/json' }),
    });
  } catch (error) {
    console.error('[API/nanda/agents/:slug] error:', error);
    return NextResponse.json(
      { error: 'Lookup failed' },
      { status: 500, headers: withCors() }
    );
  }
}
