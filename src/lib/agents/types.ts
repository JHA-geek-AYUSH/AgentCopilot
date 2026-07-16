// Persistent agent + NANDA types.
// See docs/prd.md §6.2 and §8.

export type RunMode = 'continuous' | 'timed' | 'interval';
export type Visibility = 'private' | 'unlisted' | 'public';
export type NandaStatus =
  | 'draft'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'unpublished';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface AgentCapabilities {
  streaming?: boolean;
  memory?: boolean;
  selfCorrect?: boolean;
}

export interface Agent {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description: string;
  taskTemplate: string;
  runMode: RunMode;
  runConfig: Record<string, number>;
  requiredApps: string[];
  capabilities: AgentCapabilities;
  skills: AgentSkill[];
  inputModes: string[];
  outputModes: string[];
  tags: string[];
  version: string;
  visibility: Visibility;
  nandaStatus: NandaStatus;
  nandaIdentifier?: string;
  nandaRegistryUrl?: string;
  card?: AgentCard;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/** Raw Supabase row shape for the `agents` table. */
export interface AgentRow {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  task_template: string;
  run_mode: RunMode;
  run_config: Record<string, number>;
  required_apps: string[];
  capabilities: AgentCapabilities;
  skills: AgentSkill[];
  input_modes: string[];
  output_modes: string[];
  tags: string[];
  version: string;
  visibility: Visibility;
  nanda_status: NandaStatus;
  nanda_identifier: string | null;
  nanda_registry_url: string | null;
  card: AgentCard | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Payload accepted by POST /api/agents (and the Save-as-Agent dialog). */
export interface CreateAgentInput {
  name: string;
  description?: string;
  taskTemplate: string;
  runMode?: RunMode;
  runConfig?: Record<string, number>;
  requiredApps?: string[];
  capabilities?: AgentCapabilities;
  skills?: AgentSkill[];
  inputModes?: string[];
  outputModes?: string[];
  tags?: string[];
  version?: string;
  visibility?: Visibility;
}

export type UpdateAgentInput = Partial<CreateAgentInput>;

// --- A2A agent card (subset of the A2A spec we implement) ----
export interface AgentCardSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface AgentCard {
  schemaVersion: string;
  name: string;
  description: string;
  url: string;
  version: string;
  /** Top-level tags so directory UIs (e.g. NANDA Index) can render chips. */
  tags: string[];
  provider: { organization: string; url: string };
  capabilities: {
    streaming: boolean;
    stateTransitionHistory: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: AgentCardSkill[];
  'x-agentos': {
    runMode: RunMode;
    requiredApps: string[];
    importUrl: string;
  };
}

// --- NANDA catalog (AI Catalog) shapes -----------------------
export interface CatalogEntry {
  id: string;
  name: string;
  media_type: 'application/a2a-agent-card+json';
  url: string;
  tags: string[];
  version: string;
  updated_at: string;
  metadata: {
    provider: string;
    platform: 'AgentOS';
    requiredApps: string[];
    runMode: RunMode;
    importUrl: string;
  };
}

export interface CatalogDocument {
  media_type: 'application/ai-catalog+json';
  name: string;
  provider: string;
  updated_at: string;
  agents: CatalogEntry[];
}
