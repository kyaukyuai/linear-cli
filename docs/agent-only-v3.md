# Agent-Only v3 Transition Plan

This document is the source of truth for the `linear-cli` v3 transition from an agent-first CLI to an agent-native runtime.

Use it to answer three questions:

1. which `2.x` defaults will flip in `3.0`
2. what human-oriented behavior remains available after `3.0`
3. what must be true before cutting `v3.0.0`

## Goals

`linear-cli` v3 should make the safest path for agents the default path:

- machine-readable output by default
- fully non-interactive execution by default
- agent-safe execution semantics by default
- startup discovery that is sufficiently schema-like for agent runtimes
- consistent write receipts and preview/apply contracts across high-value mutations

## Non-Goals

v3 is not trying to remove every human debugging path.

The design keeps explicit human/debug escape hatches for:

- styled terminal output
- manual inspection during incident response
- ad-hoc local troubleshooting by maintainers

Those paths become secondary and must be explicitly requested.

## Default Changes In v3

| Surface                     | 2.x default                                                                                            | 3.0 default                                                             |
| --------------------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Output mode                 | styled human text unless `--json` is passed                                                            | machine-readable JSON for core read/write command surfaces              |
| Interactive fallbacks       | some commands still prompt or offer human-oriented fallback flows                                      | missing required input fails fast with actionable guidance              |
| Pager behavior              | command-dependent, with `--profile agent-safe` disabling pager-by-default behavior                     | pager disabled by default                                               |
| Execution profile           | `agent-safe` is opt-in via `--profile agent-safe`                                                      | agent-safe semantics are the default runtime behavior                   |
| Capabilities discovery      | `linear capabilities --json` defaults to richer `v2`; `--compat v1` preserves the legacy startup shape | richer schema metadata remains the default capabilities surface         |
| Write result interpretation | representative high-value writes expose `operation` / `receipt`                                        | remaining target writes are expected to expose the same contract family |

## Human And Debug Escape Hatches

v3 keeps human-oriented behavior only behind explicit opt-in.

The intended steady-state is:

- `--text` is the canonical flag for human-readable terminal output
- `--json` remains accepted, but becomes redundant on command surfaces that already default to JSON
- `--profile human-debug` is the canonical execution-profile escape hatch for prompt and pager oriented debugging
- pager remains available only when the caller explicitly opts in
- destructive confirmation bypass still uses `--yes`

The exact human/debug surface may expand slightly during implementation, but it must stay explicit. Human-oriented behavior must not be the default for startup-critical or automation-tier flows.

## Compatibility And Deprecation Policy

The compatibility policy is intentionally conservative.

### 2.x policy

Before `v3.0.0`, additive migration helpers may be introduced in `2.x`, but default behavior does not flip.

Allowed in `2.x`:

- `--text` or equivalent human-output escape hatch
- deprecation warnings for behavior that will flip in `v3`
- migration docs and examples
- preview or experimental flags that let consumers test `v3` behavior explicitly

Not allowed in `2.x`:

- changing the default startup shape of `linear capabilities --json`
- changing core command defaults from human output to JSON
- removing interactive behavior without an explicit opt-in path

### 3.0 policy

`v3.0.0` is the point where defaults flip.

After `v3.0.0`:

- agent-native behavior is the default
- human/debug behavior is opt-in only
- startup-critical contracts must stay release-gated
- machine-readable contract changes require explicit release-note callouts

## Downstream Migration Guidance

Downstream consumers should migrate in this order.

1. Stop parsing styled terminal output.
2. Use `linear capabilities --json` or the richer compatibility mode to discover command traits.
3. Treat `operation`, `receipt`, and `error.details` as the canonical execution surface.
4. Pass all required inputs explicitly; do not rely on prompts.
5. Add explicit human/debug flags in any manual scripts that still expect terminal text.

Recommended preparation work for consumers before `v3.0.0`:

- pin to a `2.x` version while migrating
- add tests for startup discovery and representative write flows
- treat the default runtime semantics as the v3 rehearsal, and keep `--profile agent-safe` only as an explicit compatibility override while older scripts migrate
- adopt `linear resolve ... --json` before preview/apply loops
- use explicit `--profile human-debug --interactive` only for human/debug prompt flows; do not rely on fallback prompts

## Release Criteria For v3.0.0

Do not cut `v3.0.0` until all of the following are true.

### Design And Docs

- `KYA-310` through `KYA-315` are complete
- this document remains accurate
- README, skill docs, and contract docs describe agent-native defaults
- migration guidance for `2.x -> 3.0` is published

### Runtime Behavior

- core read/write command surfaces default to JSON
- startup-critical flows are fully non-interactive
- agent-safe execution semantics are the default
- richer capabilities schema metadata is the default startup discovery surface
- remaining target write commands expose consistent `operation` / `receipt` contracts

### Verification

- startup-critical contract tests are updated for v3 defaults
- downstream consumer certification covers at least one real consumer on v3 defaults
- release-gated docs and examples match the current CLI version and startup behavior
- CI and release workflows remain green with the new defaults

## Issue Mapping

- `KYA-309`: design and migration policy
- `KYA-310`: JSON-by-default output
- `KYA-311`: non-interactive default execution
- `KYA-312`: agent-safe by default
- `KYA-313`: richer capabilities metadata by default
- `KYA-314`: operation/receipt completion across remaining writes
- `KYA-315`: docs rewrite for agent-native runtime
