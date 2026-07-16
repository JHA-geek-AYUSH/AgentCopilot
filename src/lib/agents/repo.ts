// Supabase data access for persistent agents.
// All access is via the service-role client (see @/lib/database). Ownership and
// visibility are enforced here + in the API routes, not via Supabase RLS,
// because the app authenticates with Clerk rather than Supabase Auth.

import { getSupabase } from '@/lib/database';
import { deriveUniqueSlug } from './slug';
import type {
  Agent,
  AgentRow,
  CreateAgentInput,
  NandaStatus,
  Visibility,
} from './types';

const TABLE = 'agents';

const DEFAULT_INPUT_MODES = ['text/plain'];
const DEFAULT_OUTPUT_MODES = ['text/plain', 'application/json'];

function rowToAgent(row: AgentRow): Agent {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    taskTemplate: row.task_template,
    runMode: row.run_mode,
    runConfig: row.run_config ?? {},
    requiredApps: row.required_apps ?? [],
    capabilities: row.capabilities ?? {},
    skills: row.skills ?? [],
    inputModes: row.input_modes ?? DEFAULT_INPUT_MODES,
    outputModes: row.output_modes ?? DEFAULT_OUTPUT_MODES,
    tags: row.tags ?? [],
    version: row.version ?? '0.1.0',
    visibility: row.visibility,
    nandaStatus: row.nanda_status,
    nandaIdentifier: row.nanda_identifier ?? undefined,
    nandaRegistryUrl: row.nanda_registry_url ?? undefined,
    card: row.card ?? undefined,
    publishedAt: row.published_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert a partial Agent patch (camelCase) into a DB row patch (snake_case). */
function agentPatchToRow(patch: Partial<Agent>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.slug !== undefined) row.slug = patch.slug;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.taskTemplate !== undefined) row.task_template = patch.taskTemplate;
  if (patch.runMode !== undefined) row.run_mode = patch.runMode;
  if (patch.runConfig !== undefined) row.run_config = patch.runConfig;
  if (patch.requiredApps !== undefined) row.required_apps = patch.requiredApps;
  if (patch.capabilities !== undefined) row.capabilities = patch.capabilities;
  if (patch.skills !== undefined) row.skills = patch.skills;
  if (patch.inputModes !== undefined) row.input_modes = patch.inputModes;
  if (patch.outputModes !== undefined) row.output_modes = patch.outputModes;
  if (patch.tags !== undefined) row.tags = patch.tags;
  if (patch.version !== undefined) row.version = patch.version;
  if (patch.visibility !== undefined) row.visibility = patch.visibility;
  if (patch.nandaStatus !== undefined) row.nanda_status = patch.nandaStatus;
  if (patch.nandaIdentifier !== undefined) row.nanda_identifier = patch.nandaIdentifier;
  if (patch.nandaRegistryUrl !== undefined) row.nanda_registry_url = patch.nandaRegistryUrl;
  if (patch.card !== undefined) row.card = patch.card;
  if (patch.publishedAt !== undefined) row.published_at = patch.publishedAt;
  return row;
}

export async function slugExists(slug: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from(TABLE)
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
  return !!data;
}

export async function listByUser(userId: string): Promise<Agent[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as AgentRow[]).map(rowToAgent);
}

export async function getById(id: string): Promise<Agent | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToAgent(data as AgentRow) : null;
}

/** Read an agent and assert the caller owns it. Returns null if not found/owned. */
export async function getOwned(id: string, userId: string): Promise<Agent | null> {
  const agent = await getById(id);
  if (!agent || agent.userId !== userId) return null;
  return agent;
}

export async function create(
  userId: string,
  input: CreateAgentInput
): Promise<Agent> {
  const slug = await deriveUniqueSlug(input.name, slugExists);

  const insert = {
    user_id: userId,
    slug,
    name: input.name,
    description: input.description ?? '',
    task_template: input.taskTemplate,
    run_mode: input.runMode ?? 'interval',
    run_config: input.runConfig ?? {},
    required_apps: input.requiredApps ?? [],
    capabilities: input.capabilities ?? {},
    skills: input.skills ?? [],
    input_modes: input.inputModes ?? DEFAULT_INPUT_MODES,
    output_modes: input.outputModes ?? DEFAULT_OUTPUT_MODES,
    tags: input.tags ?? [],
    version: input.version ?? '0.1.0',
    visibility: input.visibility ?? 'private',
    nanda_status: 'draft' as NandaStatus,
  };

  const { data, error } = await getSupabase()
    .from(TABLE)
    .insert(insert)
    .select()
    .single();
  if (error) throw error;
  return rowToAgent(data as AgentRow);
}

export async function update(id: string, patch: Partial<Agent>): Promise<Agent> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .update(agentPatchToRow(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToAgent(data as AgentRow);
}

export async function setStatus(id: string, status: NandaStatus): Promise<void> {
  const { error } = await getSupabase()
    .from(TABLE)
    .update({ nanda_status: status })
    .eq('id', id);
  if (error) throw error;
}

export async function remove(id: string): Promise<void> {
  const { error } = await getSupabase().from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

// --- Public NANDA reads (visibility + published filter) ------
const PUBLIC_VISIBILITIES: Visibility[] = ['public', 'unlisted'];

export async function getPublicBySlug(slug: string): Promise<Agent | null> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('slug', slug)
    .eq('nanda_status', 'published')
    .in('visibility', PUBLIC_VISIBILITIES)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToAgent(data as AgentRow) : null;
}

/** Listable catalog = published + visibility 'public' (unlisted is resolvable but not listed). */
export async function listPublic(): Promise<Agent[]> {
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('nanda_status', 'published')
    .eq('visibility', 'public')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data as AgentRow[]).map(rowToAgent);
}

export async function searchPublic(query: string): Promise<Agent[]> {
  // Strip PostgREST filter metacharacters to avoid `.or()` filter injection.
  const q = query.replace(/[,():*\\%]/g, ' ').trim().slice(0, 100);
  if (!q) return listPublic();
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select('*')
    .eq('nanda_status', 'published')
    .eq('visibility', 'public')
    .or(`name.ilike.%${q}%,description.ilike.%${q}%,slug.ilike.%${q}%`)
    .order('updated_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data as AgentRow[]).map(rowToAgent);
}
