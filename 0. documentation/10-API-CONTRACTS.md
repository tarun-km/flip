# KLIP — API Contracts and Shared Defaults

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Protocol/schema major:** 1

This document is authoritative for field names, state names, defaults and interface semantics throughout the set. Interfaces below are implementation blueprints, not an existing published package. Implement runtime validation in TypeScript and C#, generate JSON Schema, and reject unknown fields at privileged boundaries. JSON dates are UTC ISO 8601 strings; durations are integer milliseconds; money is integer USD microdollars (1 USD = 1,000,000).

## 1. Shared configuration

| Parameter | H24 default | Meaning |
|---|---|---|
| `platform` | `windows-x64` | Windows 11 interactive user session |
| `cloudMode` | `balanced` | Local route first; cloud within disclosed permission/budget |
| `historyEnabled` | `false` | Opt in to persistent conversation text |
| `wakePhrase` | `hey klip` | Configure phonetic variants in selected keyword model |
| `followupWindowMs` | 15000 | Follow-up listening ends on timeout, mute or cancellation |
| `utteranceMaxMs` | 20000 | Bound individual recording/transcription turn |
| `maxActionSteps` | 12 | Task-wide action proposals, including retries |
| `maxCloudCallsPerTask` | 6 | All agents, retries and model escalation combined |
| `maxConcurrentReasoners` | 2 | Independent local/background reasoning jobs |
| `maxConcurrentCloudCalls` | 1 | Per device default; server adds per-user rate limit |
| `maxConcurrentMutations` | 1 | Global desktop mutation queue |
| `taskTimeoutMs` | 120000 | Active work time; approval wait excluded |
| `approvalTtlMs` | 120000 | Expired approval cannot dispatch |
| `snapshotTtlMs` | 2000 | Upper bound only; relevant events invalidate sooner |
| `uiaReadTimeoutMs` | 1500 | Cancel/abort bounded observation |
| `maxUiaNodes` | 500 | Expand targeted subtrees rather than full desktop |
| `maxUiaDepth` | 8 | Additional depth needs another bounded query |
| `actionTimeoutMs` | 10000 | Default; app launch may declare up to 15000 |
| `maxSafeRetries` | 1 | Only declared retry-safe operations |
| `maxImageEdgePx` | 1024 | Resized crop longest edge |
| `maxImageBytes` | 1048576 | Decoded JPEG/PNG maximum |
| `maxCloudRequestBytes` | 2097152 | Entire encoded HTTP JSON body maximum |
| `maxContextTokens` | 4000 | Total text input including instructions/tool schemas/history |
| `maxOutputTokens` | 600 | Server cap for one inference |
| `modelDeadlineMs` | 20000 | Proxy abort target before Lambda timeout |
| `lambdaTimeoutSeconds` | 25 | Bounded synchronous inference, not long agent execution |
| `httpClientTimeoutMs` | 28000 | Timeout triggers reconciliation by request ID |
| `perCallLimitMicrousd` | 50000 | $0.05 maximum conservative inference reservation |
| `perTaskLimitMicrousd` | 200000 | $0.20 task inference budget |
| `perUserDayLimitMicrousd` | 2000000 | $2.00 per UTC day |
| `projectInferenceLimitMicrousd` | 30000000 | $30 Bedrock admission ceiling for event |
| `eventSpendTargetMicrousd` | 40000000 | $40 total planning target, not billing hard cap |

Image token allowance is additional to the text cap and included in the per-call reservation using the selected model's documented metering. If that bound cannot be established, the model/image request is not admitted. Local preference may lower budgets; raising them requires server configuration by the project operator, never model output.

## 2. Common types

```typescript
type Id = string; // UUID, validated at runtime
type IsoTime = string;
type RiskTier = 'R1' | 'R2' | 'R3' | 'R4';
type PerceptionTier = 'P1' | 'P2' | 'P3';
type Route = 'local-command' | 'local-model' | 'cloud-text' | 'cloud-vision';
type CloudMode = 'local-only' | 'balanced' | 'ask-every-time';
type AgentId = 'supervisor' | 'desktop' | 'conversation' | 'research' | 'documents';
type TaskStatus = 'queued' | 'running' | 'awaiting-approval' | 'paused'
  | 'completed' | 'partial' | 'failed' | 'cancelled' | 'unknown';
type ActionStatus = 'proposed' | 'validated' | 'awaiting-approval' | 'dispatched'
  | 'verified' | 'failed' | 'unknown' | 'cancelled' | 'refused';
interface RectPx { x: number; y: number; width: number; height: number }
interface AppIdentity { appId: string; pid: number; processStartedAt: IsoTime }
interface ErrorInfo {
  code: 'INVALID_SCHEMA' | 'UNSUPPORTED_CAPABILITY' | 'PERMISSION_DENIED'
    | 'AMBIGUOUS_TARGET' | 'STALE_TARGET' | 'APPROVAL_REQUIRED' | 'APPROVAL_EXPIRED'
    | 'PROHIBITED' | 'USER_INTERFERENCE' | 'VERIFICATION_FAILED' | 'OUTCOME_UNKNOWN'
    | 'BUDGET_EXCEEDED' | 'RATE_LIMITED' | 'MODEL_TIMEOUT' | 'OFFLINE'
    | 'UNAUTHORIZED' | 'REQUEST_CONFLICT' | 'INTERNAL';
  message: string;
  retryable: boolean;
}
interface Intent {
  id: Id; text: string; source: 'voice' | 'text' | 'sdk';
  sessionId: Id; createdAt: IsoTime; cloudMode: CloudMode;
}
```

Integers require explicit range checks. Coordinates may be negative on secondary monitors. Application identity includes process start time to detect PID reuse. Risk is computed by enforcement code; agent-supplied risk labels are hints only.

## 3. Observation and target binding

```typescript
interface ObserveRequest { appId?: string; windowId?: string; region?: RectPx; fresh: boolean }
interface Selector {
  strategy: 'automation-id' | 'role-name' | 'ancestor-path' | 'ocr-anchor';
  value: string; ancestor?: string; appVersion?: string;
}
interface DesktopElement {
  id: string; parentId: string | null; role: string; name: string;
  value?: string; bounds: RectPx; enabled: boolean; offscreen: boolean;
  sensitive: boolean; supportedPatterns: string[]; selector?: Selector;
}
interface DesktopSnapshot {
  id: Id; revision: number; capturedAt: IsoTime; app: AppIdentity;
  windowId: string; windowTitle: string; displayId: string;
  windowBounds: RectPx; focusedElementId: string | null;
  elements: DesktopElement[]; truncated: boolean; tier: PerceptionTier;
  invalidated: boolean;
}
interface TargetBinding {
  snapshotId: Id; snapshotRevision: number; app: AppIdentity;
  windowId: string; elementId: string; selector?: Selector;
  expectedRole: string; expectedName: string; bounds: RectPx;
}
interface FindRequest { snapshotId: Id; query: string; role?: string }
interface FindResult {
  status: 'resolved' | 'ambiguous' | 'not-found';
  target?: TargetBinding; candidates: string[];
  method: 'cache' | 'uia' | 'ocr' | 'vision';
}
```

Snapshot IDs identify immutable observations. Re-observation creates a new ID and a monotonic window revision. A target must be resolved again if its snapshot expires or an invalidating event occurs. Cached selectors aid discovery; they do not bypass binding checks.

All helper rectangles are physical screen pixels. Electron layout uses device-independent pixels and converts explicitly at the boundary. A VLM point is translated as `screenX = crop.x + imageX / scale`, with the equivalent Y transform. Check the transformed point falls inside the authorized crop and target window.

## 4. Tool actions and outcomes

```typescript
type Action =
  | { kind: 'app.open'; appId: string }
  | { kind: 'file.reveal'; path: string }
  | { kind: 'file.open'; path: string }
  | { kind: 'file.writeText'; path: string; content: string; expectedSha256: string | null }
  | { kind: 'browser.search'; browserId: string; engine: 'google' | 'bing'; query: string }
  | { kind: 'ui.invoke'; target: TargetBinding }
  | { kind: 'ui.type'; target: TargetBinding; text: string; replace: boolean }
  | { kind: 'ui.key'; target: TargetBinding; keys: string[] }
  | { kind: 'ui.scroll'; target: TargetBinding; deltaY: number };
type Assertion =
  | { kind: 'window.exists'; appId: string }
  | { kind: 'element.valueEquals'; target: TargetBinding; value: string }
  | { kind: 'file.sha256Equals'; path: string; sha256: string }
  | { kind: 'file.opened'; path: string; appId: string }
  | { kind: 'browser.urlEquals'; url: string; browserId: string }
  | { kind: 'element.exists'; windowId: string; selector: Selector };
interface ActionRequest {
  id: Id; taskId: Id; action: Action; assertions: Assertion[];
  deadlineAt: IsoTime; approvalTokenId?: Id;
}
interface Evidence {
  source: 'uia' | 'filesystem' | 'native-api' | 'browser' | 'ocr';
  observedAt: IsoTime; assertionIndex: number; matched: boolean;
  summary: string;
}
interface ActionOutcome {
  actionId: Id; taskId: Id; status: ActionStatus;
  executed: boolean | null; // null means dispatch effect is uncertain
  verified: boolean; evidence: Evidence[]; error?: ErrorInfo;
  adapter: 'native' | 'uia' | 'browser' | 'input'; attempts: number;
  startedAt: IsoTime; finishedAt: IsoTime;
}
```

`verified=true` requires status `verified`, nonempty successful assertions and fresh evidence. `unknown` is never automatically converted to success or retried. H24 implements only the listed action union. Send-mail and shell execution are not implicit extensions of `ui.key` or `ui.invoke`.

`expectedSha256=null` means create-only. Existing destinations require matching prior hash and R3 approval. The file adapter checks canonical paths and reparse points, rechecks identity immediately before write, and refuses changes it cannot bind safely.

The helper uses action IDs for an execution journal. A duplicate completed ID returns the recorded outcome. The same ID with different bytes returns `REQUEST_CONFLICT`. A dispatched record without terminal evidence returns `unknown` after restart.

## 5. Public TypeScript SDK

```typescript
interface KlipDesktop {
  connect(): Promise<{ protocolMajor: 1; capabilities: string[] }>;
  observe(request: ObserveRequest): Promise<DesktopSnapshot>;
  findElement(request: FindRequest): Promise<FindResult>;
  execute(request: ActionRequest): Promise<ActionOutcome>;
  cancel(taskId: Id): Promise<{ acknowledged: boolean; inFlightActionId?: Id }>;
  disconnect(): Promise<void>;
}
```

`openApp`, `click` and `type` may be convenience wrappers, but must construct `ActionRequest` and use the same enforcement path. The SDK never grants itself an approval. Independent clients must register an approval UI callback through the trusted broker or restrict themselves to allowed R1/R2 operations. The H24 CLI demonstration uses only R1/R2.

## 6. Approval and sharing consent

```typescript
interface ApprovalRequest {
  id: Id; taskId: Id; actionId: Id; risk: 'R3';
  summary: string; exactAction: Action; payloadHash: string;
  affectedResources: string[]; expectedResourceVersion?: string;
  createdAt: IsoTime; expiresAt: IsoTime;
}
interface ApprovalResolution { requestId: Id; decision: 'approve' | 'reject' }
interface ApprovalToken {
  id: Id; requestId: Id; taskId: Id; actionId: Id;
  payloadHash: string; expiresAt: IsoTime; consumedAt: IsoTime | null;
}
interface SharingGrant {
  id: Id; taskId: Id; windowId: string;
  allowedKinds: ('text' | 'image')[]; region?: RectPx;
  expiresAt: IsoTime; revokedAt: IsoTime | null;
}
```

Token records are created only by the main-process approval broker from a verified renderer approval interaction. The agent receives an opaque reference, never a minting method. A broker-managed helper-side token registry checks binding and consumes the token atomically before dispatch. Canonical JSON serialization precedes SHA-256 hashing. Edits generate a new action and new approval request. Voice alone does not authorize R3 in H24.

Cloud sharing is a separate permission from desktop mutation approval. Balanced mode has an explicitly accepted bounded text-sharing policy; image requests require a scoped grant. Ask-every-time asks before each cloud call. Local-only never calls inference endpoints.

## 7. Agent task contract

```typescript
interface TaskNode {
  id: Id; agent: AgentId; instruction: string;
  dependsOn: Id[];
  inputs: Record<string, { nodeId: Id; outputKey: string }>;
  outputSchemaId: string; status: TaskStatus;
}
interface TaskPlan { taskId: Id; intentId: Id; nodes: TaskNode[] }
interface NodeResult {
  nodeId: Id; status: TaskStatus; outputs: Record<string, unknown>;
  evidenceActionIds: Id[]; error?: ErrorInfo;
}
```

The scheduler validates acyclicity, existing dependencies, output-schema compatibility and agent capabilities. Outputs are validated at runtime before binding. Missing/failed dependency outputs pause or fail the dependent branch; they are never invented. Natural-language instruction text is data within a typed envelope, not a substitute for executable tool arguments.

## 8. Usage and cognition REST API

```typescript
interface UsageRecord {
  id: Id; requestId: Id; taskId: Id; agent: AgentId; route: Route;
  provider: 'none' | 'local' | 'bedrock'; modelId?: string;
  inputTokens: number | null; outputTokens: number | null;
  cacheReadTokens: number | null; cacheWriteTokens: number | null;
  estimatedCostMicrousd: number | null; reservedMicrousd: number;
  state: 'local' | 'reserved' | 'settled' | 'unknown' | 'released';
  priceVersion?: string; createdAt: IsoTime;
}
type ToolCallId = string; // Opaque provider-compatible ID; not necessarily UUID
type ModelContent =
  | { type: 'text'; text: string }
  | { type: 'tool-use'; id: ToolCallId; name: string; arguments: Record<string, unknown> }
  | { type: 'tool-result'; toolCallId: ToolCallId; status: 'success' | 'error'; result: unknown };
interface CognitionRequest {
  schemaVersion: 1; requestId: Id; taskId: Id; agent: AgentId;
  purpose: 'conversation' | 'plan' | 'resolve' | 'vision';
  messages: { role: 'user' | 'assistant'; content: ModelContent[] }[];
  context: { text: string; sharingGrantId: Id }[];
  tools: { name: string; description: string; inputSchema: object }[];
  image?: {
    mime: 'image/png' | 'image/jpeg'; base64: string;
    crop: RectPx; scale: number; displayId: string; windowId: string;
    sharingGrantId: Id;
  };
  maxOutputTokens: number;
}
interface CognitionResponse {
  requestId: Id; state: 'complete'; text: string;
  toolCalls: { id: ToolCallId; name: string; arguments: Record<string, unknown> }[];
  usage: UsageRecord;
}
```

Server selects model and trusted system instructions from purpose/config. Client tool schemas are restricted to the shipped tool manifest; arbitrary supplied descriptions do not become trusted instructions. The custom Strands model adapter maps SDK messages/tools to this contract and maps the result back. Preserve provider tool-call IDs and map tool-use/tool-result blocks to Bedrock's native content blocks. Tool uses occur only in assistant messages; matching tool results occur in user messages. Reject orphaned, duplicate or mismatched IDs. Tool results are bounded untrusted data, never system instructions. A provider tool call returning successfully does not imply that a proposed desktop mutation was verified.

The gateway/proxy rejects bodies above `maxCloudRequestBytes`. Validate decoded image MIME, actual dimensions and decompression limits, not only claimed metadata or base64 length. Validate every nested content block and enforce the aggregate token cap after adding the server's trusted instructions.

| Endpoint | Result | Semantics |
|---|---|---|
| `POST /v1/cognition` | 200 `CognitionResponse`, or 202 pending | JWT required; `requestId` is idempotency key |
| `GET /v1/cognition/{requestId}` | 200 result / 202 pending / error | Same authenticated owner only |
| `GET /v1/usage?day=YYYY-MM-DD` | Aggregated settled + reserved amounts | User's ledger, UTC day |
| `GET /health` | Version and readiness only | Public; never invokes model |

202 is for a duplicate/in-flight or unresolved request, not a new asynchronous workflow engine. New H24 requests execute synchronously within the deadline. Poll status at bounded backoff for at most 60 seconds; unresolved requests remain visibly unknown with their reservation held. Never resend with a fresh ID simply because the response was lost.

Error envelope: `{ "error": { "code": "BUDGET_EXCEEDED", "message": "Daily inference budget reached", "retryable": false }, "requestId": "..." }`.

| HTTP | Meaning |
|---|---|
| 400 | Schema/payload/capability invalid |
| 401 / 403 | Authentication/authorization failure |
| 409 | Request ID reused for different content |
| 429 | Budget or rate cap; inspect code, never blindly retry budget errors |
| 503 / 504 | Provider unavailable/timeout; reconcile same request ID |

## 9. Local transports and UI events

Renderer receives a narrow `contextBridge` API: `submitIntent`, `cancelTask`, `resolveApproval`, `setMicrophoneMuted`, `setCloudMode`, `grantSharing`, `revokeSharing`, `getHistory`, `forgetHistory`, `getUsage`, `getCurrentState`. Validate frame origin, sender, schema, request size and ownership. No generic invoke, eval, shell, filesystem, or arbitrary URL-opening bridge.

The broker spawns the C# helper with inherited stdio. JSON-RPC 2.0 messages are newline-delimited UTF-8, max 2MiB per message; control requests carry `protocolMajor:1`. Stdout is protocol-only; diagnostics use stderr with redaction. Raw PCM is captured/played inside the helper and never sent as JSON. Large capture bytes use an owner-only temporary file with a short-lived opaque handle; the broker reads then deletes it.

Helper methods: `hello`, `desktop.observe`, `desktop.find`, `desktop.execute`, `task.cancel`, `approval.register`, `voice.start`, `voice.mute`, `voice.speak`, `voice.stop`, `capture.create`, `capture.release`. Privileged approval registration is accessible only over the broker-owned channel, never through the public agent tool surface. No listening network port is opened.

Events carry `{id, taskId?, sequence, emittedAt, type, payload}`. Types: `companion.state`, `voice.transcript`, `task.progress`, `approval.requested`, `action.completed`, `usage.updated`, `error`. Persist critical state before publishing; renderers recover from sequence gaps by querying state.

## 10. Companion state and versioning

```typescript
type CompanionState = 'idle' | 'listening' | 'thinking' | 'speaking'
  | 'acting' | 'awaiting-approval' | 'success' | 'error';
interface CompanionStatus {
  state: CompanionState;
  connectivity: 'online' | 'offline';
  microphone: 'armed' | 'listening' | 'muted';
  cloud: 'available' | 'disabled' | 'budget-exhausted';
  speechLevel: number; // 0..1, local playback envelope
}
```

REST uses `/v1`; helper uses protocol major 1; SDK uses semver; SQLite uses numbered migrations. Minor releases add optional fields only. Rive input names and numeric state mapping are pinned in [07](07-DESIGN-GUIDEBOOK.md). A mismatched major version prevents execution and displays a repair message.
