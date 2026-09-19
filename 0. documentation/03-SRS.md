# KLIP — Software Requirements Specification

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Verification baseline:** Windows 11 x64

## 1. Definitions and scope

H24 is required; Stretch may be cut; V1 is deferred. Requirements describe intended behavior and are not proof of implementation. Shared defaults and field names come from [10](10-API-CONTRACTS.md). Policy comes from [09](09-SECURITY-TRUST.md).

The recorded benchmark machine must list Windows build, CPU, RAM, installed app versions, screen scaling, microphones, model assets, network conditions, and power mode. Recommended test configuration: 16GB RAM, modern four-core-or-better CPU, no required discrete GPU. Lower-spec support is unverified until tested.

## 2. Companion and voice

| ID | Requirement | Scope | Verification |
|---|---|---|---|
| FR-U-01 | Pill anchors above bottom-right taskbar within monitor work area | H24 | Move monitors/change scaling; no off-screen controls |
| FR-U-02 | React controls remain usable while Rive indicates real backend state | H24 | Block model call and operate cancel/mute |
| FR-U-03 | Typed input, hotkey, tray entry, and keyboard navigation exist | H24 | Keyboard-only journey |
| FR-V-01 | Wake detection runs locally before transcription/model invocation | H24 | Offline wake test and network trace |
| FR-V-02 | Local STT and TTS complete supported command dialogue | H24 | Offline command suite |
| FR-V-03 | Microphone mute stops capture; listening is visibly indicated | H24 | Device capture counters and UI state |
| FR-V-04 | TTS cannot repeatedly trigger the wake detector | H24 | Twenty spoken replies without recursive wake |
| FR-V-05 | Push-to-talk and stop-speaking work independently of wake accuracy | H24 | Wake disabled, repeat interaction |
| FR-V-06 | User can interrupt speech through echo-aware barge-in | Stretch | Near/far-field audio tests |

## 3. Desktop SDK and perception

| ID | Requirement | Scope | Verification |
|---|---|---|---|
| FR-D-01 | SDK can operate without the companion UI or a model provider | H24 | CLI observes and opens Notepad |
| FR-D-02 | Helper exposes handshake and available capabilities | H24 | Unsupported version/capability rejected |
| FR-P-01 | Observe bounded UIA state with process, window, revision and element identity | H24 | Notepad and Explorer fixtures |
| FR-P-02 | Resolver rejects ambiguous or stale targets | H24 | Duplicate labels; moved/replaced target |
| FR-P-03 | Verification forces fresh evidence, bypassing screen cache | H24 | Change tiny text value without large image change |
| FR-P-04 | Image request contains an authorized crop and coordinate transform | H24 | Crop bounds and scale round-trip fixture |
| FR-P-05 | Local OCR fills required gaps without triggering cloud calls | Stretch | Canvas text fixture |
| FR-P-06 | Blocklisted apps and secure fields are excluded before persistence/egress | H24 | Synthetic password and blocked-window fixture |

## 4. Execution and agents

| ID | Requirement | Scope | Verification |
|---|---|---|---|
| FR-A-01 | Open allowed app, reveal folder, open supported document, type and invoke permitted control | H24 | Real desktop suite |
| FR-A-02 | All desktop mutations pass one serialized dispatcher | H24 | Two agents request focus-changing work concurrently |
| FR-A-03 | Every mutation has preconditions and success assertions | H24 | Empty assertions rejected |
| FR-A-04 | Uncertain side effect yields unknown and is not blindly repeated | H24 | Drop response after successful write |
| FR-A-05 | Cancellation prevents new dispatch and preserves completed work | H24 | Cancel between actions |
| FR-A-06 | Human input/focus interference pauses relevant automation | H24 | User changes foreground app during task |
| FR-A-07 | Spreadsheet native adapter can read/write a test range | Stretch | COM readback |
| FR-O-01 | Local router handles command allowlist without model call | H24 | Backend invocation count zero |
| FR-O-02 | Supervisor can delegate to desktop and conversation specialists | H24 | Novel request shows real role-specific trace |
| FR-O-03 | Agent and helper boundaries validate runtime schemas | H24 | Malformed JSON, extra fields, invalid enums |
| FR-O-04 | Failed dependencies prevent dependent execution | H24 | Missing prerequisite artifact |
| FR-O-05 | Independent reasoning can overlap without overlapping mutations | Stretch | Instrumented scheduling test |

## 5. Safety, privacy and memory

| ID | Requirement | Scope | Verification |
|---|---|---|---|
| FR-S-01 | Semantic effect determines R1–R4 risk | H24 | Click Send cannot masquerade as reversible click |
| FR-S-02 | R3 requires one-use approval bound to exact content and target | H24 | Change payload after approval; replay token |
| FR-S-03 | R4 denied at broker and helper even for indirect actions | H24 | Delete through keyboard shortcut, script, menu |
| FR-S-04 | No raw AWS credentials or generic shell bridge exposed to renderer | H24 | Build/IPC inspection |
| FR-S-05 | Explicit image-sharing authorization is scoped and revocable | H24 | Reuse consent on another window fails |
| FR-S-06 | Raw microphone audio is not uploaded or persisted in H24 | H24 | Network and storage inspection |
| FR-S-07 | User can delete local conversations/preferences and disable history | H24 | Restart and confirm absence |
| FR-M-01 | Explicit preferences have provenance, scope and deletion support | H24 | Save preferred browser, use, forget |
| FR-M-02 | Conversation retrieval obeys context size and privacy boundaries | H24 | Long history does not produce unbounded request |
| FR-M-03 | Passive app-event collection requires separate opt-in | V1 | Consent and pause tests |
| FR-M-04 | Cross-device sync and local small-model conversation | V1 | Separate release criteria |

## 6. Cloud and accounting

| ID | Requirement | Scope | Verification |
|---|---|---|---|
| FR-C-01 | Cognito authenticates model requests; server derives identity | H24 | Wrong subject, audience, issuer, expiry |
| FR-C-02 | Atomic reservations enforce user/day, task and project inference ceilings | H24 | Concurrent requests near limit |
| FR-C-03 | Usage records distinguish actual tokens, estimated cost and pending reservation | H24 | Timeout and successful completion |
| FR-C-04 | Idempotency prevents duplicate model invocation for the same request ID | H24 | Replay and mismatched payload tests |
| FR-C-05 | Local-only mode never invokes Bedrock | H24 | Network assertion |
| FR-C-06 | Model allowlist, image cap, context cap, output cap and call limits enforced server-side | H24 | Oversized/manipulated requests |
| FR-C-07 | User can see local/cloud route and per-task/daily spend | H24 | UI matches ledger |

## 7. Performance targets

These are engineering targets to measure, not acceptance claims fabricated from a framework choice.

| Metric | Target | Measurement |
|---|---|---|
| Cold start to usable pill | ≤5s | Ten launches; report p50/p95 |
| Visible reaction after accepted input | ≤150ms p95 | Input receipt to rendered state |
| Wake-only idle CPU | ≤5% of one logical core equivalent | Ten minutes, all KLIP processes, documented normalization |
| Idle working set, wake model loaded | ≤700MB | Sum process working sets; note shared-page double counting |
| Active voice working set, no local LLM | ≤1.5GB | STT/TTS models loaded |
| Bounded UIA observation | ≤250ms p95 | Test app set; hard timeout separately enforced |
| Local response after utterance end | ≤1.5s p95 | Includes STT endpointing and speech start |
| Native target verification | ≤2s typical | Per-operation deadline; app launch may take longer |
| Cloud response | Report actual p50/p95 | No fixed model-latency promise |
| Stop acknowledgement | ≤200ms p95 | Broker acknowledges; in-flight effects may finish |
| Animation | ≥30fps active on test machine | Reduced idle rate; honor reduced motion |

Resource misses must be reported with actual values. A local LLM or local VLM requires a separate resource profile.

## 8. H24 acceptance suite

| Test | Procedure | Pass evidence |
|---|---|---|
| AC-01 | Launch, hover/click, hotkey, mute | Visible state and keyboard operation |
| AC-02 | Offline wake and “open Downloads” | Folder opens; zero cloud requests |
| AC-03 | Latest supported completed download | Correct file identity; temporary/executable files excluded |
| AC-04 | Search Chrome for a supplied phrase | Correct URL generated; browser navigates |
| AC-05 | Novel supported UI task in moved Notepad window | Fresh target resolution and exact text readback |
| AC-06 | Ask about an authorized image crop | Real AWS response and usage entry |
| AC-07 | Reject test-file overwrite, then separately approve exact overwrite | Reject leaves file unchanged; approval binds correct file/content |
| AC-08 | Cancel, stale target and unknown-outcome fault injection | No wrong-window typing or duplicate mutation |
| AC-09 | Cloud budget/auth/idempotency tests | Enforcement recorded at server |
| AC-10 | Independent SDK client | No React, Rive or agent required |

Run the ten-task functional set three times on fresh fixtures. Target ≥27/30 task completions; report the actual rate even if lower. Safety/auth tests must all pass before claiming those protections. A falsely reported success blocks release regardless of aggregate success rate.

## 9. Release artifacts

Deliver the Windows build, packaged helper and model manifest, SDK example, deployment instructions, privacy/capability notes, actual measurements, and a three-minute demo. Requirements marked Stretch/V1 remain explicitly unimplemented unless verified.

