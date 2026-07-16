// Agent execution. See docs/prd.md §4.2, §7.3.
//
// Two execution surfaces:
//  - runOwnerAgent: runs under the owner's account using their own connected
//    integrations (reuses the app's task pipeline).
//  - runSandboxAgent: the public A2A-lite runtime. NEVER loads owner Composio
//    connections. If the definition declares requiredApps it returns
//    `needs_integration` + an import URL instead of running with owner creds.

import { createAndExecuteTask } from '@/lib/executor-enhanced';
import { getTask } from '@/lib/database';
import { generatePlan, generateSynthesizedResponse } from '@/lib/claude';
import { nandaConfig } from '@/lib/nanda/config';
import type { Agent } from './types';

export interface OwnerRunResult {
  taskId: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  result: string;
  plan?: unknown;
  error?: string;
}

export type SandboxStatus = 'completed' | 'failed' | 'needs_integration';

export interface SandboxRunResult {
  taskId: string;
  status: SandboxStatus;
  result?: { parts: { kind: 'text'; text: string }[] };
  requiredApps?: string[];
  importUrl?: string;
  error?: string;
}

/** Combine the saved task template with the caller's free-text message. */
function composeInput(agent: Agent, message?: string): string {
  const msg = (message || '').trim();
  if (!msg) return agent.taskTemplate;
  return `${agent.taskTemplate}\n\nAdditional instructions for this run:\n${msg}`;
}

function resultToText(result: unknown): string {
  if (result == null) return '';
  if (typeof result === 'string') return result;
  if (typeof result === 'object') {
    const r = result as Record<string, unknown>;
    if (typeof r.answer === 'string') return r.answer;
    if (typeof r.summary === 'string') return r.summary;
    if (typeof r.text === 'string') return r.text;
    try {
      return JSON.stringify(result);
    } catch {
      return String(result);
    }
  }
  return String(result);
}

/** Run an agent under the owner's account (uses their integrations). */
export async function runOwnerAgent(
  agent: Agent,
  message: string | undefined,
  internalUserId: string
): Promise<OwnerRunResult> {
  const input = composeInput(agent, message);
  const out = await createAndExecuteTask(input, internalUserId);
  const task = out.taskId ? await getTask(out.taskId) : null;
  return {
    taskId: out.taskId,
    status: out.status,
    result: resultToText(task?.result) || (out.error ?? ''),
    plan: out.plan,
    error: out.error,
  };
}

function newTaskId(): string {
  return `sbx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Public sandbox runtime. Safe by construction: no owner Composio connections
 * are ever loaded. Returns a cheap deterministic plan + synthesized result for
 * integration-free agents, or `needs_integration` when the definition requires
 * connected apps (caller is nudged to clone — docs/prd.md §17.2 recommendation).
 */
export async function runSandboxAgent(
  agent: Agent,
  message?: string
): Promise<SandboxRunResult> {
  const taskId = newTaskId();
  const importUrl = `${nandaConfig.publicBaseUrl}/agent?import=${agent.slug}`;

  if (agent.requiredApps.length > 0) {
    return {
      taskId,
      status: 'needs_integration',
      requiredApps: agent.requiredApps,
      importUrl,
    };
  }

  const input = composeInput(agent, message);
  try {
    const planResult = await generatePlan(input, '');
    if ('error' in planResult) {
      return { taskId, status: 'failed', error: planResult.error, importUrl };
    }

    const planSummary = [
      `Goal: ${planResult.plan.goal}`,
      ...planResult.plan.steps.map(
        (s, i) => `${i + 1}. ${s.tool}: ${s.description}`
      ),
    ].join('\n');

    const text = await generateSynthesizedResponse(
      input,
      `This is a public sandbox run of the "${agent.name}" agent. ` +
        `It executes with no private integrations. Planned approach:\n${planSummary}`
    );

    return {
      taskId,
      status: 'completed',
      result: { parts: [{ kind: 'text', text }] },
      importUrl,
    };
  } catch (e) {
    return {
      taskId,
      status: 'failed',
      error: e instanceof Error ? e.message : 'Sandbox run failed',
      importUrl,
    };
  }
}
