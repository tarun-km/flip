/**
 * Per-task step/call budget (docs/05-AGENT-WORKFORCE.md section 7,
 * docs/10-API-CONTRACTS.md maxActionSteps / maxCloudCallsPerTask).
 * Delegation does not create new allowances — one task has one counter.
 */
import { KLIP_DEFAULTS } from '@klip/contracts';

export class BudgetExceededError extends Error {}

export class TaskBudget {
  private steps = 0;
  private cloudCalls = 0;

  constructor(
    private readonly maxSteps = KLIP_DEFAULTS.maxActionSteps,
    private readonly maxCloudCalls = KLIP_DEFAULTS.maxCloudCallsPerTask,
  ) {}

  takeStep(): void {
    this.steps += 1;
    if (this.steps > this.maxSteps) {
      throw new BudgetExceededError(`Task exceeded ${this.maxSteps} action steps`);
    }
  }

  takeCloudCall(): void {
    this.cloudCalls += 1;
    if (this.cloudCalls > this.maxCloudCalls) {
      throw new BudgetExceededError(`Task exceeded ${this.maxCloudCalls} cloud calls`);
    }
  }

  get usedSteps(): number {
    return this.steps;
  }

  get usedCloudCalls(): number {
    return this.cloudCalls;
  }
}
