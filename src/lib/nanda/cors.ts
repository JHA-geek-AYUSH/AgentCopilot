// Permissive CORS for the public NANDA/A2A read surface so browser-based
// directory UIs (e.g. the NANDA Index Explore page) can fetch cards, the
// catalog, and run the sandbox cross-origin.

export const NANDA_CORS_HEADERS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, authorization',
  'access-control-max-age': '86400',
};

/** Merge the CORS headers onto an existing header map. */
export function withCors(
  headers: Record<string, string> = {}
): Record<string, string> {
  return { ...headers, ...NANDA_CORS_HEADERS };
}

/** Standard preflight response for OPTIONS handlers. */
export function corsPreflight(): Response {
  return new Response(null, { status: 204, headers: NANDA_CORS_HEADERS });
}
