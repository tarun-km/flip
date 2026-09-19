# KLIP — Three-Minute Demo Script

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Format:** recorded submission, maximum target 3:00

## 1. The claim to demonstrate

“KLIP is a Windows voice companion backed by a reusable computer-use SDK. It handles common actions locally, uses AWS for harder reasoning and vision, and shows the cost while verifying what it did.”

Computer use leads the demo. Saved routines and skill generation are not required. The character provides the interface and personality; real execution and transparent routing provide the evidence.

The [First Commit page](https://www.wemakedevs.org/aws/first-commit) specifies a three-minute recorded video and no live demo. This replaces the original FACET five-minute stage script. Confirm the current portal's upload and URL requirements before recording.

## 2. Prepare the recording

| Item | Setup |
|---|---|
| Windows desktop | Show Windows version/build in supporting notes; suppress unrelated notifications |
| Applications | Explorer, Notepad and prepared Chrome session, plus a sample image |
| Files | Safe dummy Downloads folder fixtures and a test text file; no personal data |
| KLIP | Visible bottom-right pill; microphone active with consent; chosen cloud mode visible |
| Usage | Fresh demo task/session IDs; historical totals clearly labeled, not silently reset billing |

Record actual system audio and screen behavior. Avoid editing out failures while presenting the sequence as uninterrupted. Any time compression or earlier recording is labeled. Do not read representative cost numbers from this document—there are none.

## 3. Run of show

### 0:00–0:20 — Companion and problem

Show the idle character above the taskbar.

Say: **“Hey KLIP, what's up?”**

KLIP gives a local greeting and animates while speaking.

Narration: “This is KLIP, a Windows companion you can talk to. Everyday desktop requests should not require a paid agent loop.”

Evidence: wake/listening/speaking transitions and the local-route badge. If wake recognition is not implemented, use push-to-talk and say so.

### 0:20–0:45 — Zero-cloud useful action

Say: **“Open my latest download.”**

KLIP opens a seeded supported document or reveals it if the format is not supported. Show the chosen filename and actual desktop result.

Narration: “Speech and this file operation ran locally. The ledger shows zero cloud model calls for this request.”

Do not say “free to run” or “zero compute.” This proves a defined command path, not all possible tasks.

### 0:45–1:25 — Computer use on changed state

Move the Notepad window to a different location. Ask for a supported edit with fresh text, for example: **“In this note, replace the draft text with ‘Poster review at three’.”**

Show the desktop specialist's observation, the actual text change and exact readback verification. Use a fresh unsaved dummy note so this is a permitted R2 edit.

Narration: “The SDK resolves the current Windows control and verifies the new value. It is not replaying screen coordinates. Unfamiliar instructions can use AWS reasoning; the actual OS action stays local.”

Only claim unfamiliar instruction handling if the agent actually interpreted the request. A preprogrammed command should be identified as such.

### 1:25–1:55 — AWS vision with clear consent

Open a non-sensitive sample artwork. Say: **“What could I improve in this image?”**

Show the crop preview and explicit sharing decision. KLIP sends the crop through the authenticated AWS backend, speaks a short answer and displays the resulting usage.

Narration: “Here local UI metadata is insufficient, so KLIP uses Bedrock vision on this approved region. The request's tokens and estimated cost are visible.”

If vision latency exceeds this segment, use an honestly labeled time cut or adjust earlier segments. Do not play a canned answer as a live AWS result.

### 1:55–2:20 — Control and accounting

Request an overwrite of the seeded test text file. Show the exact path/content approval, choose Reject, and show the original file remains unchanged.

Say: **“KLIP, what did you spend?”** Show per-request local/cloud entries and pending-versus-settled states if applicable.

Narration: “Consequential changes wait for approval. Usage includes every specialist call and retry; an unknown charge is not displayed as zero.”

### 2:20–3:00 — Architecture, SDK and close

Show one architecture slide or clean diagram:

```text
Electron + React + Rive
        ↓
TypeScript desktop SDK → C# Windows helper → real apps
        ↓ when needed
Cognito → API Gateway → Lambda → Bedrock
                       ↔ DynamoDB budget ledger
```

Briefly show the independent SDK client observing or opening Notepad.

Narration: “The companion and SDK are independent of MIA. Strands coordinates specialists locally. AWS supplies metered reasoning and vision. This build supports these tested Windows applications; the reusable SDK is the basis for adding more.”

End with **“KLIP: talk to your computer, see what it did, know what it cost.”** Show project URL and measured results only.

## 4. Evidence attached to submission

| Evidence | Contents |
|---|---|
| Functional report | Actual pass count over repeated clean-fixture tests and known failures |
| Usage report | Request IDs, routes, model names, actual token usage, dated price table |
| Desktop report | OS/app versions, DPI, adapters, verification evidence |
| Resource report | Idle/active CPU and memory, measurement method |
| Architecture/source | SDK boundary, AWS deployment, dependencies, implementation dates |

Remove private context and credentials from all artifacts. A public health URL proves deployment but not the agent capability; provide the video and appropriately scoped demo access/instructions.

## 5. Claims to avoid

- “Nobody has computer use on Windows” or “the world's first.” Novelty requires comparative evidence.
- “It never sends screen content.” It sends selected context and approved image crops when cloud is used.
- “Zero tokens for every task.” Local commands can avoid cloud tokens; complex tasks still incur inference.
- “It learns your entire workflow automatically.” H24 stores explicit preferences and bounded history.
- “It can operate every app” or “it cannot make a mistake.” State tested scope and observed failure handling.

## 6. Failure handling during recording

| Failure | Honest response |
|---|---|
| Wake missed | Use push-to-talk; disclose wake reliability if recurring |
| UI target unresolved | Show clarification or failure, choose a supported test; retain failure in evaluation |
| Network/model failure | Show local commands still working; label any separate cloud recording |
| Budget exhausted | Show enforced limit; do not disable accounting to finish the video |
| Unknown mutation | Stop and reconcile; do not rerun blindly |

The submission should demonstrate the working artifact, not a narrated roadmap. Replace the script's capability claims with the implemented subset if acceptance testing fails.

