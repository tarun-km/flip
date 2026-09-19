/**
 * Approval broker for R3 actions (docs/09-SECURITY-TRUST.md section 4,
 * docs/10-API-CONTRACTS.md section 6). Tokens are minted only after a real
 * renderer decision reaches resolve(); agents never see a minting method.
 */
import { createHash } from 'node:crypto';
import { newId, nowIso, KLIP_DEFAULTS, type Action, type ApprovalRequest, type Id } from '@klip/contracts';

function canonicalHash(value: unknown): string {
  const canonical = JSON.stringify(value, Object.keys(value as object).sort());
  return createHash('sha256').update(canonical).digest('hex');
}

interface PendingApproval {
  request: ApprovalRequest;
  resolve: (decision: 'approve' | 'reject') => void;
}

export class ApprovalBroker {
  private pending = new Map<Id, PendingApproval>();

  constructor(private readonly onRequested: (request: ApprovalRequest) => void) {}

  async requestApproval(taskId: Id, actionId: Id, action: Action, summary: string, affectedResources: string[]): Promise<'approve' | 'reject'> {
    const id = newId();
    const payloadHash = canonicalHash(action);
    const request: ApprovalRequest = {
      id,
      taskId,
      actionId,
      risk: 'R3',
      summary,
      exactAction: action,
      payloadHash,
      affectedResources,
      createdAt: nowIso(),
      expiresAt: new Date(Date.now() + KLIP_DEFAULTS.approvalTtlMs).toISOString(),
    };

    const decision = await new Promise<'approve' | 'reject'>((resolve) => {
      this.pending.set(id, { request, resolve });
      this.onRequested(request);
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          resolve('reject');
        }
      }, KLIP_DEFAULTS.approvalTtlMs);
    });

    return decision;
  }

  resolve(requestId: Id, decision: 'approve' | 'reject'): boolean {
    const entry = this.pending.get(requestId);
    if (!entry) return false;
    this.pending.delete(requestId);
    entry.resolve(decision);
    return true;
  }

  invalidateAllForTask(taskId: Id): void {
    for (const [id, entry] of this.pending.entries()) {
      if (entry.request.taskId === taskId) {
        this.pending.delete(id);
        entry.resolve('reject');
      }
    }
  }

  invalidateAllOnRestart(): void {
    for (const [id, entry] of this.pending.entries()) {
      this.pending.delete(id);
      entry.resolve('reject');
    }
  }
}
