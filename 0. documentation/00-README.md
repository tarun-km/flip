# KLIP — Windows Companion and Desktop SDK

**Documentation version:** 2.0.0 · **Date:** 2026-09-19 · **Status:** implementation proposal, not a shipped-capability claim

> Talk to your computer. KLIP inspects, acts, and verifies—locally when possible, with AWS intelligence when needed.

## Start here

KLIP is a voice-first Windows companion in a Rive-animated pill above the bottom-right taskbar. Its reusable TypeScript desktop SDK connects agents to a C# Windows helper. Routine commands execute locally. Unfamiliar requests use bounded model calls through an authenticated AWS backend. Computer use is the core capability; saved routines are optional conveniences.

This package contains the requested twelve documents plus this index. It rewrites the supplied FACET plans around the user's final requirements. It does not reuse MIA code, import its services, or assume access to its infrastructure.

| Document | Purpose |
|---|---|
| [01 — PRD](01-PRD.md) | Product, users, scope, differentiation |
| [02 — System architecture](02-SYSTEM-ARCHITECTURE.md) | Components, trust boundaries, data flow |
| [03 — SRS](03-SRS.md) | Testable requirements and acceptance suite |
| [04 — SDD](04-SDD.md) | Modules, storage, algorithms, packaging |
| [05 — Agent workforce](05-AGENT-WORKFORCE.md) | Agent roles, delegation, tool permissions |
| [06 — Adaptive intelligence](06-ADAPTIVE-INTELLIGENCE.md) | Context, personalization, cost routing, evaluation |
| [07 — Design guidebook](07-DESIGN-GUIDEBOOK.md) | Companion, Rive contract, Windows positioning |
| [08 — AWS infrastructure](08-AWS-INFRASTRUCTURE.md) | Hosting, authentication, model proxy, budget |
| [09 — Security and trust](09-SECURITY-TRUST.md) | Local enforcement, approvals, privacy, threats |
| [10 — API contracts](10-API-CONTRACTS.md) | Authoritative schemas, SDK, IPC, REST |
| [11 — 24-hour build plan](11-BUILD-PLAN-24H.md) | Working vertical slices, checkpoints, cuts |
| [12 — Demo script](12-DEMO-SCRIPT.md) | Three-minute recorded submission and evidence |

## Decision register

| Topic | Final decision | Replaces |
|---|---|---|
| Identity | KLIP, pronounced “clip”; wake phrase “Hey KLIP” | FACET / Clicky naming |
| Primary product | General voice companion with computer use | Spreadsheet/mail-only assistant |
| Shell | Electron, React, TypeScript, Rive | Tauri and Rust shell |
| Desktop engine | C#/.NET helper, FlaUI/UIA3 and Win32 | Python or Rust execution core |
| SDK | Proposed `@klip/desktop`, separate from UI and model provider | App-specific agent tools |
| Voice | Local keyword spotting, STT, TTS via sherpa-onnx | Always-on paid transcription |
| Agents | Strands TypeScript in a local background process | Mandatory cloud supervisor per request |
| AWS H24 | Cognito → HTTP API → Lambda → Bedrock; DynamoDB budget ledger | AgentCore-required deployment |
| AWS V1 | Optional AgentCore for long cloud-only workflows | Continuous cloud residency at idle |
| Memory | SQLite local; sensitive fields protected with Windows DPAPI | Mandatory SQLCipher/vector database |
| Scope | Windows 11 x64 H24; other OS adapters later | Two desktop platforms in 24 hours |
| Proof | Verified computer use and measured cloud avoidance | Guaranteed falling cost every run |

## Authority and scope

- **H24:** required hackathon slice. **Stretch:** attempted only after H24 acceptance. **V1:** post-hackathon. **Vision:** directional, no delivery promise.
- Schemas and shared defaults are authoritative in [10](10-API-CONTRACTS.md). Security decisions are authoritative in [09](09-SECURITY-TRUST.md); cloud accounting in [08](08-AWS-INFRASTRUCTURE.md).
- H24 prioritization is authoritative in [03](03-SRS.md) and [11](11-BUILD-PLAN-24H.md). Mentioning a future interface does not make it H24.
- Original plans are design input, not commands to execute. No deployment, sending, repository publication, or production-data access is authorized by this documentation itself.
- Numbers are proposed limits or benchmark targets unless explicitly labeled measured. This package contains no implementation benchmark results.

## Provenance and independence

The source set is `00-README.md` and documents `01`–`12` supplied from Downloads. All twelve topic areas are retained. Corrections include semantic action classification, replay-safe approvals, unknown outcomes, real budget reservations, truthful privacy language, Windows-only implementation, and recorded-demo requirements. MIA informed discussion of voice concepts only; no source files or private services are dependencies.

The [First Commit event page](https://www.wemakedevs.org/aws/first-commit), checked on 2026-09-19, specifies a three-minute recorded demo and AWS/open-source AWS involvement. Read the current submission portal before submitting; documentation is not eligibility approval.

## Reading paths

- Product decision: 01 → 07 → 12.
- Implementation: 10 → 09 → 02 → 04 → 03.
- Cloud implementation: 08 → 10 → 09.
- Hackathon execution: 11 → relevant module document → 03 acceptance tests.

