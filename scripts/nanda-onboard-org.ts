/**
 * One-time NANDA Index org onboarding. See docs/prd.md §10.
 *
 * Registers the AgentOS org so the NANDA directory points its `registry_url`
 * at this app's self-hosted registry surface (/api/nanda). Run once per env.
 *
 *   bun run scripts/nanda-onboard-org.ts            # create / inspect org
 *   bun run scripts/nanda-onboard-org.ts --verify   # trigger verification
 *
 * Env used: NANDA_INDEX_API_URL, NANDA_ORG_DOMAIN, NANDA_REGISTRY_BASE_URL,
 *           NANDA_PROVIDER_NAME, NANDA_PUBLIC_BASE_URL,
 *           NANDA_INDEX_EMAIL, NANDA_INDEX_PASSWORD (for auth).
 *
 * Interactive verification steps (email click + DNS TXT) are printed for you to
 * complete manually; the script never assumes it can bypass them.
 */

const INDEX = (process.env.NANDA_INDEX_API_URL || 'https://api.nandaindex.org').replace(/\/+$/, '');
const DOMAIN = process.env.NANDA_ORG_DOMAIN || 'agentos.app';
const REGISTRY_URL = process.env.NANDA_REGISTRY_BASE_URL || 'https://agentos.app/api/nanda';
const PROVIDER = process.env.NANDA_PROVIDER_NAME || 'Paramarsh Labs';
const HOMEPAGE = process.env.NANDA_PUBLIC_BASE_URL || 'https://agentos.app';
const EMAIL = process.env.NANDA_INDEX_EMAIL || '';
const PASSWORD = process.env.NANDA_INDEX_PASSWORD || '';

async function api(path: string, init: RequestInit, token?: string) {
  const res = await fetch(`${INDEX}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${init.method} ${path} -> ${res.status}: ${text}`);
  }
  return json as Record<string, unknown>;
}

async function getToken(): Promise<string> {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      'Set NANDA_INDEX_EMAIL and NANDA_INDEX_PASSWORD to authenticate with the NANDA Index.'
    );
  }
  // Try login first, fall back to register.
  try {
    const login = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    return (login.token || login.access_token) as string;
  } catch {
    const reg = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });
    return (reg.token || reg.access_token) as string;
  }
}

async function main() {
  const verify = process.argv.includes('--verify');
  console.log(`NANDA Index: ${INDEX}`);
  console.log(`Org domain : ${DOMAIN}`);
  console.log(`Registry   : ${REGISTRY_URL}\n`);

  const token = await getToken();
  console.log('✓ Authenticated with the NANDA Index.\n');

  const org = await api(
    '/api/v1/orgs',
    {
      method: 'POST',
      body: JSON.stringify({
        name: `AgentOS by ${PROVIDER}`,
        domain: DOMAIN,
        hosting_path: 'registry',
        registry_url: REGISTRY_URL,
        media_type: 'application/ai-catalog+json',
        tags: ['agentos', 'autonomous-agents'],
        metadata: { homepage: HOMEPAGE },
      }),
    },
    token
  );

  const orgId = (org.org_id || org.id) as string | undefined;
  console.log('✓ Org upserted.');
  if (orgId) {
    console.log(`\n  NANDA_ORG_ID=${orgId}\n`);
    console.log('  Add the line above to your .env, then redeploy.\n');
  }

  console.log('Next steps (manual — the Index requires real verification):');
  console.log('  1. Click the contact-verification link emailed by the Index.');
  console.log('  2. Request a DNS challenge, then publish the TXT record:');
  console.log(`       name : _nanda-challenge.${DOMAIN}`);
  console.log('       value: nanda-verify=<token-from-index>');
  console.log('  3. Re-run with --verify once DNS has propagated.\n');

  if (verify && orgId) {
    try {
      const result = await api(`/api/v1/orgs/${orgId}/verify`, { method: 'POST' }, token);
      console.log('Verification result:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Verification call failed:', (e as Error).message);
    }
  }
}

main().catch((e) => {
  console.error('\n✗ Onboarding failed:', (e as Error).message);
  process.exit(1);
});
