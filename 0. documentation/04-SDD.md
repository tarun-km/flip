# KLIP — Software Design Document

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Implements:** [SRS](03-SRS.md)

## 1. Module layout

```text
klip/
  apps/desktop/             Electron main, preload, React/Rive renderer
  packages/contracts/      Runtime schemas, generated TS/C# DTOs
  packages/desktop-sdk/     Proposed @klip/desktop public client
  packages/agent-runtime/   Local router, Strands adapters, task scheduler
  packages/memory/          SQLite repository, retrieval, usage aggregation
  native/Klip.Windows/      C# helper, UIA3, Win32, speech, DPAPI
  cloud/cognition/          Lambda model proxy and reservation ledger
  infra/                   CDK TypeScript stack
  assets/rive/             Companion .riv asset and state manifest
  assets/models/           Model manifest, not unverified downloaded binaries
  examples/sdk-cli/         Independent SDK demonstration
  tests/fixtures/          Safe files, synthetic UI targets, fault injection
  docs/                    These twelve documents and index
```

TypeScript runs on Electron's bundled Node runtime and a supported Node runtime in Lambda. Bun manages JS dependencies/build scripts; it does not replace Electron's Node runtime. Use a supported .NET LTS release compatible with pinned FlaUI and sherpa-onnx packages; freeze exact versions after Windows packaging smoke tests.

## 2. SDK and native helper

The SDK constructs validated requests from [10](10-API-CONTRACTS.md). The trusted broker owns the helper channel, policies, approval registry and persistent task records. The helper translates portable requests into OS-specific operations. HWND/UIA COM objects never leave the helper.

FlaUI UIA3 is the default accessibility adapter. UIA2 fallback is a per-app compatibility choice after testing, not an automatic assumption. Dedicated native work queues prevent COM/UIA work from blocking voice capture. Avoid sharing apartment-bound native objects across arbitrary threads.

The helper discovers capabilities at startup and returns package/protocol versions. Unsupported features fail explicitly. The SDK CLI uses the same transport and policy code with a minimal host broker. There is no alternative unrestricted execution route.

## 3. Observation algorithm

1. Resolve allowed target app/window; exclude KLIP's own surfaces and blocked apps.
2. Read a bounded UIA subtree with node, depth and timeout caps from [10](10-API-CONTRACTS.md).
3. Normalize controls and redact sensitive properties before serialization or persistence.
4. Emit a new immutable snapshot and check task-specific target sufficiency.
5. Expand one needed subtree or request a local crop/OCR/cloud escalation; never silently claim complete coverage when `truncated=true`.

Watch relevant window/focus/value events to invalidate snapshots. Missing event support allows bounded polling while a task is active. Idle-wide timer-driven screenshotting is excluded. This replaces the original plan's absolute no-polling rule with a measurable power-aware policy.

## 4. Resolver

Try an app/window-scoped selector cache, stable AutomationId, scoped role/name, and ancestor relations. Match uniqueness and semantic purpose, not only a similarity score. Use local OCR when present; invoke cloud text/vision through the broker if necessary and permitted.

An exact label may match a harmful control. Resolution and authorization are separate. An unknown generic button is never downgraded to safe because it was found confidently. Coordinates from image analysis must be mapped using the crop transform and checked against a fresh local window before use.

## 5. Action dispatcher

```text
validate request and assertions
→ derive semantic effect and capabilities
→ canonicalize file/URL/target identities
→ persist proposed action
→ obtain R3 approval if required
→ acquire global mutation/focus lock
→ re-observe and recheck policy, versions and cancellation
→ atomically consume bound approval and journal dispatched
→ execute one adapter operation
→ verify with fresh evidence
→ persist terminal result, release lock, publish state
```

Each adapter declares `retryMode = never | read-only | idempotent` and a verification strategy. Never retry insertion, toggles, submission or ambiguous input automatically. Read-only queries may retry once. Replacing an entire text field is retry-safe only when target and expected prior state are revalidated; it is not universally idempotent.

The dispatcher records before and after hashes or identities where possible. A helper crash between effect and evidence produces `unknown`. An interrupted task is not resumable by blindly replaying its recorded actions. Reconcile state first and ask the user where necessary.

## 6. Implemented adapter behaviors

| Adapter | H24 behavior | Verification |
|---|---|---|
| App launcher | Launch registered executable without model-supplied shell arguments | Matching process identity and window |
| Folder/file reader | Read metadata inside selected roots | Canonical path, identity, size/timestamp |
| Latest download | Ignore partial extensions; select newest completed allowed file by recorded timestamp | Show chosen file; reveal unsupported/executable files instead of executing |
| Text file writer | Create-only or explicit hash-bound overwrite | Read back content hash |
| UIA editor | Type into known editable control | Exact value readback |
| Browser search | Encode query into allowlisted HTTPS search endpoint | Verify URL via prepared browser address bar or browser adapter |

Opening a file is not verified just because the OS launch call returned. If the app does not expose document identity, report “open requested” as an unverified/unknown result rather than “opened successfully.” Track partial downloads conservatively; filesystem timestamp is an operational definition, not universal proof of download completion.

## 7. Local routing and Strands adapter

Local routing recognizes a finite, documented command grammar with parameter extraction: greeting, open app, open/reveal known folder, search browser, mute, cancel, show usage. Unrecognized or ambiguous input goes to clarification or a bounded agent loop. It must not force unknown requests into the nearest supported command.

Strands agents run in a Node utility process. A custom model provider adapter sends allowed context through the broker to `/v1/cognition`; it does not ship AWS credentials to the desktop or call Bedrock directly. Tool results and roles are mapped to the contract. Provider errors preserve `requestId` for reconciliation. Implement and integration-test this adapter before adding additional agents.

The scheduler uses explicit task dependencies and output references. Two reasoning branches may run concurrently; one desktop mutation may run at a time. H24 defaults to sequential delegation where overlap provides no benefit. Agent delegation and model retries share one task budget and counter.

## 8. Local storage

The following schema is the minimum persistent design. Content envelopes are AES-GCM ciphertext with per-install key material protected by user-scoped Windows DPAPI. Plain metadata is explicitly identified; the database is not claimed to be wholly encrypted.

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY, intent_id TEXT NOT NULL, signature TEXT,
  status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  intent_cipher BLOB, plan_cipher BLOB
);
CREATE TABLE action_events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE NOT NULL,
  action_id TEXT NOT NULL, task_id TEXT NOT NULL, status TEXT NOT NULL,
  risk TEXT, adapter TEXT, created_at TEXT NOT NULL,
  payload_cipher BLOB, evidence_cipher BLOB,
  prev_hash TEXT, row_hash TEXT NOT NULL
);
CREATE INDEX actions_by_task ON action_events(task_id, seq);
CREATE TABLE snapshots (
  id TEXT PRIMARY KEY, revision INTEGER NOT NULL,
  app_id TEXT NOT NULL, captured_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  content_cipher BLOB NOT NULL
);
CREATE TABLE selectors (
  id TEXT PRIMARY KEY, app_id TEXT NOT NULL, app_version TEXT,
  scope_hash TEXT NOT NULL, query_hash TEXT NOT NULL,
  selector_cipher BLOB NOT NULL, confidence REAL NOT NULL,
  hits INTEGER NOT NULL DEFAULT 0, misses INTEGER NOT NULL DEFAULT 0,
  consecutive_misses INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL
);
CREATE TABLE preferences (
  id TEXT PRIMARY KEY, scope TEXT NOT NULL, pref_key TEXT NOT NULL,
  value_cipher BLOB NOT NULL, source TEXT NOT NULL,
  evidence_count INTEGER NOT NULL, updated_at TEXT NOT NULL,
  UNIQUE(scope, pref_key)
);
CREATE TABLE conversation_turns (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL,
  text_cipher BLOB NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE usage (
  id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL, task_id TEXT NOT NULL,
  agent TEXT NOT NULL, route TEXT NOT NULL, provider TEXT NOT NULL, model_id TEXT,
  input_tokens INTEGER, output_tokens INTEGER, cache_read_tokens INTEGER,
  cache_write_tokens INTEGER, estimated_cost_microusd INTEGER,
  reserved_microusd INTEGER NOT NULL, state TEXT NOT NULL,
  price_version TEXT, created_at TEXT NOT NULL
);
CREATE TABLE approvals (
  token_id TEXT PRIMARY KEY, request_id TEXT UNIQUE NOT NULL,
  task_id TEXT NOT NULL, action_id TEXT NOT NULL, payload_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL, consumed_at TEXT
);
CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
```

SQLite uses one writer, transactions, WAL, bounded busy timeouts and foreign-key validation where applicable. Task/node details can be stored in the encrypted plan envelope initially; normalize later only when query needs justify it. Per-action `method` and perception provenance are retained in encrypted evidence so cost analysis can group cache/UIA/OCR/vision resolution.

## 9. Retention and restart

Snapshots remain in memory normally; diagnostic persistence is opt-in and expires within five minutes. Raw crops are transient and removed after completion/failure. Conversation history is opt-in, retained 30 days by default. Action/usage metadata is retained 30 days; preferences persist until deleted. The audit stream is append-only during ordinary operation but subject to explicit deletion/retention policies in [09](09-SECURITY-TRUST.md).

On startup, cancel pending approvals, mark nonterminal dispatched actions unknown, and restore only inspectable task history. Never automatically resume desktop input or cloud calls from an old session. Models and UI assets are loaded lazily and version-checked.

## 10. Voice and presentation integration

The C# helper owns microphone buffers and local inference via sherpa-onnx. Record mono PCM internally in the format required by the selected model; convert once at the capture boundary. A bounded ring buffer supplies keyword detection. After activation, VAD/STT runs until endpoint or the utterance cap. Discard audio after transcription.

Send final transcripts and state updates over control IPC. Do not append every interim transcription to model history. TTS emits a 0–1 playback envelope to animate Rive; this is not phoneme-accurate lip sync. H24 wake detection pauses during playback, while stop-speaking remains active. Model-license checks, download hashes and packaging tests are required for chosen assets.

## 11. Build and test

- Use Bun workspaces and a checked-in lockfile for TypeScript packages; pin Electron/native addon ABI-compatible builds.
- Build the C# helper for Windows x64, self-contained where practical; verify FlaUI and speech native dependencies in the packaged build.
- Package with Electron tooling and a Windows installer; production signing/update delivery is V1. State any unsigned-build friction honestly.
- Run schema parity tests, action/approval fault tests, and the [03](03-SRS.md) Windows acceptance suite. Do not count mocks as app compatibility evidence.
- Test on a real Windows session. macOS development can validate contracts/UI/cloud code but cannot validate FlaUI, COM, Windows speech packaging, or taskbar behavior.

