/**
 * Authoritative shared types. Mirrors docs/10-API-CONTRACTS.md.
 * JSON dates are UTC ISO 8601 strings; durations are integer ms; money is integer USD microdollars.
 */

export type Id = string;
export type IsoTime = string;

export type RiskTier = 'R1' | 'R2' | 'R3' | 'R4';
export type PerceptionTier = 'P1' | 'P2' | 'P3';
export type Route = 'local-command' | 'local-model' | 'cloud-text' | 'cloud-vision';
export type CloudMode = 'local-only' | 'balanced' | 'ask-every-time';
export type AgentId = 'supervisor' | 'desktop' | 'conversation' | 'research' | 'documents';

export type TaskStatus =
  | 'queued'
  | 'running'
  | 'awaiting-approval'
  | 'paused'
  | 'completed'
  | 'partial'
  | 'failed'
  | 'cancelled'
  | 'unknown';

export type ActionStatus =
  | 'proposed'
  | 'validated'
  | 'awaiting-approval'
  | 'dispatched'
  | 'verified'
  | 'failed'
  | 'unknown'
  | 'cancelled'
  | 'refused';

export interface RectPx {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppIdentity {
  appId: string;
  pid: number;
  processStartedAt: IsoTime;
}

export type ErrorCode =
  | 'INVALID_SCHEMA'
  | 'UNSUPPORTED_CAPABILITY'
  | 'PERMISSION_DENIED'
  | 'AMBIGUOUS_TARGET'
  | 'STALE_TARGET'
  | 'APPROVAL_REQUIRED'
  | 'APPROVAL_EXPIRED'
  | 'PROHIBITED'
  | 'USER_INTERFERENCE'
  | 'VERIFICATION_FAILED'
  | 'OUTCOME_UNKNOWN'
  | 'BUDGET_EXCEEDED'
  | 'RATE_LIMITED'
  | 'MODEL_TIMEOUT'
  | 'OFFLINE'
  | 'UNAUTHORIZED'
  | 'REQUEST_CONFLICT'
  | 'INTERNAL';

export interface ErrorInfo {
  code: ErrorCode;
  message: string;
  retryable: boolean;
}

export interface Intent {
  id: Id;
  text: string;
  source: 'voice' | 'text' | 'sdk';
  sessionId: Id;
  createdAt: IsoTime;
  cloudMode: CloudMode;
}

// --- Observation and target binding ---

export interface ObserveRequest {
  appId?: string;
  windowId?: string;
  region?: RectPx;
  fresh: boolean;
}

export interface Selector {
  strategy: 'automation-id' | 'role-name' | 'ancestor-path' | 'ocr-anchor';
  value: string;
  ancestor?: string;
  appVersion?: string;
}

export interface DesktopElement {
  id: string;
  parentId: string | null;
  role: string;
  name: string;
  value?: string;
  bounds: RectPx;
  enabled: boolean;
  offscreen: boolean;
  sensitive: boolean;
  supportedPatterns: string[];
  selector?: Selector;
}

export interface DesktopSnapshot {
  id: Id;
  revision: number;
  capturedAt: IsoTime;
  app: AppIdentity;
  windowId: string;
  windowTitle: string;
  displayId: string;
  windowBounds: RectPx;
  focusedElementId: string | null;
  elements: DesktopElement[];
  truncated: boolean;
  tier: PerceptionTier;
  invalidated: boolean;
}

export interface TargetBinding {
  snapshotId: Id;
  snapshotRevision: number;
  app: AppIdentity;
  windowId: string;
  elementId: string;
  selector?: Selector;
  expectedRole: string;
  expectedName: string;
  bounds: RectPx;
}

export interface FindRequest {
  snapshotId: Id;
  query: string;
  role?: string;
}

export interface FindResult {
  status: 'resolved' | 'ambiguous' | 'not-found';
  target?: TargetBinding;
  candidates: string[];
  method: 'cache' | 'uia' | 'ocr' | 'vision';
}

// --- Tool actions and outcomes ---

export type Action =
  | { kind: 'app.open'; appId: string }
  | { kind: 'file.reveal'; path: string }
  | { kind: 'file.open'; path: string }
  | { kind: 'file.writeText'; path: string; content: string; expectedSha256: string | null }
  | { kind: 'browser.search'; browserId: string; engine: 'google' | 'bing'; query: string }
  | { kind: 'ui.invoke'; target: TargetBinding }
  | { kind: 'ui.type'; target: TargetBinding; text: string; replace: boolean }
  | { kind: 'ui.key'; target: TargetBinding; keys: string[] }
  | { kind: 'ui.scroll'; target: TargetBinding; deltaY: number };

export type Assertion =
  | { kind: 'window.exists'; appId: string }
  | { kind: 'element.valueEquals'; target: TargetBinding; value: string }
  | { kind: 'file.sha256Equals'; path: string; sha256: string }
  | { kind: 'file.opened'; path: string; appId: string }
  | { kind: 'browser.urlEquals'; url: string; browserId: string }
  | { kind: 'element.exists'; windowId: string; selector: Selector };

export interface ActionRequest {
  id: Id;
  taskId: Id;
  action: Action;
  assertions: Assertion[];
  deadlineAt: IsoTime;
  approvalTokenId?: Id;
}

export interface Evidence {
  source: 'uia' | 'filesystem' | 'native-api' | 'browser' | 'ocr';
  observedAt: IsoTime;
  assertionIndex: number;
  matched: boolean;
  summary: string;
}

export interface ActionOutcome {
  actionId: Id;
  taskId: Id;
  status: ActionStatus;
  executed: boolean | null; // null means dispatch effect is uncertain
  verified: boolean;
  evidence: Evidence[];
  error?: ErrorInfo;
  adapter: 'native' | 'uia' | 'browser' | 'input';
  attempts: number;
  startedAt: IsoTime;
  finishedAt: IsoTime;
}

// --- Approval and sharing consent ---

export interface ApprovalRequest {
  id: Id;
  taskId: Id;
  actionId: Id;
  risk: 'R3';
  summary: string;
  exactAction: Action;
  payloadHash: string;
  affectedResources: string[];
  expectedResourceVersion?: string;
  createdAt: IsoTime;
  expiresAt: IsoTime;
}

export interface ApprovalResolution {
  requestId: Id;
  decision: 'approve' | 'reject';
}

export interface ApprovalToken {
  id: Id;
  requestId: Id;
  taskId: Id;
  actionId: Id;
  payloadHash: string;
  expiresAt: IsoTime;
  consumedAt: IsoTime | null;
}

export interface SharingGrant {
  id: Id;
  taskId: Id;
  windowId: string;
  allowedKinds: ('text' | 'image')[];
  region?: RectPx;
  expiresAt: IsoTime;
  revokedAt: IsoTime | null;
}

// --- Agent task contract ---

export interface TaskNode {
  id: Id;
  agent: AgentId;
  instruction: string;
  dependsOn: Id[];
  inputs: Record<string, { nodeId: Id; outputKey: string }>;
  outputSchemaId: string;
  status: TaskStatus;
}

export interface TaskPlan {
  taskId: Id;
  intentId: Id;
  nodes: TaskNode[];
}

export interface NodeResult {
  nodeId: Id;
  status: TaskStatus;
  outputs: Record<string, unknown>;
  evidenceActionIds: Id[];
  error?: ErrorInfo;
}

// --- Usage and cognition ---

export interface UsageRecord {
  id: Id;
  requestId: Id;
  taskId: Id;
  agent: AgentId;
  route: Route;
  provider: 'none' | 'local' | 'bedrock';
  modelId?: string;
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
  estimatedCostMicrousd: number | null;
  reservedMicrousd: number;
  state: 'local' | 'reserved' | 'settled' | 'unknown' | 'released';
  priceVersion?: string;
  createdAt: IsoTime;
}

// --- Public TypeScript SDK ---

export interface KlipDesktop {
  connect(): Promise<{ protocolMajor: 1; capabilities: string[] }>;
  observe(request: ObserveRequest): Promise<DesktopSnapshot>;
  findElement(request: FindRequest): Promise<FindResult>;
  execute(request: ActionRequest): Promise<ActionOutcome>;
  cancel(taskId: Id): Promise<{ acknowledged: boolean; inFlightActionId?: Id }>;
  disconnect(): Promise<void>;
}

// --- Companion state and presentation ---

export type CompanionState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'acting'
  | 'awaiting-approval'
  | 'success'
  | 'error';

export interface CompanionStatus {
  state: CompanionState;
  connectivity: 'online' | 'offline';
  microphone: 'armed' | 'listening' | 'muted';
  cloud: 'available' | 'disabled' | 'budget-exhausted';
  speechLevel: number;
}

// --- Local task/history view models (renderer-facing, simplified from SQL schema in 04-SDD) ---

export interface HistoryTaskEntry {
  id: Id;
  requestText: string;
  agent: AgentId;
  route: Route;
  status: TaskStatus;
  createdAt: IsoTime;
  finishedAt?: IsoTime;
  actions: ActionOutcome[];
  usage: UsageRecord[];
}

export interface PreferenceRecord {
  id: Id;
  scope: string;
  key: string;
  value: string;
  source: 'explicit' | 'inferred';
  evidenceCount: number;
  updatedAt: IsoTime;
}
