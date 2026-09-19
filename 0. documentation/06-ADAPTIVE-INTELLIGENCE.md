# KLIP — Adaptive Intelligence and Cost Routing

**Version:** 2.0.0 · **Date:** 2026-09-19 · **Principle:** improve context and routing without requiring learned workflows

## 1. What adapts

KLIP adapts which perception and reasoning mechanism it uses, and retrieves relevant personal context. It does not train a new model in H24. It is useful on the first unfamiliar supported task through computer use.

| Mechanism | Benefit | Scope |
|---|---|---|
| Local command resolution | No model cost for predictable intent | H24 |
| Explicit preference memory | Relevant defaults such as preferred browser | H24 |
| Bounded conversation context | Continuity without full-history resends | H24 |
| Target selector cache | Faster repeated discovery, freshly verified | Stretch |
| Inferred project/routine memory | Broader continuity with user control | V1 |

## 2. Request routing

Start with deterministic command grammar and validation, not a paid routing model. Example mappings: “open Downloads” → reveal known folder; “search Bing for X” → encoded search URL; “mute” → microphone control; “what did you spend?” → local ledger view.

Unknown inputs remain unknown. If “open the latest thing” could mean several roots or file types, ask. If the task needs reasoning and cloud is allowed, use cloud-text. If it needs an image and consent exists, use cloud-vision. The optional local-model route is enabled only after an installed model passes a hardware/task test.

```text
intent → supported command with validated arguments? → local-command
       → ambiguity resolvable with a short question? → clarify
       → optional local model suitable and installed? → local-model
       → cloud allowed, permitted context, budget available? → cloud route
       → otherwise explain the limit and keep local features available
```

## 3. Context builder

Construct each cloud request from the current request, trusted task instructions, only applicable tools, a compact task summary, relevant explicit preferences and the latest necessary observation. Cap total text input using [10](10-API-CONTRACTS.md). Trim least-relevant history first, never omit the binding facts needed to avoid acting on the wrong file/window.

A bounded recent-turn window is sufficient for H24. Summaries are generated lazily when required, with any model cost accounted for. Summary generation is not an unmetered background loop. No vector database is required; V1 may add an embedding index if retrieval benchmarks justify its CPU/storage/privacy cost.

## 4. Memory provenance

| Memory | Source | Use |
|---|---|---|
| Explicit preference | User says “Use Chrome by default” | Apply to compatible future requests |
| Conversation fact | Opt-in history with source turn ID | Retrieve when relevant; label uncertainty |
| Current observation | Fresh SDK snapshot | Describe current app; expire quickly |
| Inferred preference | Repeated edits/events, V1 | Propose or mark inferred; allow rejection |
| Project association | User-selected folder and app links | Open relevant project without guessing global filesystem |

Observed repetition never authorizes a future action. A preference to use a contact is not permission to send that contact messages. Factual edits should not become broad tone/style rules. Safety policy and approval requirements cannot be learned away.

## 5. Selector cache — optional optimization

Cache keys include app ID/version, window or document scope, normalized query and expected role. Prefer stable AutomationId and scoped role/name; use ancestor chains when appropriate. Never treat an absolute coordinate as a reusable primary selector.

Proposed heuristic: start confidence at 0.5; verified hit `c ← min(0.99, c + 0.15(1-c))`; miss `c ← 0.6c`; evict below 0.2 or after three consecutive misses. App-version changes invalidate or reduce confidence based on fixture evidence. Confidence never replaces fresh identity checks.

Cached discovery is reinforced only after relevant action verification, not just because a selector returned an element. This avoids increasing trust in a consistently wrong target.

## 6. Routines and passive observation

Routine discovery is V1 and secondary to computer use. If enabled, store minimal application/project events with an explicit observation switch. Detect sequences on the device, explain their evidence, and ask before saving a routine. H24 does not claim to infer a user's whole day from ambient activity.

An accepted routine stores parameterized action intent and verification conditions. It still re-resolves current targets and applies approval policy. Fresh content—news, prices, file contents, screen state—is fetched again. Reusing a workflow is not reusing yesterday's answer.

## 7. Cost mechanics

The primary savings are avoided calls: local voice, direct OS operations, bounded context and task-specific agents. Reusing selectors or plans can help but is not required for the central claim. Cloud prompt caching is V1 and enabled only after verifying model support, eligible prefix size and actual cache usage.

```text
estimated inference cost = input tokens × input rate
                        + output tokens × output rate
                        + cache-read/write charges where applicable
                        + model-specific image charges where applicable
```

Token and image billing must follow the selected model's actual units; do not double-count image tokens already included in usage. Rates and a price-version identifier are stored with each request. Costs from hosting, search or external speech services are separate from this equation.

## 8. Usage UI semantics

| Display | Meaning |
|---|---|
| “Local · 0 cloud tokens” | No paid model invocation for this request |
| “Cloud · estimated $…” | Actual model token usage priced with a recorded rate table |
| “Pending up to $…” | Reservation held; actual usage not yet confirmed |
| “Local model tokens” | Optional separate inference metric, not Bedrock usage |
| “Other AWS costs” | Billing-level overhead reported separately, may be delayed |

Never turn missing provider usage into zero. Canceled tasks may still have billed cloud work. A user clearing local history does not reset server-side spending limits.

## 9. Benchmark design

Use three classes: deterministic local commands, novel structured desktop tasks, and visual tasks. Keep a conventional cloud-per-step baseline separate from the adaptive KLIP run. Both use the same model family, task fixtures and success definitions where applicable.

| Measure | Why |
|---|---|
| Verified task success / false successes | Savings are useful only if actions remain correct |
| Paid calls and input/output tokens | Shows avoidance rather than decorative charts |
| Inference estimate and total task latency | Captures practical user benefit |
| UIA/OCR/vision mix and retries | Explains where savings and failures originate |
| CPU/RAM and local response time | Exposes the tradeoff shifted to the device |

Reset cache explicitly for cold runs; label warm runs. Repeat at least three times per task, report range as well as median, and retain failed runs in results. Include moved-window and changed-file tests. Do not claim 50% savings or continuous improvement until measurements establish it on a defined suite.

## 10. Demonstrable claim

“For supported routine commands, KLIP uses no cloud inference. For unfamiliar desktop tasks, it chooses bounded local perception and paid reasoning as needed, records each call, and verifies execution.”

This is testable without saying the system is uniquely first, universally autonomous, always cheaper, or capable of zero-cost general intelligence.

