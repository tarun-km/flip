# KLIP — 24-Hour Build Plan

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Assumption:** 3–4 experienced builders, one accessible Windows 11 x64 test machine

## 1. Outcome and constraints

Build a standalone voice companion and reusable desktop SDK that demonstrate local commands, one unfamiliar supported computer-use task, one genuine AWS capability, and transparent usage. This is a tightly scoped 24-hour implementation window within the event, not a claim that the event lasts exactly 24 hours.

The original plan's seven-agent, two-platform, full-OCR/vector-memory scope is removed. H24 means the required capabilities in [03](03-SRS.md), not every interface mentioned across the plans. New features freeze at hour 18.

The event page says project work starts when the event clock starts. Prior practice/toolchain setup is different from prebuilding the submission. KLIP is independent of MIA; document third-party dependencies and newly built work accurately. Confirm the submission cutoff/timezone in the portal rather than inferring it from this schedule.

## 2. Readiness checklist

| Check | Required evidence |
|---|---|
| Windows access | Real interactive Windows session for UIA, taskbar, audio and installer testing |
| Toolchains | Bun, Electron-compatible Node tooling, supported .NET SDK, local build succeeds |
| Assets | Original/appropriately licensed Rive asset and redistributable speech models selected |
| AWS | Credit balance/terms checked; account/region can invoke selected Bedrock model |
| Event | Registration and current submission requirements confirmed |

Development on macOS alone is not enough to validate this project. If a Windows machine is unavailable, resolve that before investing in the native helper. Do not use the MeetStream Python environment or infrastructure; this project has no MIA runtime dependency.

## 3. Work tracks

| Track | Owner | Deliverable |
|---|---|---|
| A — SDK/native | Engineer 1 | C# helper, UIA, app/files adapters, verification |
| B — conversation/agents | Engineer 2 | Voice integration, command router, Strands adapter |
| C — companion | Engineer 3 | Electron shell, React, Rive, approvals, usage |
| D — cloud/integration | Engineer 4 or shared | AWS proxy/auth/ledger, fixtures, packaged testing |

These are suggested human work assignments, not an instruction to launch autonomous coding agents. Each owner uses the schemas in [10](10-API-CONTRACTS.md); schema changes are communicated before implementation.

## 4. Hours 0–4: prove the boundaries

| Track | Work |
|---|---|
| A | Helper handshake, scoped `observe`, `app.open`, independent SDK CLI |
| B | Local command grammar and local TTS; validate keyword/STT model loading |
| C | Bottom-right pill, panel, typed input, three initial Rive states |
| D | Cognito/API/Lambda/ledger skeleton; one real Bedrock request and usage response |

**Hour 4 exit:** “open Notepad” from the SDK CLI opens a real window; the companion can submit the same command; a separate authenticated cloud request returns actual usage. If any boundary fails, repair it before broadening feature scope.

## 5. Hours 4–8: local voice-to-action

| Track | Work |
|---|---|
| A | Folder reveal, supported-file opening, UIA text entry/readback, stale target rejection |
| B | Keyword → VAD/STT → local router → response; follow-up timeout; mute |
| C | Listening/speaking indicators, transcript, audio-envelope animation, stop-speaking |
| D | Server model/input caps, conditional budget reservation, idempotent request storage |

**Hour 8 exit:** offline “Hey KLIP, open Downloads” completes with local speech and zero Bedrock calls. TTS does not trigger itself. UIA mutation result contains fresh evidence.

If wake recognition remains unreliable, keep push-to-talk working and label wake quality as incomplete. Do not secretly substitute paid continuous transcription or claim the H24 wake requirement passed.

## 6. Hours 8–12: unfamiliar task and safety

| Track | Work |
|---|---|
| A | Serialized mutation queue, input interference pause, action journal and unknown outcomes |
| B | Strands supervisor/desktop/conversation roles; tool proposal mapping through model proxy |
| C | Approval preview, exact-content decision, error/unknown presentation |
| D | Server settlement, request status lookup, tenant/auth negative tests |

**Hour 12 exit:** a new instruction edits a prepared Notepad document and verifies exact text after moving the window. A test-file overwrite waits for approval; rejection leaves the file unchanged. No arbitrary shell or sensitive generic input is permitted.

If the custom Strands adapter is the blocker, narrow to one specialist and finish the actual model/tool round-trip. A hardcoded response is a fixture, not a substitute for the claimed agent capability.

## 7. Hours 12–16: cloud vision and honest usage

| Track | Work |
|---|---|
| A | Capture authorized crop, pixel bounds/scale mapping, transient file cleanup |
| B | Visual question route with scoped consent; bounded conversation preference retrieval |
| C | Complete eight-state Rive mapping, usage/history/forget controls |
| D | Image admission/reservations; ledger totals; repeatable cost/evidence export |

**Hour 16 exit:** KLIP answers about a user-approved image crop using AWS and displays actual returned token usage plus a priced estimate. Local commands remain zero-cloud. History can be disabled and deleted. No unimplemented local VLM is implied.

## 8. Hours 16–18: verification and freeze

1. Run the functional suite on clean fixtures; record actual success counts and false-success failures.
2. Exercise approval rejection/replay, stale target, user interference, helper loss, network loss and budget race.
3. Profile idle and active voice CPU/RAM on the packaged Windows build.
4. Run the independent SDK CLI to prove UI/model independence.
5. Freeze features; log remaining limitations and remove unsupported claims from the demo.

**Hour 18 exit:** core flow works in the packaged build; security-critical failures are fixed or the implicated capability is disabled. No new feature starts after this point.

## 9. Hours 18–24: package and submit

| Time | Work | Evidence |
|---|---|---|
| 18–20 | Package Windows helper/models/UI; clean-user-profile smoke test | Installer and model manifest |
| 20–21 | Rehearse three-minute script; check actual cloud usage and consent screens | Timed run |
| 21–22 | Record desktop and voice; capture architecture/SDK evidence | Three-minute video |
| 22–23 | Publish permitted submission artifacts and hosted project page | Working URL and access instructions |
| 23–24 | Verify links, credits, README, disclosures, upload confirmation | Submission receipt |

These are planned activities, not authorization for an assistant to publish externally. Follow the user's actual deployment/publication instructions when implementing the plan.

## 10. Cut order

| Cut first | Keep |
|---|---|
| Local LLM, vector retrieval, passive workflow learning | Templates + bounded cloud conversation + explicit preferences |
| Excel/mail/research specialist integrations | Explorer, Notepad, prepared Chrome and conversation |
| AgentCore hosting, sync, external agent federation | H24 authenticated Lambda inference proxy |
| Broad OCR support and selector-cache charts | UIA computer use plus one scoped vision question |
| Automatic hover expansion and advanced barge-in | Click/hotkey expansion, push-to-talk, stop-speaking |

Do not cut semantic policy, actual result verification, visible sharing consent, cloud accounting, or the SDK boundary. If H24 voice/native/cloud essentials fail, reduce the submission's claims; do not fabricate them.

## 11. Small-team adjustment

For one builder, the full H24 list is a high-risk target. Start with typed interaction, local app/folder commands, one UIA edit and one authenticated cloud call; add local voice after those pass. For two builders, separate native/desktop from voice/cloud and use a minimal Rive asset. State any missing requirements honestly.

## 12. Deliverable checklist

- Windows build and native helper, with model/asset license manifest and version pins.
- SDK source/example plus schema fixtures; no dependency on MIA services or code.
- Deployed authenticated AWS inference path and budget tests, or accurately labeled local-track scope.
- Real success, latency, resource and usage measurements, including failures/unknowns.
- Three-minute video, project URL and source/setup instructions matching the actual implementation.

Source: [First Commit requirements](https://www.wemakedevs.org/aws/first-commit), checked 2026-09-19. Recheck the portal before submission.

