# KLIP — baseline implementation

This is the working baseline for the product specified in
[`0. documentation/`](./0.%20documentation/) (start at
[00-README.md](./0.%20documentation/00-README.md)). It follows the module
layout in [`04-SDD.md`](./0.%20documentation/04-SDD.md) section 1.

## What's real right now

- **Companion front-end** (`apps/desktop`) — an Electron pill anchored above
  the bottom-right taskbar, expanding into a conversation + history panel.
  The character is an original animated SVG creature wired to the exact
  8-state contract (`idle/listening/thinking/speaking/acting/awaiting-
  approval/success/error`) a real Rive asset would drive — drop a `klip.riv`
  into `assets/rive/` (see its README) and the app switches over
  automatically via `@rive-app/react-canvas`, already integrated.
- **Desktop SDK** (`packages/desktop-sdk`) — a real, safe, allowlisted local
  execution adapter: it launches Notepad/Explorer/Calculator/Chrome, reveals
  or opens files in Downloads/Documents/Desktop/Pictures, finds your latest
  completed download, writes/overwrites a text note with SHA-256
  verification (behind an approval for overwrites), and runs a Google/Bing
  search — all with zero cloud calls, on this actual Windows machine. It
  works headless too: `examples/sdk-cli` drives it with no Electron/React.
- **Multi-agent workforce** (`packages/agent-runtime`) — a deterministic
  local command router (zero-cloud for known commands), a `Supervisor` that
  builds a `TaskPlan` for anything the router doesn't recognize, and
  `DesktopAgent` / `ConversationAgent` specialists behind a real scheduler,
  budget guard and R3 approval broker (with SHA-256-bound, one-use, replay-
  safe approval tokens).
- **Local memory** (`packages/memory`) — opt-in conversation/task history,
  preferences and a usage ledger, with delete-everything support.
- **Real open-ended conversation, today** — add an Anthropic API key in the
  Settings tab and KLIP answers open-ended questions for real, via a direct
  Claude call (`packages/agent-runtime/src/agents/anthropicCognitionPort.ts`).
  Keys are encrypted at rest with Electron's `safeStorage` (Windows DPAPI)
  (`apps/desktop/src/main/keyStore.ts`). This is an interim path, not the
  AWS-metered proxy the docs specify — see the file header for why.
- **Customizable global hotkey** — change the expand/collapse shortcut from
  Settings with a live key-combo capture UI.
- **Professional bento-style dashboard tab** — local/cloud request counts,
  verified/unknown action counts and recent tasks as stat tiles.

## Credit

The API-key store, Anthropic client and hotkey-capture UI are adapted (MIT)
from [pango07/flicky](https://github.com/pango07/flicky), a voice-driven
screen-aware desktop companion with a very similar shape to KLIP. Each ported
file says so in its header. Flicky is itself an independent reimagining of
[Farza's Clicky](https://github.com/farzaa/clicky) — credit flows through.

## What's intentionally not built yet (see each README)

- `native/Klip.Windows` — the C#/UIA3 helper. No UIA, no real click/type on
  arbitrary controls yet; the SDK is honest about this (`UNSUPPORTED_CAPABILITY`).
- `cloud/cognition` + `infra` — the AWS Cognito/API Gateway/Lambda/Bedrock
  stack. Nothing is deployed; the Anthropic-direct path above is a stopgap,
  not this architecture.
- Local sherpa-onnx voice — the app currently uses the browser's Web Speech
  API as a labeled, opt-in placeholder (`apps/desktop/src/renderer/src/lib/voice.ts`).
- Encrypted storage for history/usage (AES-GCM/DPAPI over SQLite) — API keys
  are encrypted (see above); conversation/task/usage data is still plaintext JSON.

## Run it

```bash
npm install
npm run dev
```

This launches the Electron companion (`@klip/desktop`). Try typing:
`open notepad`, `open downloads`, `search google for weather`,
`open my latest download`, `create a note`, `what did you spend?`, `help`.
Ask something open-ended (e.g. "what's a good name for a robot dog?") and
KLIP will say cloud reasoning isn't connected yet — add an Anthropic API key
in the **Settings** tab to enable real conversation.

Run the independent SDK CLI (no UI, no agents):

```bash
npm run sdk-cli -- open notepad
npm run sdk-cli -- reveal downloads
npm run sdk-cli -- observe notepad
```

## Repository layout

```text
apps/desktop/         Electron main, preload, React/Rive-ready renderer
packages/contracts/    Authoritative shared types + zod IPC schemas
packages/desktop-sdk/  KlipDesktop client + local execution adapter
packages/agent-runtime/ Router, supervisor, desktop/conversation agents, approvals
packages/memory/       Local JSON-backed history/preferences/usage store
examples/sdk-cli/      Independent SDK demonstration client
native/Klip.Windows/   Planned C# helper (not built)
cloud/cognition/       Planned AWS Lambda proxy (not deployed)
infra/                 Planned CDK stack (not deployed)
assets/rive/           Drop a real klip.riv here
assets/models/         Planned sherpa-onnx model assets
tests/fixtures/        Planned acceptance-test fixtures
0. documentation/      The 12 source documents this build follows
```

## Honesty notes

This baseline does not claim UIA computer-use, cloud reasoning/vision, local
voice, or encrypted storage — those are scoped out for now and documented as
such in the relevant `README.md`. What it does claim (local app/file
actions, the router/agent/approval pipeline, the companion UI) is real and
runnable on this machine today.
