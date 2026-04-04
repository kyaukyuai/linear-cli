# Agent-First Workflow

`linear-cli` is designed so an agent can discover the command surface, read Linear state, preview writes, apply mutations, and recover from uncertain outcomes without scraping terminal text.

Use this document as the default operating loop.

If you are planning for the breaking default flips in `v3.0.0`, read [agent-only-v3.md](./agent-only-v3.md) alongside this guide.

## 1. Discover The Surface

Start with the self-describing registry:

```bash
linear capabilities
linear capabilities --compat v1
```

This tells an agent:

- which commands support `--json`
- which commands support `--dry-run`
- which commands accept stdin or file input
- which confirmation-bypass flag is canonical
- which contract version or retry semantics apply
- which success fields and write semantics are exposed for machine-readable execution

Use the default `linear capabilities` shape when the caller is ready for schema-like discovery metadata such as required inputs, constrained values, defaults, context resolution hints, input constraints, canonical argv examples, stdin/file targets, structured output contracts, and write semantics. Reach for `--compat v1` only when an older consumer still expects the trimmed legacy startup shape.

The default runtime now uses agent-safe execution semantics:

```bash
linear capabilities
```

`agent-safe` disables pager-by-default behavior, extends the built-in write timeout to `45000ms` unless the caller overrides it, and requires explicit `--yes` for destructive confirmation bypass. It does not force `--json`, auto-confirm destructive actions, or replace missing required inputs.

Human/debug prompt flows are now explicit. When a command supports prompts or editor entry, pass `--profile human-debug --interactive`; otherwise missing required inputs fail fast with actionable guidance.

The default capabilities shape and the read entrypoints below are treated as startup-critical contracts and are release-gated in CI.

Release-gated downstream certification currently covers these real consumer flows:

- startup discovery with `linear capabilities` and `linear capabilities --compat v1`
- explicit startup discovery with `linear capabilities --json` and `linear capabilities --json --compat v1`
- reference resolution with `linear resolve issue/team/workflow-state/user/label --json`
- startup-safe reads with `issue view/list`, `project view`, `cycle current`, `document list`, `webhook view`, and `notification list`
- the `resolve -> preview -> apply` loop for `linear issue update --json`
- the `issue update --comment --json` timeout recovery path

Commands outside those certified flows remain best-effort until they are promoted into the certification suite.

## 2. Resolve References Before Mutating

When a caller needs canonical IDs, current-team fallback, or ambiguity data, resolve references explicitly before preview/apply:

```bash
linear resolve issue ENG-123
linear resolve team ENG
linear resolve workflow-state started --team ENG
linear resolve user self
linear resolve label Bug --team ENG
```

This lets an agent:

- confirm how the CLI resolved issue, team, workflow state, user, and label refs
- inspect `status`, `matchedBy`, `candidates`, and `unresolvedReason` without scraping terminal text
- reuse canonical IDs and team context across preview/apply steps

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

Use `--text` only when a human needs terminal-oriented output for inspection or debugging.

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

Preview output is stable and designed for plan/confirm/apply loops.

## 5. Apply Writes With Machine-Readable Output

When applying a write, prefer `--json` and inspect the process exit code.

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
```

The full stdin rules are documented in [stdin-policy.md](./stdin-policy.md).

## 8. Use `linear api` Only As Escape Hatch

If the CLI already has a stable command, prefer the CLI command over raw GraphQL.

Use `linear api` only when:

- a read surface is not covered yet
- you need an experimental or one-off query
- you are intentionally working outside the automation contract
