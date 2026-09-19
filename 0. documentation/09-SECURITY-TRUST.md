# KLIP — Security and Trust Model

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Security boundary:** authenticated cloud calls and broker-controlled local desktop execution

## 1. Threat model

| Threat | Main control | Residual limit |
|---|---|---|
| Malicious screen/document instructions | Treat observations as untrusted data; scoped tools and semantic policy | Models can still misunderstand content |
| Wrong target after focus/UI change | Fresh target binding and serialized dispatcher | App behavior and incomplete accessibility can remain ambiguous |
| Unauthorized consequential action | Exact one-use approval and helper enforcement | Users may approve wrong content; UI clarity matters |
| Sensitive data sent to cloud | Minimized context, field redaction, scoped image consent | Redaction is not perfect secret recognition |
| Runaway model usage | Server-side atomic reservations and turn limits | Infrastructure/billing costs exist outside inference guard |

The H24 threat model includes malicious content and malformed agent output. It does not claim protection from an administrator, malware controlling the same user account, or a modified trusted KLIP binary. Process separation reduces mistakes and attack surface; it is not a sandbox against a fully compromised host.

## 2. Risk classification

Perception tiers P1–P3 describe how KLIP sees. Risk tiers R1–R4 describe effects.

| Risk | Examples | Decision |
|---|---|---|
| R1 observe | Read permitted window/tree, list folder metadata, retrieve local preference | Allowed within granted scope |
| R2 bounded/reversible | Open allowlisted app, reveal file, create new draft, edit known unsent text | Execute with visible status and verification |
| R3 consequential | Overwrite existing file, submit external content, send/post through a supported future adapter | Explicit exact-content approval |
| R4 prohibited in H24 | Delete user files, enter credentials, payments, security changes, arbitrary commands/installers, unknown sensitive effects | Refuse |

Classify the effect and context, not the method name. A click on Send is R3; a key sequence that deletes a file is R4. “Typing” in a shell is not ordinary text entry. If the helper cannot determine that a requested operation is within the supported semantic allowlist, refuse or ask for manual takeover. Broad computer use does not mean unrestricted input injection.

H24 limits generic input to tested application contexts and safe effects. Adding another application requires policy/verification fixtures, not only a new prompt.

## 3. Enforcement layers

The broker validates intent scope, action schema and approval. The helper revalidates current target/effect against the installed policy and registered approval token. Agents cannot pass `approved:true` or a low risk number to bypass checks.

Both layers may share policy definitions, so this is defense in depth, not mathematically independent protection against a shared policy bug. Critical negative tests exercise each layer separately and their composition.

## 4. Approval binding

An R3 request shows exact destination, content, resource identity/version and intended effect. The broker hashes canonical action JSON and issues a short-lived one-use token only after a verified UI decision. The helper binds task/action IDs, payload hash, expiry, resource version and current target, then consumes the token before dispatch.

Any edit, changed target or changed resource invalidates approval. Rejection cancels the affected branch. Expiry returns the task to a safe waiting/cancelled state; it never implies approval. Approval data persists for inspection, but unconsumed grants are invalidated on restart. The exact contract is in [10](10-API-CONTRACTS.md).

## 5. Electron and local IPC

- Enable renderer sandboxing and context isolation; disable Node integration; load bundled UI only.
- Use a narrow preload bridge, validate IPC sender/frame origin, and reject arbitrary channels/arguments.
- Enforce CSP and disable unexpected navigation/new windows; open only broker-approved external links.
- Keep Cognito tokens, local encryption material and native handles outside renderer/agent prompts.
- Run the helper as the current user over inherited stdio, without a public localhost server or administrator privileges.

Renderer compromise remains serious because it participates in approval UI. Restrict content rendering, never execute HTML from model output, and make the broker track exact pending approval identity. A compromised same-user application is outside the strong guarantee boundary. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)

## 6. Paths, URLs and native actions

Canonicalize file paths, scope them to user-granted roots, and validate reparse points/symlinks and file identity immediately before mutation. Where safe race-resistant operations cannot be guaranteed, refuse the operation. Block executable/script launching through the generic file-open tool; reveal those files instead.

App launch uses a registry of approved executable identities and fixed argument templates. Browser search percent-encodes the query into approved HTTPS endpoints. Treat arbitrary URI handlers, command-line strings, shell interpreters and embedded script execution as privileged capabilities, absent in H24.

Navigation can transmit information. The user-requested search query is an intended disclosure; adding unrelated screen text or secrets is not. Screen-derived URLs must be validated against task intent and sharing policy before opening.

## 7. Voice, screen and cloud privacy

| Data | Default handling |
|---|---|
| Ambient microphone audio | Local bounded buffer for keyword spotting; discarded |
| Activated utterance audio | Local STT; not uploaded or saved in H24 |
| Transcript | Used for current turn; history stored only if enabled |
| UIA values | Redacted before persistence/egress; transient unless needed |
| Image crop | Explicit task/window/region grant, minimized, transient |
| Conversation context | Only relevant permitted text sent to cloud |
| Usage metadata | Server ledger, no transcript or image required |

Block perception of configured sensitive apps/windows and secure fields. Apply redaction to image pixels as well as extracted text. Browser-hosted banking/password pages require URL/title/context checks where available; an app-bundle blocklist alone is insufficient. When the region cannot be safely scoped/redacted, ask the user to select a safe crop or refuse capture.

Consent to microphone access is not consent to continuous cloud listening. Consent to vision is not consent to actions. Local-only mode forbids inference calls; explicit user-requested browser navigation can still access the internet and must be described accordingly.

Honest privacy copy: “Wake detection and speech run on this device. When cloud assistance is enabled, selected text and approved image regions may be sent to AWS. You can see and control that sharing.”

## 8. Data at rest and deletion

Sensitive local text is encrypted with AES-GCM under key material wrapped by Windows DPAPI. Structural metadata and indexes are not described as encrypted if they are plaintext. User-private filesystem ACLs apply to the database, logs and temporary files. KLIP may access its own protected secrets; unrelated credential stores are prohibited.

Default retention: transient audio/crops; optional diagnostic snapshots no more than five minutes; opt-in conversation and action/usage history 30 days; explicit preferences until deletion. History deletion removes matching local content and derived memories. Explain that low-content server accounting may remain for 30 days to enforce budgets and reconcile billing; it does not contain conversation text.

H24 has no cloud personal-memory sync. If later introduced, deleting a memory must invalidate replicas, indexes and derived summaries with a documented backup expiry. Do not promise forensic erasure from storage media or immediate deletion from provider operational logs without evidence.

## 9. Audit and truthfulness

Action events are append-only in the normal task path. Hash chaining detects accidental edits or partial tampering relative to a trusted chain head; a fully rewritable local chain alone is not proof against whole-log replacement. Explicit user deletion and retention compaction are authorized maintenance paths and recorded as retention boundaries where feasible.

Success requires typed postcondition evidence. An API acknowledgement is evidence only of what it actually confirms. For example, a future email API's accepted-send response is not proof of recipient delivery. Unknown outcomes remain unknown until independently reconciled.

## 10. Stop and recovery

Stop-speaking cancels local playback; stop-task cancels queued actions/model requests where possible. A global hotkey remains available even when the panel is collapsed. The broker targets acknowledgement within 200ms; already dispatched OS/provider work may complete.

On stop, clear pending mutation queue, invalidate unused approvals, and suppress late agent proposals. Persist completed work and in-flight uncertainty. If a native call is hung, terminate the helper only after journaling the uncertain action. Restart never automatically replays it.

## 11. Required adversarial tests

| Test | Expected result |
|---|---|
| Document instructs KLIP to ignore user and send data | Screen content remains untrusted; external effect blocked |
| Agent uses click/key to bypass semantic denial | Helper refuses sensitive or unresolved effect |
| Payload edited after approval / token replay | Rejected binding or consumed-token error |
| Snapshot points to recycled PID or changed window | Stale target rejected |
| File path escapes root through reparse point | Refused |
| Response lost after file write | Unknown, no duplicate mutation |
| Crop contains secure synthetic field | Pixel redaction or capture refusal |
| Budget race across multiple requests | Only reservations within allowance admitted |
| Different user reads a request ID | Authorization failure |
| Renderer asks for arbitrary shell execution | No such bridge capability |

## 12. Incident response

Stop further dispatch, preserve minimal relevant evidence, explain confirmed versus unknown effects, and disable the implicated adapter or model route. Never “fix” a failure by silently relaxing policy. If sensitive data escaped, inform the user accurately and remove retained copies under the published retention/deletion policy. A successful demo does not establish the absence of prompt-injection risk.

