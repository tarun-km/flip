/**
 * Supervisor (docs/05-AGENT-WORKFORCE.md section 3). Invoked only for text the
 * local grammar did not resolve (docs/04-SDD.md section 7: unrecognized input
 * must not be forced into the nearest supported command). Selects the
 * minimum useful specialist rather than always fanning out.
 */
import { newId, type Id, type Intent, type TaskNode, type TaskPlan } from '@klip/contracts';

const DESKTOP_HINT = /\b(open|click|type|edit|reveal|close|save|window|file|folder|app)\b/i;

export class Supervisor {
  plan(intent: Intent, taskId: Id): TaskPlan {
    const looksLikeDesktopTask = DESKTOP_HINT.test(intent.text);
    const node: TaskNode = {
      id: newId(),
      agent: looksLikeDesktopTask ? 'desktop' : 'conversation',
      instruction: intent.text,
      dependsOn: [],
      inputs: {},
      outputSchemaId: looksLikeDesktopTask ? 'desktop.freeform.v1' : 'conversation.reply.v1',
      status: 'queued',
    };
    return { taskId, intentId: intent.id, nodes: [node] };
  }
}
