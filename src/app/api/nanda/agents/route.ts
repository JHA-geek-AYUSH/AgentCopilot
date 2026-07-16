import { NextResponse } from 'next/server';
import * as repo from '@/lib/agents/repo';
import { buildCatalogDocument } from '@/lib/nanda/catalog';
import { corsPreflight, withCors } from '@/lib/nanda/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return corsPreflight();
}

// GET /api/nanda/agents — the AI Catalog document of all listed public agents.
export async function GET() {
  try {
    const agents = await repo.listPublic();
    const doc = buildCatalogDocument(agents);
    return new NextResponse(JSON.stringify(doc), {
      headers: withCors({
        'content-type': 'application/ai-catalog+json',
        'cache-control': 'public, max-age=30',
      }),
    });
  } catch (error) {
    console.error('[API/nanda/agents] error:', error);
    return NextResponse.json(
      { error: 'Failed to build catalog' },
      { status: 500, headers: withCors() }
    );
  }
}
