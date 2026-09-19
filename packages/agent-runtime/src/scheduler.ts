/**
 * Minimal task scheduler (docs/10-API-CONTRACTS.md section 7,
 * docs/04-SDD.md section 7). Validates dependencies and runs nodes in
 * topological order. A missing/failed dependency stops its dependents —
 * outputs are never invented.
 */
import type { NodeResult, TaskNode, TaskPlan } from '@klip/contracts';

export type NodeExecutor = (node: TaskNode, inputs: Record<string, unknown>) => Promise<NodeResult>;

export class PlanValidationError extends Error {}

export class TaskScheduler {
  validate(plan: TaskPlan): void {
    const ids = new Set(plan.nodes.map((n) => n.id));
    for (const node of plan.nodes) {
      for (const dep of node.dependsOn) {
        if (!ids.has(dep)) throw new PlanValidationError(`Node ${node.id} depends on unknown node ${dep}`);
      }
    }
    // Cheap cycle check (Kahn's algorithm).
    const indegree = new Map(plan.nodes.map((n) => [n.id, n.dependsOn.length]));
    const queue = plan.nodes.filter((n) => n.dependsOn.length === 0).map((n) => n.id);
    let visited = 0;
    while (queue.length) {
      const id = queue.shift()!;
      visited++;
      for (const n of plan.nodes) {
        if (n.dependsOn.includes(id)) {
          indegree.set(n.id, (indegree.get(n.id) ?? 0) - 1);
          if (indegree.get(n.id) === 0) queue.push(n.id);
        }
      }
    }
    if (visited !== plan.nodes.length) throw new PlanValidationError('Task plan has a dependency cycle');
  }

  async run(plan: TaskPlan, executor: NodeExecutor): Promise<Map<string, NodeResult>> {
    this.validate(plan);
    const results = new Map<string, NodeResult>();
    const remaining = new Set(plan.nodes.map((n) => n.id));

    while (remaining.size > 0) {
      const ready = plan.nodes.filter((n) => remaining.has(n.id) && n.dependsOn.every((d) => results.has(d)));
      if (ready.length === 0) break; // shouldn't happen after validate(); defensive stop

      for (const node of ready) {
        const failedDep = node.dependsOn.find((d) => results.get(d)?.status !== 'completed');
        if (failedDep) {
          results.set(node.id, {
            nodeId: node.id,
            status: 'failed',
            outputs: {},
            evidenceActionIds: [],
            error: { code: 'INTERNAL', message: `Dependency ${failedDep} did not complete`, retryable: false },
          });
          remaining.delete(node.id);
          continue;
        }

        const inputs: Record<string, unknown> = {};
        for (const [key, ref] of Object.entries(node.inputs)) {
          inputs[key] = results.get(ref.nodeId)?.outputs[ref.outputKey];
        }

        const result = await executor(node, inputs);
        results.set(node.id, result);
        remaining.delete(node.id);
      }
    }

    return results;
  }
}
