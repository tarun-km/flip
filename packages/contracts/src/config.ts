/**
 * Shared configuration defaults.
 * Authoritative source: docs/10-API-CONTRACTS.md section 1.
 * These are H24 defaults; raising them requires operator/server config, never model output.
 */
export const KLIP_DEFAULTS = {
  platform: 'windows-x64',
  cloudMode: 'balanced',
  historyEnabled: false,
  wakePhrase: 'hey klip',
  followupWindowMs: 15_000,
  utteranceMaxMs: 20_000,
  maxActionSteps: 12,
  maxCloudCallsPerTask: 6,
  maxConcurrentReasoners: 2,
  maxConcurrentCloudCalls: 1,
  maxConcurrentMutations: 1,
  taskTimeoutMs: 120_000,
  approvalTtlMs: 120_000,
  snapshotTtlMs: 2_000,
  uiaReadTimeoutMs: 1_500,
  maxUiaNodes: 500,
  maxUiaDepth: 8,
  actionTimeoutMs: 10_000,
  maxSafeRetries: 1,
  maxImageEdgePx: 1024,
  maxImageBytes: 1_048_576,
  maxCloudRequestBytes: 2_097_152,
  maxContextTokens: 4_000,
  maxOutputTokens: 600,
  modelDeadlineMs: 20_000,
  lambdaTimeoutSeconds: 25,
  httpClientTimeoutMs: 28_000,
  perCallLimitMicrousd: 50_000,
  perTaskLimitMicrousd: 200_000,
  perUserDayLimitMicrousd: 2_000_000,
  projectInferenceLimitMicrousd: 30_000_000,
  eventSpendTargetMicrousd: 40_000_000,
} as const;

export const PROTOCOL_MAJOR = 1 as const;
