# KLIP — Product Requirements Document

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Status:** proposed build baseline

## 1. Product thesis

KLIP is a personable Windows companion that users can talk to while working. It can answer, inspect the current application, manipulate supported desktop controls, and verify what happened. It sits above the bottom-right taskbar, expands on demand, and communicates through voice, text, and Rive animation.

Its reusable desktop SDK exposes the same inspection and execution primitives to other agent applications. The companion is the first client, not the only possible client. MIA, Tauri, and Rust are not dependencies.

## 2. Problem and intended benefit

People repeatedly switch from their work to searching folders, navigating applications, copying context, and explaining what is already on screen. General assistants can consume paid model calls even for predictable requests. Users often cannot tell how much of their desktop was shared or what each task cost.

KLIP reduces that friction with direct local execution for common commands, structured screen understanding for unfamiliar tasks, and explicit escalation to AWS only when necessary. It remains useful without a saved routine or a previously learned task.

## 3. Users and representative requests

| User | Request | Useful result |
|---|---|---|
| Everyday laptop user | “Hey KLIP, open my latest download” | Newest completed, supported document opens or is revealed |
| Artist | “What can I improve in this image?” | Consented crop analyzed; contextual feedback spoken |
| Student | “Find my notes and open the newest one” | Folder-scoped search and verified opening |
| Developer | “Open my project and explain this error” | Project opens; relevant error context supplied |
| SDK developer | “Expose desktop tools to my agent” | Stable SDK without requiring KLIP's UI |

H24 supports a tested subset of these requests. Broad audience does not imply arbitrary app compatibility.

## 4. Experience principles

- Conversation is the main interface; agent selection is optional detail.
- KLIP announces actual activity and uncertainty. It does not claim a file was saved because it clicked Save.
- Local processing is the default for wake detection, voice, simple commands, and history.
- Cloud use is visible, metered, and bounded. Zero cloud tokens does not mean zero electricity, CPU, or hosting cost.
- A user can pause the microphone, stop dispatch, inspect history, and forget stored context.

## 5. Differentiation hypothesis

**Adaptive, budget-visible computer use:** choose a reliable API, accessibility operation, local OCR, or cropped VLM resolution per step; validate actions against fresh state; show the measured cost of the chosen path.

Rive personality, Windows availability, multi-agent labels, and caching alone are not novelty claims. Existing systems offer overlapping functions. The proposed contribution is the integrated SDK and evidence that supported tasks work with fewer cloud calls while preserving success rate. The demo must establish this experimentally; it cannot establish market-wide uniqueness.

## 6. Scope

### H24 — required

| Capability | Bounded implementation |
|---|---|
| Companion | Electron pill, React panel, Rive state asset, hotkey and tray |
| Voice | Local wake word and STT; local spoken response; push-to-talk fallback |
| Conversation | Local greetings and command dialogue; Bedrock for open-ended responses |
| Computer use | Explorer, Notepad and a prepared Chrome session; fresh UIA observation and verified actions |
| SDK | TypeScript API over a C# helper, independent smoke-test client |
| Agents | Supervisor, desktop specialist, conversation specialist; shared call budget |
| AWS | Authenticated model proxy with text and image support and atomic reservations |
| Memory | Opt-in conversation history and explicitly saved preferences |
| Cost visibility | Per-request tokens and model-cost estimate; unresolved reservations visible |

### Stretch

- One local OCR adapter and a deliberate visual fallback case.
- Excel COM adapter for one workbook operation.
- Small local language model if the target machine meets resource targets.
- Barge-in beyond an explicit stop-speaking control.
- One confirmed routine and selector-cache comparison.

### V1 / Vision

| V1 | Vision |
|---|---|
| General local chat, project memory retrieval, document/mail integrations | macOS and Linux helper implementations |
| Opt-in routine discovery and cloud sync | Independently hosted third-party agent federation |
| Cloud-only long tasks via AgentCore if justified | Strong fully local visual reasoning |
| Signed installer/update pipeline, broader accessibility testing | Community adapter ecosystem |

## 7. Non-goals for H24

- Arbitrary shell execution, installing software, entering credentials, payments, or changing OS security settings.
- Operating UAC secure desktops, elevated applications, locked sessions, or every Windows application.
- Continuous screen recording or cloud transcription of ambient audio.
- Model training or autonomous execution inferred from observed habits.
- Requiring users to teach a workflow before computer use works.

## 8. Success criteria

Detailed tests and targets are in [03](03-SRS.md).

| Claim | Required evidence |
|---|---|
| Routine commands avoid cloud inference | Backend call count = 0 and client ledger for defined local suite |
| KLIP uses the real desktop | Native tool evidence and independently observable post-state |
| It adapts to layout changes | Repositioned-window test with correct target and no stale-coordinate click |
| It is a companion | Wake → listen → reply loop; useful speech plus readable visual state |
| AWS provides meaningful capability | Novel query/vision response traced through deployed authenticated backend |
| SDK is reusable | A separate CLI client can observe and open an allowlisted app |

No minimum percentage token reduction is promised before measurement. Accuracy is evaluated alongside cost.

## 9. Core journeys

**Local command:** wake → transcribe locally → recognize supported command → inspect if necessary → execute → verify → speak short result. No model invocation.

**Unfamiliar desktop task:** wake → inspect relevant window → compact context → cloud reasoning → validated tool proposal → local policy/approval → fresh target binding → execution → verification → continue within limits.

**Visual help:** user asks about current artwork → crop preview and sharing consent → cloud image request → spoken feedback. This is observation and advice, not permission to edit the artwork.

**Offline:** wake, local commands, and history remain available. Open-ended cloud conversation explains that a connection is required; it does not fabricate current news.

## 10. Risks and release decisions

| Risk | Decision |
|---|---|
| Voice model too slow on judge hardware | Package tested models; provide push-to-talk and text fallback |
| Canvas UI lacks semantics | Bounded image fallback; refuse unresolved destructive controls |
| User takes over during action | Pause further actions; invalidate old target snapshot |
| Cost savings reduce task quality | Report task success and retries together with cost |
| Scope exceeds 24 hours | Follow [11](11-BUILD-PLAN-24H.md), freeze at hour 18 |

## 11. Definition of done

The H24 suite in [03](03-SRS.md) passes on a recorded Windows configuration, the SDK works outside the companion, deployed AWS usage is visible, and a three-minute video shows real execution. Final submission describes known app limits, unfinished stretch features, and the absence of measured claims where appropriate.

