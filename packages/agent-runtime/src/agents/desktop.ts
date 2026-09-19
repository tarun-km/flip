/**
 * Desktop specialist (docs/05-AGENT-WORKFORCE.md section 4).
 * observe -> resolve -> propose -> execute through SDK -> verify -> update.
 * Does not authorize itself: R3 effects still pass through the approval broker.
 */
import { newActionRequest, classifyRisk, requiresApproval, type KlipDesktopClient } from '@klip/desktop-sdk';
import type { Action, ActionOutcome, Assertion, Id } from '@klip/contracts';
import type { ApprovalBroker } from '../approvals.js';

export interface DesktopStep {
  action: Action;
  assertions?: Assertion[];
  summary: string;
  affectedResources?: string[];
}

export class DesktopAgent {
  constructor(
    private readonly client: KlipDesktopClient,
    private readonly approvals: ApprovalBroker,
  ) {}

  async run(taskId: Id, step: DesktopStep): Promise<ActionOutcome> {
    const request = newActionRequest(taskId, step.action, step.assertions ?? []);
    const risk = classifyRisk(step.action);

    if (requiresApproval(step.action)) {
      const decision = await this.approvals.requestApproval(
        taskId,
        request.id,
        step.action,
        step.summary,
        step.affectedResources ?? [],
      );
      if (decision === 'reject') {
        return {
          actionId: request.id,
          taskId,
          status: 'cancelled',
          executed: false,
          verified: false,
          evidence: [],
          adapter: 'native',
          attempts: 0,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        };
      }
    }

    void risk; // classification is enforced by requiresApproval(); retained for future logging
    return this.client.execute(request);
  }
}
