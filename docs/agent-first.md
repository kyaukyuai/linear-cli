# Agent-Native Runtime Runbook

`linear-cli` is designed so an agent can discover the command surface, read Linear state, preview writes, apply mutations, and recover from uncertain outcomes without scraping terminal text.

Use this document as the default operating loop for the current `v3` line and current `main`. Machine-readable output is the primary runtime contract. Human-readable text and prompt flows are explicit escape hatches.

If you need the breaking-default context or migration checklist for the `v3` line, read [agent-only-v3.md](./agent-only-v3.md) alongside this guide. For copy-pasteable migration examples, also keep [v2-to-v3-migration-cookbook.md](./v2-to-v3-migration-cookbook.md) nearby.

## 1. Discover The Surface

Start with the self-describing registry:

```bash
linear capabilities
linear capabilities --compat v1
```

This tells an agent runtime:

- which commands support `--json`
- which commands support `--dry-run`
- which commands accept stdin or file input
- which confirmation-bypass flag is canonical
- which contract version or retry semantics apply
- which success fields and write semantics are exposed for machine-readable execution

Use the default `linear capabilities` shape when the caller is ready for schema-like discovery metadata such as required inputs, constrained values, defaults, repeatable or variadic inputs, deprecated aliases, context resolution hints, input constraints, canonical argv examples, stdin/file targets, structured output contracts, and write semantics. Reach for `--compat v1` only when an older consumer still expects the trimmed legacy startup shape.

The default runtime now uses agent-safe execution semantics:

```bash
linear capabilities
```

`agent-safe` disables pager-by-default behavior, extends the built-in write timeout to `45000ms` unless the caller overrides it, and requires explicit `--yes` for destructive confirmation bypass. It does not force `--json`, auto-confirm destructive actions, or replace missing required inputs.

Human/debug prompt flows are explicit. When a command supports prompts or editor entry, pass `--profile human-debug --interactive`; otherwise missing required inputs fail fast with actionable guidance. In other words, the steady-state assumption for the `v3` runtime is: no prompts, no pager, no styled text parsing.

The default capabilities shape and the read entrypoints below are treated as startup-critical contracts and are release-gated in CI.

Release-gated downstream certification currently covers these real consumer flows:

- startup-monitor consumer suite: `linear capabilities`, `linear capabilities --compat v1`, and the default-JSON `linear issue list`
- diagnostics consumer suite: `linear team list --json` for machine-readable diagnostics and bare `linear team list` for human inspection
- compatibility-bridge consumer suite: `linear capabilities --compat v1`, `linear team list --json`, and `linear issue view --text`
- control-plane consumer suite: `linear resolve issue` -> `linear issue update --dry-run --json` -> `linear issue update`
- timeout-recovery consumer suite: `linear issue update --comment --json` with machine-actionable timeout reconciliation

Commands outside those certified flows remain best-effort until they are promoted into the certification suite.

Use the capabilities surface classification directly when choosing a path:

- `stable`: primary agent-runtime surface. use by default.
- `partial`: shared dry-run or machine-readable helper surface without a full stable contract. use only when the stable surface does not cover the workflow yet.
- `escape_hatch`: raw or human/debug-only path. use only with explicit intent, never for startup-critical or automation-tier assumptions.

## 2. Resolve References Before Mutating

When a caller needs canonical IDs, current-team fallback, or ambiguity data, resolve references explicitly before preview/apply:

```bash
linear resolve issue ENG-123
linear resolve pack --issue ENG-123 --workflow-state started --label Bug
linear resolve team ENG
linear resolve workflow-state started --team ENG
linear resolve user self
linear resolve label Bug --team ENG
```

This lets an agent:

- confirm how the CLI resolved issue, team, workflow state, user, label, and project refs
- inspect `status`, `matchedBy`, `candidates`, and `unresolvedReason` without scraping terminal text
- reuse canonical IDs and shared team context across preview/apply steps; `linear resolve pack` is the fast path for multi-entity agent workflows

## 3. Read State With Stable JSON

Prefer commands that are part of the automation contract:

```bash
linear issue view ENG-123
linear issue list
linear project view "Automation Contract v3"
linear cycle current --team ENG
linear document list
linear webhook view webhook_123
linear notification list
```

Use `--text` only when a human needs terminal-oriented output for inspection or debugging. Agent runtimes should treat text mode as a debugging tool, not a normal parser target.

For human-guided prompt entry on command surfaces that support it, pass `--profile human-debug --interactive` explicitly.

For the full contract surface, see [json-contracts.md](./json-contracts.md).

## 4. Preview Writes Before Mutating

When a command supports `--dry-run`, use it first:

```bash
linear issue create -t "Backfill docs" --team ENG --dry-run --json
linear issue update ENG-123 --state started --dry-run --json
linear issue relation add ENG-123 blocked-by ENG-100 --dry-run --json
linear issue start ENG-123 --dry-run
linear --profile human-debug issue create --interactive
```

Preview output is stable and designed for plan/confirm/apply loops. On representative write surfaces, `operation` is the shared preview/apply family that callers should diff first. The goal in the `v3` runtime is that an agent can run the same parser path for preview, apply, no-op, and partial-success handling.

## 5. Apply Writes With Machine-Readable Output

When applying a write on a default-JSON surface, the machine-readable path is already active. Keep `--json` only when you want to be explicit or when the command has not flipped to JSON by default yet. Always inspect the process exit code.

```bash
linear issue update ENG-123 --state done --comment "Shipped"
linear notification read notif_123 --json
```

When the write command supports the preview/apply contract family, inspect the top-level `operation` field first. That gives one parser path for both `--dry-run` and apply results. When a high-value apply result also exposes `receipt`, use it as the write-specific summary of what actually happened. Today that family covers issue create/update/comment/relation and batch creation, issue assignment/estimate/move/priority, project create and label add/remove, webhook create/update/delete, and notification read/archive.

The receipt is the shared place for:

- `operationId`
- `resolvedRefs`
- `appliedChanges`
- `noOp`
- `nextSafeAction`

When the write came from `--context-file`, also inspect `receipt.sourceProvenance`. That is the machine-readable audit trail for source system, source ref, related URLs, context IDs, deterministic triage hints, and any normalized participant or evidence metadata that shaped the intake flow.

Important non-zero exit codes:

- `4`: auth or authorization failure
- `5`: plan or workspace limit failure
- `6`: write confirmation timeout

## 6. Recover From Timeout Or Partial Success

Write commands now distinguish timeout failures from generic failures and may include reconciliation details in `error.details`.

Look for:

- `failureMode = "timeout_waiting_for_confirmation"`
- `outcome = "definitely_failed" | "probably_succeeded" | "partial_success" | "unknown"`
- `appliedState = "not_applied" | "applied" | "partially_applied" | "unknown"`
- `callerGuidance.nextAction`
- `partialSuccess`
- `retryCommand`

This is the intended path for workflow-safe automation after uncertain writes. Prefer `callerGuidance.nextAction` over custom heuristics:

- `reconcile_before_retry`: read the target object before retrying
- `retry_command`: the CLI observed no applied side effect, so retrying is the intended path
- `treat_as_applied`: treat the write as successful
- `resume_partial_write`: use `partialSuccess` and any retry hint to continue from the remaining step

## 7. Prefer stdin And File Input For Markdown

For multi-line descriptions or comments, avoid shell-escaped inline text.

```bash
cat description.md | linear issue create -t "My issue" --team ENG
linear issue update ENG-123 --description-file ./description.md
linear issue comment add ENG-123 --body-file ./comment.md
linear issue update ENG-123 --state triage --context-file ./slack-thread.json --dry-run --json
linear issue update ENG-123 --context-file ./slack-thread.json --apply-triage --dry-run --json
linear issue update ENG-123 --context-file ./slack-thread.json --autonomy-policy suggest-only --dry-run --json
```

The full stdin rules are documented in [stdin-policy.md](./stdin-policy.md). When upstream tooling already normalized a Slack thread, support ticket, or similar source into JSON, prefer `--context-file` over inventing ad-hoc markdown at the wrapper layer. When that envelope already carries deterministic routing hints, add `--apply-triage` to preview or apply team/state/label suggestions without re-implementing triage in the wrapper. Use `--autonomy-policy suggest-only` when the wrapper should only surface source and triage suggestions, `--autonomy-policy preview-required` when a preview is mandatory before a later apply, and `--autonomy-policy apply-allowed` when the intake flow may mutate Linear once `--dry-run` is removed.

In that source-adjacent path, read the payloads in this order:

- `triage` for deterministic routing or duplicate hints
- `autonomyPolicy` for the caller-selected runtime policy and its semantics
- `operation` for the shared preview/apply contract
- `receipt.sourceProvenance` after apply for the upstream audit trail

## 9. Use Human/Debug Mode Only Deliberately

Human/debug mode still exists for maintainers, incident response, and one-off inspection, but it is not the primary runtime. In the `v3` runtime, using the commands below should feel like consciously leaving the agent-native path:

```bash
linear issue view ENG-123 --text
linear --profile human-debug --interactive issue create
linear --profile human-debug --interactive auth login
```

If a script or agent still depends on these flows, treat that as migration debt and move the steady-state path back to discovery, JSON reads, dry-run, apply, and structured recovery.

## 8. Use `linear api` Only As Escape Hatch

If the CLI already has a stable command, prefer the CLI command over raw GraphQL.

Use `linear api` only when:

- a read surface is not covered yet
- you need an experimental or one-off query
- you are intentionally working outside the automation contract
