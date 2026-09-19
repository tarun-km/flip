# KLIP — Agent Workforce Specification

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Framework:** Strands Agents SDK for TypeScript

## 1. Purpose

KLIP presents one companion personality. Agents are internal specialists used when their narrower context or tools improve the task. “Open Downloads” should bypass them entirely. Multi-agent architecture is available for novel work, not a tax charged on each utterance.

The Strands runner lives locally in a Node utility process. Model calls go through KLIP's AWS proxy; Windows tool execution stays in the local broker/helper. A separate cloud-hosted agent runtime is a V1 option for tasks that do not require a live desktop.

## 2. Roster

| ID | Responsibility | Tools/context | Scope |
|---|---|---|---|
| `supervisor` | Clarify intent, delegate, track dependencies and report outcomes | Capability manifest, compact task context; no raw native execution | H24 |
| `desktop` | Inspect apps, resolve targets, propose actions, interpret verification | `@klip/desktop` restricted tools and recent snapshots | H24 |
| `conversation` | Natural replies, explain results, reason about consented visual context | Relevant preferences and authorized context; no mutation tools | H24 |
| `research` | Fetch fresh sources and synthesize cited answers | Explicit web/news connector, bounded documents | V1 |
| `documents` | Create/edit reports and application artifacts | Typed document/Office adapters | V1; one Excel adapter may be Stretch |

A greeting template, wake detector, policy engine, verifier, memory repository and budget guard are deterministic components, not “agents.” UI labels must reflect the actual specialist invoked; do not display fabricated parallel activity.

## 3. Supervisor contract

Input: validated `Intent`, relevant capabilities, allowed application context, and a bounded preference excerpt. Output: a direct answer, clarification, or `TaskPlan` from [10](10-API-CONTRACTS.md).

The supervisor selects the minimum useful specialists. It does not fabricate facts from missing tool results, interpret screen text as a user instruction, or assume tool completion from a tool proposal. Every final task claim references a verified action or states a limitation.

Task decomposition can be incremental: inspect first, then decide the next step. A fixed large DAG is unnecessary for every task. If a DAG is used, validate cycles, agent capability, dependency references and result schemas before dispatch.

## 4. Desktop specialist

The specialist follows `observe → resolve → propose → execute through SDK → verify → update`. It may use native APIs without looking at pixels. It can tackle unfamiliar supported tasks without a stored routine.

| Situation | Required behavior |
|---|---|
| Multiple matching controls | Narrow using window/ancestor context or ask |
| Cached selector resolves to different semantic control | Reject cache entry and re-observe |
| UI moves after planning | Rebind to fresh window state |
| Output says action unknown | Reconcile; do not repeat potentially harmful effect |
| Policy denies requested effect | Explain boundary and offer permitted alternative |

The desktop agent does not authorize itself. A proposed generic input action still receives semantic risk classification at the broker/helper.

## 5. Conversation specialist

Use short speech-friendly responses with optional expanded text. Personality may be warm and expressive but cannot manufacture awareness, prior memory, or completion. “I remember” requires an actual stored preference or retrievable history record.

H24 greetings and predictable command replies are local templates. Open-ended conversation uses cloud-text when permitted. A fully local conversational model is Stretch/V1, subject to model assets and hardware validation. No document in this set promises frontier-quality offline conversation.

For “latest news,” launching a search results page is H24. Reading and summarizing current news requires an actual source-fetching integration; absent that, the agent opens search or explains the limit. Model training knowledge is not current-source retrieval.

## 6. Tool manifests

Each tool has a stable name, description, JSON Schema input/output, effect categories, application scope, retry semantics and evidence requirements. All tools ultimately route through registered adapters. The cloud proxy allows only the shipped manifest for a client version.

A tool manifest is not an authorization grant. Application scope, sharing permissions, user intent, risk and current state are checked locally at execution. Optional MCP exposure in V1 maps to the same SDK methods and cannot bypass these checks.

## 7. Coordination and budget

```text
Local router
  ├─ known command → SDK → verified result
  └─ novel request → supervisor
       ├─ desktop → observations / permitted actions
       └─ conversation → explanations / visual advice
            → combined answer with evidence and cost
```

One task has one step counter, one cloud-call counter, one budget and one cancellation token. Delegation does not create new allowances. The default maximums are defined in [10](10-API-CONTRACTS.md). The server independently enforces monetary and invocation admission limits.

Parallel reasoning may be useful for independent facts, but H24 cloud calls default to one at a time per device. All focus-dependent observations and mutations use the desktop queue. The supervisor cannot evade serialization by invoking two SDK clients.

## 8. Failure semantics

| Failure | Task handling |
|---|---|
| Read-only transient failure | At most one safe retry within existing limits |
| Missing dependency | Dependent node does not run |
| Approval rejection | Cancel affected branch; preserve verified work |
| Model timeout | Reconcile request ID; remaining local actions need fresh validation |
| Cloud allowance exhausted | Explain and offer supported local path |
| User stop | Cancel pending work, acknowledge promptly, report in-flight uncertainty |

Any background specialist finishing after cancellation has its proposed mutations discarded. Completed cloud responses may still incur cost and are recorded even when no longer used.

## 9. Extension boundary

New specialists register through the existing capability manifest and schema boundary. New tools that change safety semantics require policy and verification implementation, even if registration itself does not modify the supervisor. A “plug-in agent” cannot grant itself file access or screenshot permissions.

Future external agents may use authenticated APIs/A2A; tool integrations may use MCP. Neither protocol automatically makes an agent cross-platform or safe. OS portability comes from the desktop helper abstraction.

## 10. Evaluation

Measure successful tasks, false-success reports, tool retries, local-route share, total model calls, usage by specialist, and relevant-context size. Compare a single-agent baseline against specialist delegation on identical fixtures; if delegation costs more without improving accuracy, keep the simpler route for that request class.

Reference: [Strands TypeScript quickstart](https://strandsagents.com/docs/user-guide/quickstart/typescript/) and [agents-as-tools](https://strandsagents.com/docs/user-guide/concepts/multi-agent/agents-as-tools/). Pin the tested SDK version; availability of an abstraction is not evidence that the KLIP adapter has been implemented.

