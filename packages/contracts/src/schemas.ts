/**
 * Runtime validation for the narrow renderer <-> main IPC boundary
 * (docs/10-API-CONTRACTS.md section 9, docs/09-SECURITY-TRUST.md section 5).
 * Reject unknown fields at this privileged boundary.
 */
import { z } from 'zod';

export const CloudModeSchema = z.enum(['local-only', 'balanced', 'ask-every-time']);

export const SubmitIntentSchema = z
  .object({
    text: z.string().min(1).max(2000),
    source: z.enum(['voice', 'text', 'sdk']),
    sessionId: z.string().uuid(),
  })
  .strict();

export const CancelTaskSchema = z
  .object({
    taskId: z.string().uuid(),
  })
  .strict();

export const ResolveApprovalSchema = z
  .object({
    requestId: z.string().uuid(),
    decision: z.enum(['approve', 'reject']),
  })
  .strict();

export const SetMicrophoneMutedSchema = z
  .object({
    muted: z.boolean(),
  })
  .strict();

export const SetCloudModeSchema = z
  .object({
    mode: CloudModeSchema,
  })
  .strict();

export const GrantSharingSchema = z
  .object({
    taskId: z.string().uuid(),
    windowId: z.string().min(1),
    allowedKinds: z.array(z.enum(['text', 'image'])).min(1),
    region: z
      .object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
      .strict()
      .optional(),
  })
  .strict();

export const RevokeSharingSchema = z
  .object({
    grantId: z.string().uuid(),
  })
  .strict();

export const SetExpandedSchema = z
  .object({
    expanded: z.boolean(),
  })
  .strict();

export const ForgetHistorySchema = z
  .object({
    scope: z.enum(['all', 'conversation', 'preferences']).default('all'),
  })
  .strict();

export const SetApiKeySchema = z
  .object({
    name: z.enum(['anthropic', 'openai']),
    apiKey: z.string().max(4000),
  })
  .strict();

export const DeleteApiKeySchema = z
  .object({
    name: z.enum(['anthropic', 'openai']),
  })
  .strict();

export const SetShortcutSchema = z
  .object({
    accelerator: z.string().min(1).max(64),
  })
  .strict();

export type SubmitIntentInput = z.infer<typeof SubmitIntentSchema>;
export type ResolveApprovalInput = z.infer<typeof ResolveApprovalSchema>;
