// Slug derivation + validation. See docs/prd.md §7.1 and §17.1
// v1 decision: org-global slugs + reserved-word list.

// URN-safe: starts with [a-z0-9], 2-63 chars total, lowercase/digits/hyphen.
export const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,62}$/;

const RESERVED_SLUGS = new Set([
  'agent',
  'agents',
  'nanda',
  'api',
  'admin',
  'card',
  'cards',
  'search',
  'import',
  'well-known',
  'catalog',
  'a2a',
  'index',
  'registry',
  'new',
  'create',
  'system',
  'root',
  'null',
  'undefined',
]);

export function slugify(input: string): string {
  // NFKD splits accented chars into base + combining marks; the alnum filter
  // below then drops the combining marks, so no explicit accent strip is needed.
  const base = (input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-') // non-alnum -> hyphen
    .replace(/-+/g, '-') // collapse hyphens
    .replace(/^-+|-+$/g, ''); // trim hyphens

  let slug = base.slice(0, 63);
  // Must start with an alnum and be at least 2 chars.
  slug = slug.replace(/^-+/, '');
  if (slug.length < 2) slug = `agent-${slug}`.replace(/-+$/, '').slice(0, 63);
  return slug;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

export function isValidSlug(slug: string): boolean {
  return SLUG_REGEX.test(slug) && !isReservedSlug(slug);
}

/**
 * Derive a unique slug from `name`, deduping with a numeric suffix.
 * `exists(candidate)` should resolve true if the slug is already taken.
 */
export async function deriveUniqueSlug(
  name: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  let base = slugify(name);
  if (isReservedSlug(base)) base = `${base}-agent`.slice(0, 63);

  if (!(await exists(base))) return base;

  for (let i = 2; i < 1000; i++) {
    const suffix = `-${i}`;
    const candidate = `${base.slice(0, 63 - suffix.length)}${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }
  // Extremely unlikely fallback.
  return `${base.slice(0, 50)}-${Date.now().toString(36)}`;
}
