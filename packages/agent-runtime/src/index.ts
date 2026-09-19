/**
 * KlipAgentRuntime — the orchestrator that ties the local router, the
 * supervisor/desktop/conversation agents, the approval broker, the desktop
 * SDK and local memory together (docs/05-AGENT-WORKFORCE.md section 7).
 *
 * This is the "local agent runner" from docs/02-SYSTEM-ARCHITECTURE.md — in
 * H24 target architecture it lives in its own Node utility process; in this
 * baseline it runs inside the Electron main process for simplicity (tracked
 * follow-up, noted in apps/desktop/README).
 */
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import {
  newId,
  nowIso,
  type ActionOutcome,
  type AgentId,
  type ApprovalRequest,
  type CloudMode,
  type CompanionState,
  type CompanionStatus,
  type HistoryTaskEntry,
  type Id,
  type Intent,
  type Route,
  type UsageRecord,
} from '@klip/contracts';
import { KlipDesktopClient, folderRegistry, findLatestDownload, type OpenerPort } from '@klip/desktop-sdk';
import { MemoryStore } from '@klip/memory';
import { LocalRouter, draftNoteAction, noteDraftPath, type RouterMatch } from './router.js';
import { ApprovalBroker } from './approvals.js';
import { DesktopAgent } from './agents/desktop.js';
import { ConversationAgent, NullCognitionPort, type CognitionPort } from './agents/conversation.js';
import { Supervisor } from './agents/supervisor.js';
import { TaskScheduler } from './scheduler.js';
import { TaskBudget } from './budget.js';

export type RuntimeEventType = 'companion.state' | 'voice.transcript' | 'task.progress' | 'approval.requested' | 'action.completed' | 'usage.updated' | 'error';

export interface RuntimeEvent<T = unknown> {
  id: Id;
  taskId?: Id;
  sequence: number;
  emittedAt: string;
  type: RuntimeEventType;
  payload: T;
}

export interface HandleIntentResult {
  taskId: Id;
  agent: AgentId;
  route: Route;
  responseText: string;
  outcomes: ActionOutcome[];
}

export interface KlipAgentRuntimeOptions {
  dataDir: string;
  opener?: OpenerPort;
  cognition?: CognitionPort;
}

export class KlipAgentRuntime extends EventEmitter {
  readonly router = new LocalRouter();
  readonly supervisor = new Supervisor();
  readonly desktopClient: KlipDesktopClient;
  readonly memory: MemoryStore;
  private readonly approvals: ApprovalBroker;
  private readonly desktopAgent: DesktopAgent;
  private readonly conversationAgent: ConversationAgent;
  private readonly scheduler = new TaskScheduler();
  private sequence = 0;
  private status: CompanionStatus = {
    state: 'idle',
    connectivity: 'online',
    microphone: 'armed',
    cloud: 'disabled',
    speechLevel: 0,
  };
  private readonly activeCancellations = new Set<Id>();

  constructor(private readonly options: KlipAgentRuntimeOptions) {
    super();
    this.desktopClient = new KlipDesktopClient({ opener: options.opener });
    this.memory = new MemoryStore(options.dataDir);
    this.approvals = new ApprovalBroker((req) => this.emitEvent('approval.requested', req, req.taskId));
    this.desktopAgent = new DesktopAgent(this.desktopClient, this.approvals);
    this.conversationAgent = new ConversationAgent(options.cognition ?? new NullCognitionPort());
  }

  async init(): Promise<void> {
    await this.desktopClient.connect();
    await this.memory.init();
    // Restart hygiene: never resume old approvals/mutations (docs/04-SDD.md section 9).
    this.approvals.invalidateAllOnRestart();
  }

  getCurrentState(): CompanionStatus {
    return this.status;
  }

  setMicrophoneMuted(muted: boolean): void {
    this.status = { ...this.status, microphone: muted ? 'muted' : 'armed' };
    this.emitEvent('companion.state', this.status);
  }

  setCloudMode(_mode: CloudMode): void {
    // Recorded for future cloud wiring; H24 baseline has no deployed cognition
    // proxy, so `cloud` stays 'disabled' regardless of requested mode.
    this.emitEvent('companion.state', this.status);
  }

  async getHistory(limit?: number): Promise<HistoryTaskEntry[]> {
    return this.memory.listHistory(limit);
  }

  async forgetHistory(scope: 'all' | 'conversation' | 'preferences' = 'all'): Promise<void> {
    await this.memory.forgetHistory(scope);
  }

  async getUsage(day?: string) {
    return { rows: this.memory.listUsage(day), totals: this.memory.usageTotals(day) };
  }

  async resolveApproval(requestId: Id, decision: 'approve' | 'reject'): Promise<boolean> {
    return this.approvals.resolve(requestId, decision);
  }

  async cancelTask(taskId: Id): Promise<{ acknowledged: boolean }> {
    this.activeCancellations.add(taskId);
    this.approvals.invalidateAllForTask(taskId);
    await this.desktopClient.cancel(taskId);
    this.setState('idle');
    return { acknowledged: true };
  }

  private setState(state: CompanionState): void {
    this.status = { ...this.status, state };
    this.emitEvent('companion.state', this.status);
  }

  private emitEvent<T>(type: RuntimeEventType, payload: T, taskId?: Id): void {
    const event: RuntimeEvent<T> = { id: newId(), taskId, sequence: ++this.sequence, emittedAt: nowIso(), type, payload };
    this.emit('event', event);
  }

  async handleIntent(text: string, source: Intent['source'], sessionId: Id): Promise<HandleIntentResult> {
    const intent: Intent = { id: newId(), text, source, sessionId, createdAt: nowIso(), cloudMode: 'balanced' };
    const taskId = newId();
    const budget = new TaskBudget();
    this.setState('thinking');

    const match = this.router.route(text);
    let result: HandleIntentResult;
    try {
      result = match
        ? await this.runLocalCommand(taskId, match, budget)
        : await this.runNovel(taskId, intent, budget);
    } catch (err) {
      this.setState('error');
      const message = err instanceof Error ? err.message : String(err);
      this.emitEvent('error', { message }, taskId);
      return { taskId, agent: 'conversation', route: 'local-command', responseText: `Something went wrong: ${message}`, outcomes: [] };
    }

    if (this.activeCancellations.has(taskId)) {
      this.activeCancellations.delete(taskId);
    } else {
      this.setState(result.outcomes.some((o) => o.status === 'failed' || o.status === 'refused') ? 'error' : 'success');
    }

    await this.memory.recordTask({
      id: taskId,
      requestText: text,
      agent: result.agent,
      route: result.route,
      status: 'completed',
      createdAt: intent.createdAt,
      finishedAt: nowIso(),
      actions: result.outcomes,
      usage: [],
    });

    if (result.route === 'local-command' || result.route === 'local-model') {
      await this.memory.recordUsage({
        id: newId(),
        requestId: newId(),
        taskId,
        agent: result.agent,
        route: result.route,
        provider: 'none',
        inputTokens: null,
        outputTokens: null,
        cacheReadTokens: null,
        cacheWriteTokens: null,
        estimatedCostMicrousd: 0,
        reservedMicrousd: 0,
        state: 'local',
        createdAt: nowIso(),
      });
    }

    return result;
  }

  private async runLocalCommand(taskId: Id, match: RouterMatch, budget: TaskBudget): Promise<HandleIntentResult> {
    const knownApps = this.router.knownAppIds();
    switch (match.kind) {
      case 'greeting':
        this.setState('speaking');
        return { taskId, agent: 'conversation', route: 'local-command', responseText: this.conversationAgent.greeting(), outcomes: [] };
      case 'help':
        this.setState('speaking');
        return { taskId, agent: 'conversation', route: 'local-command', responseText: this.conversationAgent.help(knownApps), outcomes: [] };
      case 'clarify':
        this.setState('speaking');
        return { taskId, agent: 'conversation', route: 'local-command', responseText: match.question, outcomes: [] };
      case 'mute':
        this.setMicrophoneMuted(match.muted);
        return { taskId, agent: 'conversation', route: 'local-command', responseText: match.muted ? 'Microphone muted.' : 'Microphone unmuted.', outcomes: [] };
      case 'cancel':
        await this.cancelTask(taskId);
        return { taskId, agent: 'conversation', route: 'local-command', responseText: 'Cancelled.', outcomes: [] };
      case 'usage': {
        const { totals } = await this.getUsage();
        const dollars = (totals.settledMicrousd / 1_000_000).toFixed(4);
        return {
          taskId,
          agent: 'conversation',
          route: 'local-command',
          responseText: `So far: ${totals.localCount} local request(s) at zero cloud cost, ${totals.cloudCount} cloud request(s), $${dollars} settled.`,
          outcomes: [],
        };
      }
      case 'open-app': {
        this.setState('acting');
        budget.takeStep();
        const outcome = await this.desktopAgent.run(taskId, {
          action: { kind: 'app.open', appId: match.appId },
          assertions: [{ kind: 'window.exists', appId: match.appId }],
          summary: `Open ${match.appId}`,
        });
        this.emitEvent('action.completed', outcome, taskId);
        return { taskId, agent: 'desktop', route: 'local-command', responseText: this.describeOutcome(outcome, `Opened ${match.appId}`), outcomes: [outcome] };
      }
      case 'open-folder': {
        this.setState('acting');
        budget.takeStep();
        const outcome = await this.desktopAgent.run(taskId, {
          action: { kind: 'file.reveal', path: match.path },
          summary: `Reveal ${match.folderId}`,
        });
        this.emitEvent('action.completed', outcome, taskId);
        return { taskId, agent: 'desktop', route: 'local-command', responseText: this.describeOutcome(outcome, `Opened your ${match.folderId} folder`), outcomes: [outcome] };
      }
      case 'latest-download': {
        this.setState('acting');
        budget.takeStep();
        const candidate = await findLatestDownload();
        if (!candidate) {
          return { taskId, agent: 'desktop', route: 'local-command', responseText: 'Your Downloads folder has no recent completed files.', outcomes: [] };
        }
        const action = candidate.supported ? ({ kind: 'file.open', path: candidate.path } as const) : ({ kind: 'file.reveal', path: candidate.path } as const);
        const outcome = await this.desktopAgent.run(taskId, {
          action,
          summary: candidate.supported ? `Open latest download ${candidate.name}` : `Reveal latest download ${candidate.name} (unsupported/executable file — revealed, not launched)`,
        });
        this.emitEvent('action.completed', outcome, taskId);
        const verb = candidate.supported ? 'Opened' : 'Revealed (not opened — unsupported or executable file)';
        return { taskId, agent: 'desktop', route: 'local-command', responseText: `${verb} your latest download: ${candidate.name}`, outcomes: [outcome] };
      }
      case 'browser-search': {
        this.setState('acting');
        budget.takeStep();
        const outcome = await this.desktopAgent.run(taskId, {
          action: { kind: 'browser.search', browserId: 'default', engine: match.engine, query: match.query },
          summary: `Search ${match.engine} for "${match.query}"`,
        });
        this.emitEvent('action.completed', outcome, taskId);
        return { taskId, agent: 'desktop', route: 'local-command', responseText: this.describeOutcome(outcome, `Searched ${match.engine} for "${match.query}"`), outcomes: [outcome] };
      }
      case 'write-note': {
        this.setState('acting');
        budget.takeStep();
        const draftPath = noteDraftPath();
        let expectedSha256: string | null = null;
        try {
          const existing = await fs.readFile(draftPath);
          expectedSha256 = createHash('sha256').update(existing).digest('hex');
        } catch {
          expectedSha256 = null; // does not exist yet -> create-only
        }
        const outcome = await this.desktopAgent.run(taskId, {
          action: draftNoteAction(match.content, expectedSha256),
          summary: expectedSha256 ? `Overwrite draft note with "${match.content}"` : `Create draft note with "${match.content}"`,
          affectedResources: [draftPath],
        });
        this.emitEvent('action.completed', outcome, taskId);
        const responseText =
          outcome.status === 'cancelled'
            ? 'Okay, I left the note unchanged.'
            : this.describeOutcome(outcome, `Updated your draft note (${draftPath})`);
        return { taskId, agent: 'desktop', route: 'local-command', responseText, outcomes: [outcome] };
      }
    }
  }

  private async runNovel(taskId: Id, intent: Intent, budget: TaskBudget): Promise<HandleIntentResult> {
    const plan = this.supervisor.plan(intent, taskId);
    this.emitEvent('task.progress', plan, taskId);

    const outcomes: ActionOutcome[] = [];
    let agent: AgentId = 'conversation';
    let responseText = '';

    const results = await this.scheduler.run(plan, async (node) => {
      agent = node.agent;
      if (node.agent === 'conversation') {
        this.setState('thinking');
        budget.takeCloudCall();
        const result = await this.conversationAgent.openEnded(taskId, node.instruction);
        responseText = result.text;
        this.emitEvent('usage.updated', result.usage, taskId);
        await this.memory.recordUsage(result.usage);
        this.setState('speaking');
        return { nodeId: node.id, status: 'completed', outputs: { text: result.text }, evidenceActionIds: [] };
      }

      // "desktop" node without a resolved Action: honest limitation, not a fabricated tool call.
      responseText =
        `That sounds like a desktop task, but without a deployed cloud reasoning backend I can only run the fixed local commands ` +
        `(say "help" to list them). Once cloud/cognition is deployed, the desktop specialist will be able to plan new UI actions for this.`;
      this.setState('speaking');
      return { nodeId: node.id, status: 'partial', outputs: {}, evidenceActionIds: [] };
    });

    void results;
    return { taskId, agent, route: agent === 'conversation' ? 'cloud-text' : 'local-command', responseText, outcomes };
  }

  private describeOutcome(outcome: ActionOutcome, successText: string): string {
    if (outcome.status === 'verified') return successText + '.';
    if (outcome.status === 'unknown') return `${successText} — but I couldn't independently confirm it finished.`;
    if (outcome.status === 'refused') return `I can't do that: ${outcome.error?.message ?? 'refused by policy'}`;
    if (outcome.status === 'cancelled') return 'Cancelled before it finished.';
    if (outcome.status === 'failed') return `That failed: ${outcome.error?.message ?? 'unknown error'}`;
    return `${successText}.`;
  }
}

export { folderRegistry };
export * from './router.js';
export * from './approvals.js';
export * from './budget.js';
export * from './scheduler.js';
export * from './agents/desktop.js';
export * from './agents/conversation.js';
export * from './agents/supervisor.js';
export * from './agents/anthropicCognitionPort.js';
