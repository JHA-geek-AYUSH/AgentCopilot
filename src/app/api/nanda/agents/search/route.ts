import { NextRequest, NextResponse } from 'next/server';
import * as repo from '@/lib/agents/repo';
import { toCatalogEntry } from '@/lib/nanda/catalog';
import { parseLocator } from '@/lib/nanda/config';
import { corsPreflight, withCors } from '@/lib/nanda/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return corsPreflight();
}

// GET /api/nanda/agents/search?q= — keyword search, with a URN fast-path.
export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';

    // URN fast-path: resolve a locator straight to its entry.
    const parsed = parseLocator(q);
    if (parsed) {
      const agent = await repo.getPublicBySlug(parsed.slug);
      const results = agent ? [toCatalogEntry(agent)] : [];
      return NextResponse.json({ query: q, results }, { headers: withCors() });
    }

    const agents = await repo.searchPublic(q);
    return NextResponse.json(
      { query: q, results: agents.map(toCatalogEntry) },
      { headers: withCors() }
    );
  } catch (error) {
    console.error('[API/nanda/agents/search] error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500, headers: withCors() }
    );
  }
}
