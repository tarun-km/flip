/**
 * Direct Anthropic Messages API cognition port.
 *
 * Adapted from pango07/flicky (MIT) — https://github.com/pango07/flicky
 * src/main/services/claude-api.ts. Credit to that project for the fetch-based
 * streaming client this is simplified from (this port uses a single
 * non-streaming call to match KLIP's CognitionPort contract).
 *
 * This is an HONEST INTERIM PATH, not the architecture docs/08 describes:
 * docs/08-AWS-INFRASTRUCTURE.md routes all cloud reasoning through a
 * Cognito-authenticated Lambda in front of Bedrock, with atomic per-user/day/
 * task budget reservations (docs/10-API-CONTRACTS.md section 6). Calling
 * Anthropic directly from the desktop with a locally-stored key means:
 *   - no server-side budget enforcement — only the client-side TaskBudget
 *     (packages/agent-runtime/src/budget.ts) and this port's own cost
 *     estimate limit it
 *   - the user's own Anthropic key and spend, not a metered proxy
 * Swap this for a real BedrockCognitionPort (calling POST /v1/cognition once
 * cloud/cognition is deployed) without touching any caller — same interface.
 */
import { newId, nowIso, type AgentId, type Id, type Route, type UsageRecord } from '@klip/contracts';
import type { CognitionPort, CognitionResult } from './conversation.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// Verify this model id is available on your account before relying on it;
// Anthropic model availability/naming changes over time.
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

// Rough published per-token estimate for cost display only — NOT the
// dated, server-recorded price table docs/10 section 1 requires for the
// real Bedrock path.
const ESTIMATED_INPUT_RATE_MICROUSD = 3; // $3 / 1M input tokens
const ESTIMATED_OUTPUT_RATE_MICROUSD = 15; // $15 / 1M output tokens

export interface AnthropicCognitionPortOptions {
  getApiKey: () => string | null;
  model?: string;
  maxOutputTokens?: number;
}

const SYSTEM_PROMPT =
  'You are KLIP, a friendly Windows desktop companion. Keep replies short and speech-friendly ' +
  '(1-3 sentences) unless the user clearly wants detail. You cannot see the screen or perform ' +
  'actions in this conversation mode — if the user wants something opened, revealed, searched, ' +
  'or written to disk, tell them to phrase it as a direct command (e.g. "open notepad") instead.';

export class AnthropicCognitionPort implements CognitionPort {
  constructor(private readonly options: AnthropicCognitionPortOptions) {}

  get available(): boolean {
    return Boolean(this.options.getApiKey());
  }

  async complete(taskId: Id, agent: AgentId, route: Route, prompt: string): Promise<CognitionResult> {
    const apiKey = this.options.getApiKey();
    const requestId = newId();
    if (!apiKey) {
      return {
        text: "I don't have an Anthropic API key configured yet — add one in Settings to enable open-ended conversation.",
        usage: emptyUsage(requestId, taskId, agent, route),
      };
    }

    const maxTokens = this.options.maxOutputTokens ?? 600;
    try {
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
        },
        body: JSON.stringify({
          model: this.options.model ?? DEFAULT_MODEL,
          max_tokens: maxTokens,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return {
          text: `I couldn't reach Anthropic (HTTP ${response.status}): ${truncate(errText, 200)}`,
          usage: emptyUsage(requestId, taskId, agent, route),
        };
      }

      const body = (await response.json()) as {
        content?: { type: string; text?: string }[];
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      const text = (body.content ?? [])
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text)
        .join('\n')
        .trim() || "I didn't get a text response back.";

      const inputTokens = body.usage?.input_tokens ?? 0;
      const outputTokens = body.usage?.output_tokens ?? 0;
      const estimatedCostMicrousd = inputTokens * ESTIMATED_INPUT_RATE_MICROUSD + outputTokens * ESTIMATED_OUTPUT_RATE_MICROUSD;

      const usage: UsageRecord = {
        id: newId(),
        requestId,
        taskId,
        agent,
        route,
        provider: 'anthropic',
        modelId: this.options.model ?? DEFAULT_MODEL,
        inputTokens,
        outputTokens,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        estimatedCostMicrousd,
        reservedMicrousd: 0,
        state: 'settled',
        priceVersion: 'direct-anthropic-estimate-v1',
        createdAt: nowIso(),
      };

      return { text, usage };
    } catch (err) {
      return {
        text: `I couldn't reach Anthropic: ${err instanceof Error ? err.message : String(err)}`,
        usage: emptyUsage(requestId, taskId, agent, route),
      };
    }
  }
}

function emptyUsage(requestId: Id, taskId: Id, agent: AgentId, route: Route): UsageRecord {
  return {
    id: newId(),
    requestId,
    taskId,
    agent,
    route,
    provider: 'none',
    inputTokens: null,
    outputTokens: null,
    cacheReadTokens: null,
    cacheWriteTokens: null,
    estimatedCostMicrousd: 0,
    reservedMicrousd: 0,
    state: 'local',
    createdAt: nowIso(),
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + '…' : text;
}
