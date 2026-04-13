# v2 to v3 Migration Cookbook

Use this cookbook when a downstream consumer upgrades from `linear-cli` `2.x` to `3.x`.

The goal is not to explain every design choice. The goal is to give consumer developers copy-pasteable before/after fixes for the most common rollout breakages.

## What Changed

the `v3` line flips the default runtime toward agent-native behavior:

- core startup, read, and representative write surfaces default to machine-readable JSON
- richer `linear capabilities` metadata is now the default startup shape
- implicit prompt fallback is gone unless the caller explicitly opts into human/debug mode
- `agent-safe` is now the default execution profile

If a consumer breaks on upgrade, it is usually because it assumed one of these older defaults:

- bare commands returned human-readable text
- prompts would ask for missing input
- startup discovery used the trimmed capabilities shape
- manual debugging and automation shared the same command form

## Quick Rules

- if a parser expects legacy capabilities startup shape, use `--compat v1`
- if a human wants terminal-oriented output, use `--text`
- if a human wants prompt-driven debugging, use `--profile human-debug --interactive`
- if a command already defaults to JSON, keep `--json` only when you want to be explicit

## Surface Classes

Use `linear capabilities` to classify each command before building on it:

- `stable`: primary startup-contract or automation-contract surface
- `partial`: shared dry-run or machine-readable helper surface without a full stable contract
- `escape_hatch`: raw GraphQL or human/debug-only surface

## Startup Discovery

### Capabilities discovery

Before (`2.x` conservative startup shape):

```bash
linear capabilities --json
```

After (`3.x` richer default discovery shape):

```bash
linear capabilities
```

If the consumer still expects the old trimmed startup shape:

```bash
linear capabilities --compat v1
```

Use this when:

- an existing startup parser expects only `schemaVersion`, `cli`, `contractVersions`, `automationTier`, and `commands`
- you need a short-lived compatibility bridge while migrating to the richer default schema

## Startup And Diagnostics Reads

### Team diagnostics

Before (human-readable output often parsed accidentally):

```bash
linear team list
```

After (machine-readable diagnostics path):

```bash
linear team list --json
```

Human-only debugging path:

```bash
linear team list
```

Use the JSON path for automation, startup checks, and diagnostics scripts. Keep bare `linear team list` only for human inspection.

### Core read commands

Before (`2.x` commonly used explicit JSON):

```bash
linear issue view ENG-123 --json
linear issue list --json
linear project view platform-refresh --json
linear cycle current --team ENG --json
```

After (`3.x` default JSON on core surfaces):

```bash
linear issue view ENG-123
linear issue list
linear project view platform-refresh
linear cycle current --team ENG
```

If a human wants terminal text instead:

```bash
linear issue view ENG-123 --text
linear issue list --text
linear project view platform-refresh --text
linear cycle current --team ENG --text
```

## Reference Resolution

Before (consumers sometimes resolved refs indirectly inside write flows):

```bash
linear issue update ENG-123 --state done --json
```

After (explicit resolution before preview/apply):

```bash
linear resolve issue ENG-123
linear resolve workflow-state done --team ENG
linear issue update ENG-123 --state done
```

Use `resolve` when the consumer needs ambiguity handling, canonical IDs, or current-team fallback before mutating.

## Representative Writes

### Write commands that now default to JSON

Before:

```bash
linear issue create --title "Backfill docs" --team ENG --json
linear issue update ENG-123 --state done --json
```

After:

```bash
linear issue create --title "Backfill docs" --team ENG
linear issue update ENG-123 --state done
```

The runtime surface to inspect is now:

- top-level `operation`
- top-level `receipt` when present
- `error.details` on failure or uncertain outcomes

### Dry-run preview

Before:

```bash
linear issue update ENG-123 --state done --dry-run --json
```

After:

```bash
linear issue update ENG-123 --state done --dry-run --json
```

This command form stays the same. What changes in `3.x` is that the non-dry-run apply path now lines up more closely with preview through the shared `operation` family.

## Human Prompt Flows

### Creating or editing via prompts

Before (implicit prompt fallback):

```bash
linear issue create
linear auth login
```

After (explicit human/debug mode):

```bash
linear --profile human-debug --interactive issue create
linear --profile human-debug --interactive auth login
```

Automation should not rely on these forms. They are for maintainers and debugging only.

## Suggested Upgrade Sequence

1. replace startup discovery with `linear capabilities` and add `--compat v1` only where needed
2. move diagnostics and health checks to explicit machine-readable commands such as `linear team list --json`
3. stop parsing text from core read surfaces; use default JSON or add `--text` for humans
4. keep `--dry-run --json` for preview loops
5. use `linear resolve ...` before preview/apply when refs may be ambiguous
6. move prompt-driven manual workflows to `--profile human-debug --interactive`

## Common Symptoms And Fixes

### Symptom: startup parser broke after upgrading

Fix:

```bash
linear capabilities --compat v1
```

Then migrate the parser to the richer default shape and remove the compatibility flag when ready.

### Symptom: a diagnostics script now gets JSON where it expected text

Fix:

- if the script is automation, switch to the machine-readable path intentionally
- if the script is for a human maintainer, add `--text`

Example:

```bash
linear team list --json
linear issue view ENG-123 --text
```

### Symptom: a manual workflow no longer prompts

Fix:

```bash
linear --profile human-debug --interactive issue create
```

## Related Docs

- [Agent-Native Runtime Runbook](./agent-first.md)
- [Agent-Only v3 Release Guide](./agent-only-v3.md)
- [JSON Contracts](./json-contracts.md)
