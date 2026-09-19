/**
 * Conversation specialist (docs/05-AGENT-WORKFORCE.md section 5).
 * Local templates for greetings/predictable replies. Open-ended text routes
 * through CognitionPort, which is a NullCognitionPort until cloud/cognition
 * (AWS Cognito -> API Gateway -> Lambda -> Bedrock) is actually deployed —
 * this baseline never fabricates a cloud answer.
 */
import { newId, nowIso, type AgentId, type Id, type Route, type UsageRecord } from '@klip/contracts';

export interface CognitionResult {
  text: string;
  usage: UsageRecord;
}

export interface CognitionPort {
  readonly available: boolean;
  complete(taskId: Id, agent: AgentId, route: Route, prompt: string): Promise<CognitionResult>;
}

/** Honest placeholder until cloud/cognition is deployed (docs/08-AWS-INFRASTRUCTURE.md). */
export class NullCognitionPort implements CognitionPort {
  readonly available = false;

  async complete(taskId: Id, agent: AgentId, route: Route): Promise<CognitionResult> {
    return {
      text:
        "I can't reason about that yet — the AWS cognition proxy (Cognito -> API Gateway -> Lambda -> Bedrock, see cloud/cognition) isn't deployed in this build. " +
        'Local commands like "open Downloads," "search Google for...", or "open Notepad" still work with zero cloud calls.',
      usage: {
        id: newId(),
        requestId: newId(),
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
      },
    };
  }
}

export class ConversationAgent {
  constructor(private readonly cognition: CognitionPort = new NullCognitionPort()) {}

  greeting(): string {
    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return `Good ${timeOfDay}. I'm running locally right now — ask me to open an app, reveal a folder, search the web, or say "help" to see what I can do.`;
  }

  help(knownApps: string[]): string {
    return (
      `Here's what runs locally with zero cloud calls: ` +
      `"open ${knownApps.join('", "open ')}", "open downloads/documents/desktop/pictures", ` +
      `"open my latest download", "search google for <query>", "create a note", ` +
      `"mute"/"unmute", "cancel", and "what did you spend?". Anything else goes to the conversation specialist.`
    );
  }

  async openEnded(taskId: Id, text: string): Promise<CognitionResult> {
    return this.cognition.complete(taskId, 'conversation', 'cloud-text', text);
  }
}
