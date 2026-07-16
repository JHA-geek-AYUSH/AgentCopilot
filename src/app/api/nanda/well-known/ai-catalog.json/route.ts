import { NextResponse } from 'next/server';
import { nandaConfig } from '@/lib/nanda/config';
import { corsPreflight, withCors } from '@/lib/nanda/cors';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return corsPreflight();
}

// Catalog discovery doc. Reachable at the convention-standard
// /.well-known/ai-catalog.json (and /api/nanda/.well-known/ai-catalog.json)
// via the rewrites in next.config.ts.
export async function GET() {
  const base = nandaConfig.registryBaseUrl;
  const doc = {
    media_type: 'application/ai-catalog+json',
    name: `${nandaConfig.providerName} — AgentOS Catalog`,
    provider: nandaConfig.providerName,
    domain: nandaConfig.orgDomain,
    registry_url: base,
    endpoints: {
      catalog: `${base}/agents`,
      search: `${base}/agents/search`,
      entry: `${base}/agents/{id}`,
      card: `${base}/agents/{id}/card`,
    },
  };
  return new NextResponse(JSON.stringify(doc), {
    headers: withCors({
      'content-type': 'application/ai-catalog+json',
      'cache-control': 'public, max-age=300',
    }),
  });
}
