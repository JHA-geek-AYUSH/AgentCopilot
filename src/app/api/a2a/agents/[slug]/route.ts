import { NextRequest, NextResponse } from 'next/server';
import * as repo from '@/lib/agents/repo';
import { buildAgentCard } from '@/lib/nanda/card';
import { runSandboxAgent } from '@/lib/agents/runtime';
import { nandaConfig } from '@/lib/nanda/config';
import { corsPreflight, withCors } from '@/lib/nanda/cors';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }> };

export function OPTIONS() {
  return corsPreflight();
}

// --- Simple in-memory rate limiter (per process). docs/prd.md §11 ----
const PER_MINUTE = 10;
const PER_DAY = 200;
const minuteHits = new Map<string, { count: number; resetAt: number }>();
const dayHits = new Map<string, { count: number; resetAt: number }>();

function hit(
  store: Map<string, { count: number; resetAt: number }>,
  key: string,
  windowMs: number,
  limit: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

// GET /api/a2a/agents/:slug — return the agent card (discovery convenience).
export async function GET(_request: NextRequest, { params }: Params) {
  const { slug } = await params;
  const agent = await repo.getPublicBySlug(slug);
  if (!agent) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: withCors() }
    );
  }
  return new NextResponse(JSON.stringify(buildAgentCard(agent)), {
    headers: withCors({ 'content-type': 'application/a2a-agent-card+json' }),
  });
}

// POST /api/a2a/agents/:slug — A2A-lite sandbox runtime.
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params;

  if (!nandaConfig.runtimeEnabled) {
    return NextResponse.json(
      { error: 'Runtime disabled (NANDA_RUNTIME_ENABLED=false).' },
      { status: 503, headers: withCors() }
    );
  }

  const agent = await repo.getPublicBySlug(slug);
  if (!agent) {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404, headers: withCors() }
    );
  }

  const ip = clientIp(request);
  const key = `${ip}:${slug}`;
  if (
    !hit(minuteHits, key, 60_000, PER_MINUTE) ||
    !hit(dayHits, key, 86_400_000, PER_DAY)
  ) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Clone the agent to run it without limits.' },
      { status: 429, headers: withCors() }
    );
  }

  let message: string | undefined;
  try {
    const body = await request.json();
    // A2A-lite: { message: { role, parts: [{ kind:'text', text }] } }
    const parts = body?.message?.parts;
    if (Array.isArray(parts)) {
      message = parts
        .filter((p: { kind?: string }) => p?.kind === 'text')
        .map((p: { text?: string }) => p?.text ?? '')
        .join('\n')
        .trim();
    } else if (typeof body?.message === 'string') {
      message = body.message;
    }
  } catch {
    // No/invalid body — run the agent's template as-is.
  }

  const result = await runSandboxAgent(agent, message);
  const status = result.status === 'failed' ? 502 : 200;
  return NextResponse.json(result, { status, headers: withCors() });
}
