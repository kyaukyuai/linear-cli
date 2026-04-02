# Agent-First Workflow

`linear-cli` is designed so an agent can discover the command surface, read Linear state, preview writes, apply mutations, and recover from uncertain outcomes without scraping terminal text.

Use this document as the default operating loop.

## 1. Discover The Surface

Start with the self-describing registry:

```bash
linear capabilities --json
linear capabilities --json --compat v2
```

This tells an agent:

- which commands support `--json`
- which commands support `--dry-run`
- which commands accept stdin or file input
- which confirmation-bypass flag is canonical
- which contract version or retry semantics apply

Use the default `linear capabilities --json` shape for runtime startup compatibility. Reach for `--compat v2` only when the caller is ready to consume richer command schema metadata such as required inputs, constrained values, defaults, context resolution hints, input constraints, canonical argv examples, stdin/file targets, structured output contracts, and write semantics.

The default capabilities shape and the read entrypoints below are treated as startup-critical contracts and are release-gated in CI.

## 2. Read State With Stable JSON

Prefer commands that are part of the automation contract:

```bash
linear issue view ENG-123 --json
linear issue list --json
linear project view "Automation Contract v3" --json
linear cycle current ENG --json
linear document list --json
linear webhook view webhook_123 --json
linear notification list --json
```

For the full contract surface, see [json-contracts.md](./json-contracts.md).

## 3. Preview Writes Before Mutating

When a command supports `--dry-run`, use it first:

```bash
linear issue create -t "Backfill docs" --team ENG --dry-run --json
linear issue update ENG-123 --state started --dry-run --json
linear issue relation add ENG-123 blocked-by ENG-100 --dry-run --json
linear issue start ENG-123 --dry-run
```

Preview output is stable and designed for plan/confirm/apply loops.

## 4. Apply Writes With Machine-Readable Output

When applying a write, prefer `--json` and inspect the process exit code.

```bash
linear issue update ENG-123 --state done --comment "Shipped" --json
linear notification read notif_123 --json
```

Important non-zero exit codes:

- `4`: auth or authorization failure
- `5`: plan or workspace limit failure
- `6`: write confirmation timeout

## 5. Recover From Timeout Or Partial Success

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

## 6. Prefer stdin And File Input For Markdown

For multi-line descriptions or comments, avoid shell-escaped inline text.

```bash
cat description.md | linear issue create -t "My issue" --team ENG
linear issue update ENG-123 --description-file ./description.md
linear issue comment add ENG-123 --body-file ./comment.md
```

The full stdin rules are documented in [stdin-policy.md](./stdin-policy.md).

## 7. Use `linear api` Only As Escape Hatch

If the CLI already has a stable command, prefer the CLI command over raw GraphQL.

Use `linear api` only when:

- a read surface is not covered yet
- you need an experimental or one-off query
- you are intentionally working outside the automation contract
