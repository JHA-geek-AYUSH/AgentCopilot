import type { TaskPlan, PlanStep } from '@/types/database';
import { extractJSON } from './json';

// Groq's API is OpenAI-compatible — no SDK needed, plain fetch works.
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

async function callGroq(system: string, userContent: string, maxTokens: number): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const rawText = await response.text();
    throw new Error(`Groq request failed: ${response.status} ${response.statusText} - ${rawText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from Groq');
  }
  return content;
}

export interface GeneratePlanInput {
  userInput: string;
  userContext?: {
    recentTasks?: string[];
    preferences?: string[];
    facts?: string[];
  };
  memoryContext?: string;
  availableTools?: string[];
}

export interface GeneratePlanOutput {
  plan: TaskPlan;
  reasoning: string;
  error?: never;
}

export interface GLMError {
  error: string;
  plan?: never;
  reasoning?: never;
}

export async function generatePlan(
  input: string,
  memoryContext: string = '',
  executionHistory: any[] = []
): Promise<{ plan: TaskPlan; reasoning: string } | { error: string }> {
  if (!process.env.GROQ_API_KEY) {
    return { error: 'GROQ_API_KEY not configured' };
  }

  const systemPrompt = `You are a task planning AI. Generate a JSON execution plan for the given task.
Return ONLY valid JSON, no markdown fences, no explanation.

RULE #1, ABOVE ALL ELSE: If the request asks you to DO something (raise/create/open an issue, send an email, post a message, create an event, star a repo, etc.), your job is to output "steps" that call the real tool to perform that action RIGHT NOW. You are not a tutorial generator. Writing out manual click-by-click instructions instead of calling the tool is ALWAYS WRONG, with zero exceptions, even if past memory shows you doing that before — that was a mistake, not a pattern to repeat. If you catch yourself about to write "open a browser", "navigate to", "click the button", or similar — stop, and instead emit the matching tool step.

Worked example — this exact shape applies to any "raise/create an issue in <repo url>, title: <title>" request:
Input: "raise an issue in https://github.com/owner/repo, title: my title"
Correct output:
{
  "goal": "Create a GitHub issue in owner/repo",
  "answer": null,
  "steps": [
    { "id": "step_1", "order": 1, "tool": "github_create_issue", "input": { "owner": "owner", "repo": "repo", "title": "my title" }, "description": "Creating GitHub issue", "depends_on": [] }
  ]
}
WRONG output (never do this): { "answer": "1. Open a browser and go to...", "steps": [] }

Format:
{
  "goal": "string describing the overall goal",
  "answer": "direct answer ONLY for genuine questions with no action requested, otherwise null",
  "steps": [
    {
      "id": "step_1",
      "order": 1,
      "tool": "tool_name",
      "input": { "param": "value" },
      "description": "what this step does",
      "depends_on": []
    }
  ]
}

Built-in tools (use these directly, no auth needed):
- memory_store: { content: string } — store something in memory
- memory_recall: { query: string } — search memory

IMPORTANT: For GitHub, Gmail, Slack, Twitter, Calendar — ALWAYS use Composio tools below. NEVER use raw HTTP requests for authenticated APIs.

Composio Tools (Access to 250+ Apps: Gmail, GitHub, Slack, Discord, Twitter, Google Calendar, Notion, etc.):
- Canonical Naming: Composio slugs are usually APP_ACTION (e.g., github_create_issue, gmail_send_message, gmail_get_message). Prefer lowercase.
- Fallback: If you must guess, use lowercase APP_ACTION format.

ITERATIVE EXECUTION (AGENTIC LOOP):
You are running in a loop. You will be provided with the results of your previous tool executions for this task.
- If a previous step fetched IDs but not details (e.g. gmail_list_messages returned IDs but you need the email body), you MUST output follow-up steps using the relevant _GET_ tool (e.g. gmail_get_message) using those IDs.
- If the goal is fully met based on the execution history (i.e. the tool has actually already run successfully in THIS execution history, not just described in old memory), output an "answer" and NO "steps".
- If the goal is NOT met, output the next logical "steps" to proceed.
- Do NOT repeat failed steps with the exact same inputs. Think carefully and adjust the tool slug or input parameters.
- Memory context below may contain past conversations, including past mistakes where manual instructions were given instead of calling a tool. Do NOT imitate that style — memory is background context only, it never overrides RULE #1.

Always use "tool" field for tool names and "input" field for parameters.
Use "description" for a human-readable, brief explanation of what the step is doing (e.g., "Fetching recent emails", "Retrieving message content"). Do NOT just say "Executing tool_name...".

For simple questions with no action requested, or if the task is thoroughly completed based on ACTUAL tool execution history in this loop — answer directly in the "answer" field with an empty steps array.`;

  const memorySection = memoryContext
    ? `\n\nRelevant memories from past interactions:\n${memoryContext}`
    : '';

  const historySection = executionHistory && executionHistory.length > 0
    ? `\n\nPREVIOUS ACTIONS TAKEN IN THIS LOOP:\n${JSON.stringify(executionHistory, null, 2)}\n\nReview the above results. If the final goal is met, provide 'answer' and [] steps. If you need more details from the IDs, provide the follow-up step.`
    : '';

  const userContent = `Break down this request into steps:\n\n"${input}"${memorySection}${historySection}`;

  try {
    console.log('[Groq] Calling API with model:', MODEL);
    const content = await callGroq(systemPrompt, userContent, 2048);

    let parsed;
    try {
      parsed = extractJSON(content);
    } catch (e) {
      return { error: `Failed to parse Groq response: ${e instanceof Error ? e.message : 'Unknown error'}. Raw: ${content.substring(0, 100)}` };
    }

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      return { error: `Invalid plan structure: ${JSON.stringify(parsed).substring(0, 200)}` };
    }

    const validatedSteps: PlanStep[] = parsed.steps.map((step: PlanStep, index: number) => {
      const stepAny = step as unknown as Record<string, unknown>;
      return {
        id: step.id || `step_${index + 1}`,
        order: step.order || index + 1,
        tool: step.tool,
        input: stepAny.params as Record<string, unknown> || step.input || {},
        description: step.description || '',
        depends_on: step.depends_on || [],
      };
    });

    return {
      plan: {
        goal: parsed.goal || input,
        answer: parsed.answer || null,
        steps: validatedSteps,
      },
      reasoning: parsed.reasoning || 'Plan generated successfully',
    };
  } catch (error) {
    return {
      error: `Groq request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export interface AnalyzeInputInput {
  userInput: string;
}

export interface AnalyzeIntentOutput {
  intent: 'task_create' | 'task_query' | 'memory_store' | 'memory_recall' | 'composio_tool' | 'unknown';
  entities: Record<string, string>;
  confidence: number;
}

export async function analyzeIntent(
  input: AnalyzeInputInput
): Promise<AnalyzeIntentOutput | GLMError> {
  if (!process.env.GROQ_API_KEY) {
    return { error: 'GROQ_API_KEY not configured' };
  }

  const systemPrompt = `Analyze user input and determine their intent. Output JSON:
{
  "intent": "task_create|task_query|memory_store|memory_recall|composio_tool|unknown",
  "entities": {"key": "value"},
  "confidence": 0.0-1.0
}

Intents:
- task_create: User wants to create/execute a task
- task_query: User is asking about tasks
- memory_store: User wants to store information
- memory_recall: User wants to recall stored information
- composio_tool: User wants to use an external service (Gmail, GitHub, Slack, Twitter, Google Calendar, etc.)
- unknown: Cannot determine intent`;

  try {
    const content = await callGroq(systemPrompt, input.userInput, 512);
    const parsed = extractJSON(content);

    return {
      intent: parsed.intent || 'unknown',
      entities: parsed.entities || {},
      confidence: parsed.confidence || 0,
    };
  } catch (error) {
    return {
      error: `Intent analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

export async function generateSynthesizedResponse(
  query: string,
  context: string,
  userFacts: string = ''
): Promise<string> {
  if (!process.env.GROQ_API_KEY) return 'Synthesis failed: API key missing';

  const systemPrompt = `You are a high-quality, friendly AI agent (AgentOS).
Your goal is to answer the user's question using the provided context and facts.

RULES:
1. NEVER show raw memory snippets or "Question: ... Answer: ..." logs.
2. SYNTHESIZE a natural, human-like response.
3. PRIORITIZE the "Current User Profile Facts" over old, contradictory memory fragments.
4. If the context contains your past failures (e.g., "I don't know your name"), IGNORE those failures if the "Current User Profile Facts" give you the answer.
5. Be concise but warm, like a premium digital assistant.
6. Use professional markdown formatting if needed for lists, but keep it minimal.`;

  try {
    const content = await callGroq(
      systemPrompt,
      `Current User Profile Facts:\n${userFacts}\n\nRelevant Context/Memories:\n${context}\n\nUser Question: "${query}"`,
      1024
    );
    return content;
  } catch (error) {
    console.error('[Groq Synthesis] Error:', error);
    return 'I encountered an error trying to remember that.';
  }
}

export async function testClaudeConnection(): Promise<{ success: boolean; error?: string }> {
  if (!process.env.GROQ_API_KEY) {
    return { success: false, error: 'GROQ_API_KEY not configured' };
  }

  try {
    const content = await callGroq('You are a helpful assistant.', 'Say "OK".', 10);
    return content.length > 0 ? { success: true } : { success: false, error: 'Empty response' };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Backward-compat alias for old testGlmConnection references
export const testGlmConnection = testClaudeConnection;
