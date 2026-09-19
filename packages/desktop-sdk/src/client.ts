/**
 * KlipDesktopClient — implements the public KlipDesktop interface
 * (docs/10-API-CONTRACTS.md section 5).
 *
 * In the target architecture this talks over JSON-RPC to the C# helper
 * process. In this H24 baseline there is no helper yet, so the client drives
 * LocalWindowsAdapter directly in-process. The interface is identical either
 * way, so swapping in the real helper later is a transport change, not a
 * contract change.
 */
import {
  newId,
  nowIso,
  type ActionOutcome,
  type ActionRequest,
  type DesktopSnapshot,
  type FindRequest,
  type FindResult,
  type Id,
  type KlipDesktop,
  type ObserveRequest,
} from '@klip/contracts';
import { LocalWindowsAdapter } from './localAdapter.js';
import { NodeOpener, type OpenerPort } from './opener.js';

export interface KlipDesktopClientOptions {
  opener?: OpenerPort;
}

export class KlipDesktopClient implements KlipDesktop {
  private readonly adapter: LocalWindowsAdapter;
  private connected = false;
  private readonly cancelledTasks = new Set<Id>();

  constructor(options: KlipDesktopClientOptions = {}) {
    this.adapter = new LocalWindowsAdapter(options.opener ?? new NodeOpener());
  }

  async connect(): Promise<{ protocolMajor: 1; capabilities: string[] }> {
    this.connected = true;
    return {
      protocolMajor: 1,
      capabilities: ['app.open', 'file.reveal', 'file.open', 'file.writeText', 'browser.search'],
    };
  }

  async observe(request: ObserveRequest): Promise<DesktopSnapshot> {
    this.assertConnected();
    return this.adapter.observe(request);
  }

  async findElement(_request: FindRequest): Promise<FindResult> {
    this.assertConnected();
    return { status: 'not-found', candidates: [], method: 'uia' };
  }

  async execute(request: ActionRequest): Promise<ActionOutcome> {
    this.assertConnected();
    if (this.cancelledTasks.has(request.taskId)) {
      return {
        actionId: request.id,
        taskId: request.taskId,
        status: 'cancelled',
        executed: false,
        verified: false,
        evidence: [],
        adapter: 'native',
        attempts: 0,
        startedAt: nowIso(),
        finishedAt: nowIso(),
      };
    }
    return this.adapter.execute(request);
  }

  async cancel(taskId: Id): Promise<{ acknowledged: boolean; inFlightActionId?: Id }> {
    this.cancelledTasks.add(taskId);
    return { acknowledged: true };
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  private assertConnected() {
    if (!this.connected) throw new Error('KlipDesktopClient: call connect() first');
  }
}

export function newActionRequest(taskId: Id, action: ActionRequest['action'], assertions: ActionRequest['assertions'] = []): ActionRequest {
  return {
    id: newId(),
    taskId,
    action,
    assertions,
    deadlineAt: new Date(Date.now() + 10_000).toISOString(),
  };
}
