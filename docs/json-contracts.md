# Automation Contract

`linear-cli` exposes many machine-readable modes, but only a subset is treated as a stable automation contract.

If you are integrating this CLI into an agent runtime, read [agent-first.md](./agent-first.md) first, then use this document for the exact JSON and compatibility rules. The machine-readable contract is the primary product surface; `--text` and `--profile human-debug --interactive` are secondary human/debug escape hatches.

For `v3.0.1`, this document describes the default runtime contract rather than an optional side channel. A caller should assume:

- startup discovery defaults to the richer capabilities schema
- startup-critical reads default to machine-readable output
- representative preview/apply flows share `operation`
- high-value apply results may expose `receipt`
- legacy compatibility surfaces such as `--compat v1` are explicit opt-ins

This document defines the stable JSON contracts for org-wide automation. Each contract version applies to:

- success payload top-level shapes
- failure payload shape for `--json`
- common value conventions
- backward-compatibility rules

It does not apply to:

- non-JSON terminal output
- `linear api`
- commands outside the automation tier listed below
- stderr output when `LINEAR_DEBUG=1`

## Capabilities Discovery

`linear capabilities` is a stable self-description surface for agents. It is versioned independently from the automation tier so callers can discover command traits without scraping `--help`, README content, or generated docs.

The example payloads below are validated in CI against the current CLI version and compatibility semantics.

Compatibility rules:

- `linear capabilities` defaults to the richer `v2` schema-like discovery shape in v3
- `linear capabilities --compat v1` preserves the trimmed legacy startup shape for older consumers
- execution profile metadata is part of the default `v2` output
- top-level `v2` fields stay backward compatible across minor releases
- `v1` remains available only through explicit `--compat v1`
- machine-readable schema changes should be called out explicitly in release notes
- the top-level JSON shape of the agent-first read entrypoints in [agent-first.md](./agent-first.md) is also guarded in CI as a startup contract

In other words, `v3.0.1` treats the default capabilities surface as the startup contract and `--compat v1` as the legacy escape hatch.

Default top-level shape from `linear capabilities`:

```json
{
  "schemaVersion": "v2",
  "cli": {
    "name": "linear-cli",
    "binary": "linear",
    "version": "3.0.1"
  },
  "compatibility": {
    "defaultSchemaVersion": "v2",
    "latestSchemaVersion": "v2",
    "supportedSchemaVersions": ["v1", "v2"]
  },
  "contractVersions": {
    "automation": {
      "latest": "v7",
      "supported": ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]
    },
    "dryRunPreview": {
      "latest": "v1",
      "supported": ["v1"]
    },
    "stdinPolicy": {
      "latest": "v1",
      "supported": ["v1"]
    }
  },
  "automationTier": {
    "latestVersion": "v7",
    "byVersion": {
      "v1": ["linear issue list"],
      "v2": ["linear project list"],
      "v3": ["linear document list"],
      "v4": ["linear team list"],
      "v5": ["linear initiative list"],
      "v6": ["linear resolve issue"],
      "v7": ["linear issue assign"]
    },
    "allCommands": [
      "linear issue list",
      "linear project list",
      "linear document list",
      "linear team list",
      "linear initiative list",
      "linear resolve issue",
      "linear issue assign"
    ]
  },
  "executionProfiles": {
    "defaultProfile": "agent-safe",
    "availableProfiles": [
      {
        "name": "agent-safe",
        "description": "Default profile for agent and automation runs that prefer predictable non-interactive defaults."
      }
    ]
  },
  "commands": [
    {
      "path": "linear issue update",
      "summary": "Update an issue",
      "json": {
        "supported": true,
        "contractVersion": "v1"
      },
      "dryRun": {
        "supported": true,
        "contractVersion": "v1"
      },
      "stdin": {
        "mode": "implicit_text"
      },
      "confirmationBypass": null,
      "idempotency": {
        "category": "conditional",
        "notes": "Field-only updates are retry-safe; adding --comment makes the command non-idempotent."
      },
      "schema": {
        "coverage": "curated_primary_inputs",
        "inputModes": ["flags", "stdin", "file"]
      },
      "output": {
        "success": {
          "category": "automation_contract",
          "topLevelFields": ["success", "data", "receipt", "operation"]
        }
      },
      "writeSemantics": {
        "timeoutAware": true,
        "timeoutReconciliation": true,
        "mayReturnNoOp": false,
        "mayReturnPartialSuccess": true
      },
      "notes": null
    }
  ]
}
```

`linear capabilities --compat v1` preserves the trimmed legacy startup shape for older consumers:

```json
{
  "schemaVersion": "v1",
  "cli": {
    "name": "linear-cli",
    "binary": "linear",
    "version": "3.0.1"
  },
  "commands": [
    {
      "path": "linear issue update",
      "summary": "Update an issue",
      "json": {
        "supported": true,
        "contractVersion": "v1"
      },
      "dryRun": {
        "supported": true,
        "contractVersion": "v1"
      },
      "stdin": {
        "mode": "implicit_text"
      },
      "confirmationBypass": null,
      "idempotency": {
        "category": "conditional",
        "notes": "Field-only updates are retry-safe; adding --comment makes the command non-idempotent."
      },
      "notes": null
    }
  ]
}
```

Rules:

- `automationTier.byVersion` lists the commands added by each automation contract version
- `automationTier.allCommands` is the cumulative ordered list of all automation-tier commands
- `json.contractVersion` is `null` when a command supports `--json` but is outside the stable automation tier
- `stdin.mode` is one of `none`, `implicit_text`, or `explicit_bulk`
- `confirmationBypass` is `--yes` when the command supports canonical confirmation skipping, otherwise `null`
- `idempotency.category` is one of `read_only`, `retry_safe_update`, `retry_safe_no_op`, `non_idempotent`, `resumable_batch`, `conditional`, or `destructive`
- `compatibility` describes the default, latest, and supported machine-readable capabilities schema versions
- `executionProfiles` describes runtime profiles and their non-interactive defaults; `defaultProfile` shows which profile is active when callers do not override it
- `schema.coverage` is currently `curated_primary_inputs`, meaning the metadata is intentionally focused on the primary agent-facing execution path and is not a full parser dump of every flag

Release-gated downstream certification currently covers:

- startup discovery with `linear capabilities` and explicit legacy `--compat v1`
- reference resolution with `linear resolve issue/team/workflow-state/user/label --json`
- startup-safe reads with `issue view/list`, `project view`, `cycle current`, `document list`, `webhook view`, and `notification list`
- the `resolve -> preview -> apply` flow for `linear issue update --json`
- the `issue update --comment --json` timeout recovery contract

Automation-tier commands outside those certified flows still follow the compatibility rules above, but they remain best-effort until a downstream certification test is added.

- `schema.arguments` and `schema.flags` are additive, machine-readable hints for the main positional arguments and high-value flags agents should care about first
- representative arguments and flags may now include `repeatable`, `variadic`, `aliases`, `deprecated`, `defaultValue`, and per-parameter `examples` when those details materially affect command composition
- `schema.requiredInputs` and `schema.optionalInputs` summarize the curated primary execution path without forcing callers to re-derive requiredness from each entry
- `schema.defaults` lists curated defaults and fallbacks that matter for agents, such as `--compat = v2`, current-issue resolution, and timeout fallback behavior
- `schema.resolutions` explains when the CLI resolves an input from current issue context, configured team context, environment-backed defaults, or implicit stdin; `sources` calls out the concrete config key, env var, git branch, jj trailer, stdin path, or internal default involved
- `schema.constraints` lists high-value machine-readable relationships such as `requires_all_of`, `requires_any_of`, `conflicts_with`, and `at_most_one_of`
- `schema.inputModes` is a subset of `flags`, `stdin`, and `file`
- `schema.stdinTargets` and `schema.fileTargets` describe which semantic field each non-flag input channel populates
- `schema.examples` provides canonical argv examples that agents can adapt without scraping prose help output
- `allowedValues` is present when a primary argument or flag has a practical constrained set, such as `relationType` or `--compat`
- `output.success.category` is one of `automation_contract`, `curated_json`, `json_default`, or `terminal_only`
- `output.success.contractTarget` names the governing contract when one exists, for example `automation_contract:v4` or `capabilities_discovery:v2`
- `output.success.contract` and `output.preview.contract` expose that governing contract in a structured `kind/version` form
- `output.success.topLevelFields`, `output.preview.topLevelFields`, and `output.failure.topLevelFields` describe the top-level JSON envelope fields for the command's primary machine-readable modes
- `output.failure.jsonWhenRequested` and `output.failure.parseErrorsJsonWhenRequested` tell agents whether they can expect machine-readable failures for the command
- `output.failure.exitCodes` lists the reserved non-zero exit codes that matter for the command
- `output.failure.errorFields` and `output.failure.detailFields` call out the structured error envelope fields and any command-specific `error.details` traits
- `writeSemantics` highlights timeout-aware, no-op-safe, and partial-success traits without forcing callers to parse `idempotency.notes`

## Automation Contract v1

## Write Safety Rails Foundation

Automation Contract v1 does not yet make `--dry-run` part of the stable command surface. However, future write commands that adopt `--dry-run` must use the same preview contract.

Current adopters:

- `linear issue create --dry-run`
- `linear issue update --dry-run`
- `linear issue comment add --dry-run`
- `linear issue relation add --dry-run`
- `linear issue relation delete --dry-run`
- `linear issue create-batch --dry-run`
- `linear project create --dry-run`
- `linear project update --dry-run`
- `linear project delete --dry-run`
- `linear milestone create --dry-run`
- `linear milestone update --dry-run`
- `linear milestone delete --dry-run`
- `linear document create --dry-run`
- `linear document update --dry-run`
- `linear document delete --dry-run`
- `linear webhook create --dry-run`
- `linear webhook update --dry-run`
- `linear webhook delete --dry-run`

Rules:

- successful `--dry-run` exits with code `0`
- `--dry-run` must not execute the underlying mutation
- non-JSON mode prints preview output to stdout and does not require stderr
- `--json --dry-run` prints exactly one JSON document to stdout
- commands without `--json` still use the same preview contract internally, but only expose the human-readable preview for now
- validation, auth, not found, and GraphQL failures during preview still use the normal failure envelope and non-zero exit codes

### `--json --dry-run` Preview Shape

Top-level shape:

```json
{
  "success": true,
  "dryRun": true,
  "summary": "Would update issue ENG-123",
  "operation": {
    "family": "write_operation",
    "version": "v1",
    "phase": "preview",
    "command": "issue.update",
    "resource": "issue",
    "action": "update",
    "summary": "Would update issue ENG-123",
    "refs": {
      "issueIdentifier": "ENG-123"
    },
    "changes": ["state", "comment"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "apply"
  },
  "data": {
    "id": "issue-123",
    "identifier": "ENG-123",
    "title": "Fix auth refresh edge case"
  }
}
```

`data` is command-specific preview payload. When possible, it should reuse the same sub-shapes as the corresponding success payload. Representative issue and non-issue write commands also add a top-level `operation` object so callers can parse preview/apply with the same contract family.

## Automation Tier

The Automation Contract v1 covers these commands only:

- `linear issue list --json`
- `linear issue view --json`
- `linear issue create --json`
- `linear issue update --json`
- `linear issue relation add --json`
- `linear issue relation delete --json`
- `linear issue relation list --json`
- `linear issue comment add --json`
- `linear team members --json`
- `linear issue parent --json`
- `linear issue children --json`
- `linear issue create-batch --json`

Commands outside this list may still support `--json`, but their payloads are not part of v1 compatibility guarantees.

## Value Rules

Unless documented otherwise:

- internal IDs are strings
- `dueDate` is `YYYY-MM-DD`
- timestamps are ISO 8601 UTC strings
- documented optional fields use `null` instead of omission
- collections use `[]` when empty
- field order and whitespace are not part of the contract

## Failure Shape

Every automation-tier command must emit exactly one JSON document to stdout on failure when `--json` is set.

This includes parser and argument validation failures that occur before the command action runs.

```json
{
  "success": false,
  "error": {
    "type": "validation_error",
    "message": "Unknown team: ENGX",
    "suggestion": "Use `linear team list` to inspect available teams.",
    "context": "Failed to fetch team members"
  }
}
```

`error.type` is one of:

- `validation_error`
- `not_found`
- `auth_error`
- `timeout_error`
- `cli_error`
- `graphql_error`
- `unknown_error`

`suggestion` and `context` are nullable and always present in the envelope.

Commands may add an optional `error.details` object for machine-readable recovery metadata. When present, it is command-specific and additive within the current contract version.

## Exit Codes

Automation-tier commands continue to use non-zero exit codes on failure. The current reserved values are:

- `1` for generic failures, validation errors, not-found errors, and other non-auth, non-plan-limit conditions
- `4` for authentication and authorization failures
- `5` for free-plan and workspace-plan limit failures where retry requires an upgrade or archiving existing items
- `6` for client-side write confirmation timeouts that require post-timeout reconciliation

Plan-limit failures keep the normal failure envelope shape. They are distinguished by exit code and by a suggestion that points callers toward upgrading or archiving items before retrying.

Rate-limited failures keep exit code `1`, but may include `error.details.rateLimit` with any available `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` header values. When `Retry-After` is present, the suggestion should point callers toward retry timing.

Write confirmation timeouts use `error.type = "timeout_error"` and should include:

- `error.details.failureMode = "timeout_waiting_for_confirmation"`
- `error.details.timeoutMs`
- `error.details.operation`
- `error.details.outcome`, which may be `"unknown"`, `"definitely_failed"`, `"probably_succeeded"`, or `"partial_success"`
- `error.details.appliedState`, which may be `"unknown"`, `"not_applied"`, `"applied"`, or `"partially_applied"`
- `error.details.callerGuidance`, with:
  - `nextAction = "reconcile_before_retry" | "retry_command" | "treat_as_applied" | "resume_partial_write"`
  - `readBeforeRetry = boolean`
- `error.details.reconciliationAttempted = true` when the CLI successfully checked Linear after the timeout

High-value write commands honor `LINEAR_WRITE_TIMEOUT_MS` and accept `--timeout-ms` for per-command overrides. Today that includes issue create/update/comment/relation/create-batch flows and notification read/archive.

Representative write commands may add a top-level `operation` field to both `--dry-run` previews and successful JSON apply results. High-value write commands that expose machine-readable apply receipts may also add a top-level `receipt` field. Both fields are additive. Current coverage includes issue create/update/comment/relation and batch creation, issue assignment/estimate/move/priority, project create and label add/remove, webhook create/update/delete, and notification read/archive.

## Common Sub-Shapes

### `stateRef`

```json
{
  "name": "In Progress",
  "color": "#f87462"
}
```

### `issueRef`

Used by hierarchy and relation payloads.

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Fix auth refresh edge case",
  "url": "https://linear.app/acme/issue/ENG-123/fix-auth-refresh-edge-case",
  "dueDate": "2026-04-01",
  "state": {
    "name": "In Progress",
    "color": "#f87462"
  }
}
```

### `userRef`

```json
{
  "id": "user-123",
  "name": "alice.bot",
  "displayName": "Alice Bot",
  "initials": "AB"
}
```

Some payloads omit `initials` when the command does not currently expose it.

### `teamRef`

```json
{
  "id": "team-123",
  "key": "ENG",
  "name": "Engineering"
}
```

### `relationRef`

Used by `issue relation list --json`.

```json
{
  "id": "relation-123",
  "type": "blocked-by",
  "issue": {
    "id": "issue-456",
    "identifier": "ENG-456",
    "title": "Unblock rollout",
    "url": "https://linear.app/acme/issue/ENG-456/unblock-rollout",
    "dueDate": null,
    "state": {
      "name": "Todo",
      "color": "#bec2c8"
    }
  }
}
```

### `operationReceipt`

Used by successful high-value write commands that expose machine-readable receipts.

```json
{
  "operationId": "issue.update",
  "resource": "issue",
  "action": "update",
  "resolvedRefs": {
    "issueIdentifier": "ENG-123",
    "teamKey": "ENG",
    "state": "In Progress"
  },
  "appliedChanges": ["state", "comment"],
  "noOp": false,
  "partialSuccess": false,
  "nextSafeAction": "read_before_retry"
}
```

### `writeOperation`

Used by representative write previews and apply results.

```json
{
  "family": "write_operation",
  "version": "v1",
  "phase": "apply",
  "command": "issue.update",
  "resource": "issue",
  "action": "update",
  "summary": "Updated issue ENG-123",
  "refs": {
    "issueIdentifier": "ENG-123"
  },
  "changes": ["state", "comment"],
  "noOp": false,
  "partialSuccess": false,
  "nextSafeAction": "read_before_retry"
}
```

## Success Shapes

Top-level shapes are fixed in v1.

### `issue list --json`

Top-level shape:

```json
[
  {
    "id": "issue-123",
    "identifier": "ENG-123",
    "title": "Fix auth refresh edge case",
    "url": "https://linear.app/acme/issue/ENG-123/fix-auth-refresh-edge-case",
    "dueDate": "2026-04-01",
    "priority": 2,
    "priorityLabel": "High",
    "estimate": 3,
    "updatedAt": "2026-03-18T00:00:00.000Z",
    "assignee": null,
    "stateName": "In Progress",
    "state": { "id": "state-1", "name": "In Progress", "color": "#f87462" },
    "team": { "id": "team-1", "key": "ENG", "name": "Engineering" },
    "project": null,
    "cycle": {
      "id": "cycle-1",
      "name": "Cycle 42",
      "number": 42,
      "startsAt": "2026-03-16T00:00:00.000Z",
      "endsAt": "2026-03-29T23:59:59.000Z"
    },
    "parent": null,
    "labels": { "nodes": [] }
  }
]
```

### `issue view --json`

Top-level shape:

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Fix auth refresh edge case",
  "description": null,
  "url": "https://linear.app/acme/issue/ENG-123/fix-auth-refresh-edge-case",
  "branchName": "eng-123-fix-auth-refresh-edge-case",
  "dueDate": "2026-04-01",
  "priority": 2,
  "priorityLabel": "High",
  "state": { "name": "In Progress", "color": "#f87462" },
  "assignee": null,
  "project": null,
  "projectMilestone": null,
  "cycle": null,
  "parent": null,
  "children": [],
  "relations": {
    "blocks": [],
    "blockedBy": [],
    "related": [],
    "duplicateOf": null,
    "duplicatedBy": []
  },
  "comments": {
    "included": true,
    "hasMore": false,
    "nodes": []
  },
  "commentsSummary": {
    "fetchedCount": 0,
    "hasMore": false,
    "topLevelCount": 0,
    "replyCount": 0,
    "participantCount": 0,
    "participants": [],
    "latestComment": null
  },
  "attachments": []
}
```

### `issue create --json` and `issue update --json`

Top-level shape:

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Fix auth refresh edge case",
  "url": "https://linear.app/acme/issue/ENG-123/fix-auth-refresh-edge-case",
  "dueDate": "2026-04-01",
  "assignee": null,
  "parent": null,
  "state": null,
  "receipt": { "...": "operationReceipt" },
  "operation": { "...": "writeOperation" }
}
```

When `issue update --json` is called with `--comment`, the same top-level object is returned with an additional `comment` field shaped like `issue comment add --json`.

If the issue update succeeds but the follow-up comment fails or times out, the command exits non-zero with the normal failure envelope and adds:

- `error.details.failureStage = "comment_create"`
- `error.details.retryable = true`
- `error.details.retryCommand` with a standalone `issue comment add` retry command
- `error.details.partialSuccess.issueUpdated = true`
- `error.details.partialSuccess.commentAttempted = true`
- `error.details.partialSuccess.issue` with the same shape as the successful `issue update --json` payload

### Common Partial Success Shape

When a write command completes a durable side effect and then fails in a later stage, `error.details` should use this shared shape:

```json
{
  "failureStage": "comment_create",
  "retryable": true,
  "retryCommand": "linear issue comment add ENG-123 --body \"Ready for review\"",
  "partialSuccess": {
    "issueUpdated": true,
    "commentAttempted": true
  }
}
```

Rules:

- `failureStage` is always present and identifies the stage that did not complete
- `retryable` is always present and tells callers whether a follow-up retry flow exists
- `retryCommand` is optional and may be omitted when there is no safe standalone retry
- `partialSuccess` is always present and contains command-specific facts about the side effects that already happened

### `issue relation add --json` and `issue relation delete --json`

Top-level shape:

```json
{
  "success": true,
  "noOp": false,
  "direction": "incoming",
  "relationType": "blocked-by",
  "issue": {
    "id": "issue-123",
    "identifier": "ENG-123"
  },
  "relatedIssue": {
    "id": "issue-456",
    "identifier": "ENG-456"
  },
  "relationId": "relation-789",
  "receipt": { "...": "operationReceipt" },
  "operation": { "...": "writeOperation" }
}
```

`noOp` is always present:

- `false` when the command changed Linear state
- `true` when the command returned success without mutating because the desired relation state already existed

For delete, `relationId` is the deleted relation ID when a relation was removed, or `null` when the relation was already absent.

Idempotency policy:

- `issue relation add` is retry-safe and idempotent by relation pair
- rerunning `issue relation add` for an already-existing relation returns success with `noOp: true`
- `issue relation delete` is retry-safe and idempotent by relation pair
- rerunning `issue relation delete` for an already-absent relation returns success with `noOp: true`

### `issue relation list --json`

Top-level shape:

```json
{
  "issue": {
    "id": "issue-123",
    "identifier": "ENG-123",
    "title": "Fix auth refresh edge case",
    "url": "https://linear.app/acme/issue/ENG-123/fix-auth-refresh-edge-case"
  },
  "outgoing": [],
  "incoming": []
}
```

`outgoing` and `incoming` are arrays of `relationRef`.

### `issue comment add --json`

Top-level shape:

```json
{
  "id": "comment-123",
  "body": "Follow-up",
  "createdAt": "2026-03-18T00:00:00.000Z",
  "url": "https://linear.app/acme/issue/ENG-123#comment-123",
  "parentId": null,
  "issue": {
    "id": "issue-123",
    "identifier": "ENG-123",
    "title": "Fix auth refresh edge case",
    "url": "https://linear.app/acme/issue/ENG-123/fix-auth-refresh-edge-case"
  },
  "user": {
    "name": "alice.bot",
    "displayName": "Alice Bot"
  },
  "receipt": { "...": "operationReceipt" },
  "operation": { "...": "writeOperation" }
}
```

### `team members --json`

Top-level shape:

```json
{
  "team": "ENG",
  "includeInactive": false,
  "members": []
}
```

Each member currently includes:

- `id`
- `name`
- `displayName`
- `email`
- `active`
- `initials`
- `description`
- `timezone`
- `lastSeen`
- `statusEmoji`
- `statusLabel`
- `guest`
- `isAssignable`

### `issue parent --json`

Top-level shape:

```json
{
  "issue": { "...": "issueRef" },
  "parent": null
}
```

`parent` is either `null` or an `issueRef`.

### `issue children --json`

Top-level shape:

```json
{
  "issue": { "...": "issueRef" },
  "children": []
}
```

### `issue create-batch --json`

Top-level shape:

```json
{
  "team": "ENG",
  "project": null,
  "parent": { "...": "issue create/update payload" },
  "children": [],
  "counts": {
    "totalCreated": 3,
    "childCount": 2
  }
}
```

Partial failures use the standard JSON failure envelope with an additional `error.details` object.

```json
{
  "success": false,
  "error": {
    "type": "cli_error",
    "message": "Issue batch creation failed while creating child 2 of 3",
    "suggestion": "Already created issues: ENG-600, ENG-601. Remove already created issues from the batch file before retrying, or rerun only the remaining work.",
    "context": "Failed to create issue batch",
    "details": {
      "command": "issue.create-batch",
      "createdIdentifiers": ["ENG-600", "ENG-601"],
      "createdCount": 2,
      "failedStep": {
        "stage": "child",
        "index": 2,
        "total": 3,
        "title": "Create second child"
      },
      "retryable": false,
      "retryHint": "Do not rerun the same batch file unchanged after a partial failure. Remove already created issues from the input or rerun only the remaining work."
    }
  }
}
```

Idempotency policy:

- `issue create-batch` does not roll back already created issues
- parent-first creation is part of the contract
- partial failures are not safe to blindly retry with the same input
- callers should use `createdIdentifiers` plus `failedStep` to resume manually or to write a higher-level reconciliation flow

## High-Value Write Retry Semantics

These rules are intended for automation and agent callers.

- `issue create` is non-idempotent. Do not blindly rerun after an unknown failure without first checking whether the issue was already created.
- `issue update` is retry-safe for explicit set-style fields such as `state`, `assignee`, `priority`, `estimate`, `dueDate`, `project`, `milestone`, and `cycle`.
- `issue update --comment` is not idempotent because the comment side effect may be duplicated on retry.
- `issue comment add` is non-idempotent. Callers should not blindly retry without checking whether the comment was already posted.
- `issue relation add` and `issue relation delete` are idempotent and return success with `noOp: true` when the requested relation state is already satisfied.
- `project label add` and `project label remove` are retry-safe no-op writes. They return success with `changed: false` when the requested label state is already satisfied.
- `notification read` and `notification archive` are retry-safe no-op writes. They return success with `noOp: true` when the notification is already in the requested state.
- `issue create-batch` is non-idempotent as a whole. Use `error.details.createdIdentifiers` and `failedStep` to resume manually instead of rerunning the same batch unchanged.
- write confirmation timeouts do not prove that a mutation failed. Callers should use `error.details.appliedState` and `error.details.callerGuidance.nextAction` when present, and only fall back to treating `timeout_error` as unknown-outcome when reconciliation could not reach a stronger conclusion.
- `callerGuidance.nextAction = "reconcile_before_retry"` means the CLI could not prove the final state. Read the target object before retrying.
- `callerGuidance.nextAction = "retry_command"` means reconciliation found no applied side effect and retrying the same command is the expected path.
- `callerGuidance.nextAction = "treat_as_applied"` means Linear already shows the requested state. Callers should usually treat the write as successful instead of retrying.
- `callerGuidance.nextAction = "resume_partial_write"` means some side effects were observed. Use `partialSuccess` and any command-specific retry hints to resume from the remaining step instead of replaying the whole write.

## Automation Contract v2

Automation Contract v2 extends the stable read surface to project, cycle, and milestone commands while preserving the v1 guarantees for existing issue and team commands.

The v2 additions are:

- `linear project list --json`
- `linear project view --json`
- `linear cycle list --json`
- `linear cycle view --json`
- `linear cycle current --json`
- `linear cycle next --json`
- `linear milestone list --json`
- `linear milestone view --json`

V2 reuses the same failure envelope, value rules, and compatibility rules defined above.

### `projectStatusRef`

```json
{
  "id": "project-status-1",
  "name": "In Progress",
  "color": "#f59e0b",
  "type": "started"
}
```

### `project list --json`

Top-level shape:

```json
[
  {
    "id": "project-123",
    "slugId": "platform-refresh",
    "name": "Platform Refresh",
    "description": "Coordinate infrastructure migration",
    "status": {
      "id": "project-status-1",
      "name": "In Progress",
      "type": "started"
    },
    "lead": {
      "name": "alice.bot",
      "displayName": "Alice Bot",
      "initials": "AB"
    },
    "teams": ["ENG", "OPS"],
    "priority": 2,
    "health": "onTrack",
    "startDate": "2026-03-01",
    "targetDate": "2026-04-15",
    "url": "https://linear.app/acme/project/platform-refresh",
    "createdAt": "2026-02-25T00:00:00.000Z",
    "updatedAt": "2026-03-18T00:00:00.000Z"
  }
]
```

### `project view --json`

Top-level shape:

```json
{
  "id": "project-123",
  "slugId": "platform-refresh",
  "name": "Platform Refresh",
  "description": "Coordinate infrastructure migration",
  "icon": null,
  "color": "#3b82f6",
  "url": "https://linear.app/acme/project/platform-refresh",
  "status": {
    "id": "project-status-1",
    "name": "In Progress",
    "color": "#f59e0b",
    "type": "started"
  },
  "creator": {
    "name": "alice.bot",
    "displayName": "Alice Bot"
  },
  "lead": {
    "name": "bob.dev",
    "displayName": "Bob Dev"
  },
  "priority": 2,
  "health": "onTrack",
  "startDate": "2026-03-01",
  "targetDate": "2026-04-15",
  "startedAt": "2026-03-02T00:00:00.000Z",
  "completedAt": null,
  "canceledAt": null,
  "createdAt": "2026-02-25T00:00:00.000Z",
  "updatedAt": "2026-03-18T00:00:00.000Z",
  "teams": [
    { "id": "team-1", "key": "ENG", "name": "Engineering" }
  ],
  "issueSummary": {
    "total": 3,
    "completed": 1,
    "started": 1,
    "unstarted": 1,
    "backlog": 0,
    "triage": 0,
    "canceled": 0
  },
  "lastUpdate": {
    "id": "update-1",
    "body": "OAuth implementation is nearly complete.",
    "health": "onTrack",
    "createdAt": "2026-03-17T09:00:00.000Z",
    "user": {
      "name": "bob.dev",
      "displayName": "Bob Dev"
    }
  }
}
```

### `cycleRef`

```json
{
  "id": "cycle-123",
  "number": 42,
  "name": "Sprint 42",
  "startsAt": "2026-03-16T00:00:00.000Z",
  "endsAt": "2026-03-29T23:59:59.000Z",
  "completedAt": null,
  "status": "active",
  "isActive": true,
  "isFuture": false,
  "isPast": false
}
```

### `cycleIssueRef`

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Close rollout blockers",
  "state": {
    "name": "In Progress",
    "type": "started",
    "color": "#f59e0b"
  }
}
```

### `cycleIssueSummary`

```json
{
  "total": 3,
  "completed": 1,
  "started": 1,
  "unstarted": 1,
  "backlog": 0,
  "triage": 0,
  "canceled": 0
}
```

### `cycle list --json`

Top-level shape:

```json
[
  {
    "id": "cycle-123",
    "number": 42,
    "name": "Sprint 42",
    "startsAt": "2026-03-16T00:00:00.000Z",
    "endsAt": "2026-03-29T23:59:59.000Z",
    "completedAt": null,
    "status": "active",
    "isActive": true,
    "isFuture": false,
    "isPast": false
  }
]
```

### `cycle view --json`

Top-level shape:

```json
{
  "id": "cycle-123",
  "number": 42,
  "name": "Sprint 42",
  "description": "Coordinate rollout readiness",
  "startsAt": "2026-03-16T00:00:00.000Z",
  "endsAt": "2026-03-29T23:59:59.000Z",
  "completedAt": null,
  "status": "active",
  "isActive": true,
  "isFuture": false,
  "isPast": false,
  "progress": 0.33,
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-18T00:00:00.000Z",
  "team": {
    "id": "team-1",
    "key": "ENG",
    "name": "Engineering"
  },
  "issueSummary": {
    "total": 3,
    "completed": 1,
    "started": 1,
    "unstarted": 1,
    "backlog": 0,
    "triage": 0,
    "canceled": 0
  },
  "issues": [
    {
      "id": "issue-1",
      "identifier": "ENG-123",
      "title": "Close rollout blockers",
      "state": {
        "name": "In Progress",
        "type": "started",
        "color": "#f59e0b"
      }
    }
  ]
}
```

### `cycle current --json`

Top-level shape:

- the same object shape as `cycle view --json`
- `null` when no active cycle exists

### `cycle next --json`

Top-level shape:

- the same object shape as `cycle view --json`
- `null` when no upcoming cycle exists

### `milestoneRef`

```json
{
  "id": "milestone-123",
  "name": "Phase 1",
  "description": "Coordinate rollout readiness",
  "targetDate": "2026-04-15",
  "sortOrder": 1,
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-18T00:00:00.000Z",
  "project": {
    "id": "project-123",
    "name": "Platform Refresh",
    "slugId": "platform-refresh",
    "url": "https://linear.app/acme/project/platform-refresh"
  }
}
```

### `milestoneIssueRef`

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Close rollout blockers",
  "state": {
    "name": "In Progress",
    "type": "started",
    "color": "#f59e0b"
  }
}
```

### `milestoneIssueSummary`

```json
{
  "total": 3,
  "completed": 1,
  "started": 1,
  "unstarted": 1,
  "backlog": 0,
  "triage": 0,
  "canceled": 0
}
```

### `milestone list --json`

Top-level shape:

```json
[
  {
    "id": "milestone-123",
    "name": "Phase 1",
    "description": "Coordinate rollout readiness",
    "targetDate": "2026-04-15",
    "sortOrder": 1,
    "createdAt": "2026-03-01T00:00:00.000Z",
    "updatedAt": "2026-03-18T00:00:00.000Z",
    "project": {
      "id": "project-123",
      "name": "Platform Refresh",
      "slugId": "platform-refresh",
      "url": "https://linear.app/acme/project/platform-refresh"
    }
  }
]
```

### `milestone view --json`

Top-level shape:

```json
{
  "id": "milestone-123",
  "name": "Phase 1",
  "description": "Coordinate rollout readiness",
  "targetDate": "2026-04-15",
  "sortOrder": 1,
  "createdAt": "2026-03-01T00:00:00.000Z",
  "updatedAt": "2026-03-18T00:00:00.000Z",
  "project": {
    "id": "project-123",
    "name": "Platform Refresh",
    "slugId": "platform-refresh",
    "url": "https://linear.app/acme/project/platform-refresh"
  },
  "issueSummary": {
    "total": 3,
    "completed": 1,
    "started": 1,
    "unstarted": 1,
    "backlog": 0,
    "triage": 0,
    "canceled": 0
  },
  "issues": [
    {
      "id": "issue-1",
      "identifier": "ENG-123",
      "title": "Close rollout blockers",
      "state": {
        "name": "In Progress",
        "type": "started",
        "color": "#f59e0b"
      }
    }
  ]
}
```

## Automation Contract v3

Automation Contract v3 extends the stable read surface to document, webhook, and notification commands while preserving the v1/v2 guarantees for existing automation-tier commands.

The v3 additions are:

- `linear document list --json`
- `linear document view --json`
- `linear webhook list --json`
- `linear webhook view --json`
- `linear notification list --json`
- `linear notification count --json`

V3 reuses the same failure envelope, value rules, and compatibility rules defined above.

### `documentCreatorRef`

```json
{
  "name": "alice.bot",
  "displayName": "Alice Bot",
  "email": "alice@example.com"
}
```

### `documentProjectRef`

```json
{
  "id": "project-123",
  "name": "Platform Refresh",
  "slugId": "platform-refresh",
  "url": "https://linear.app/acme/project/platform-refresh"
}
```

### `documentIssueRef`

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Close rollout blockers",
  "url": "https://linear.app/acme/issue/ENG-123/close-rollout-blockers"
}
```

### `documentRef`

```json
{
  "id": "doc-123",
  "title": "Runbook",
  "slugId": "d4b93e3b2695",
  "url": "https://linear.app/acme/document/runbook-d4b93e3b2695",
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "creator": {
    "name": "alice.bot",
    "displayName": "Alice Bot",
    "email": "alice@example.com"
  },
  "project": {
    "id": "project-123",
    "name": "Platform Refresh",
    "slugId": "platform-refresh",
    "url": "https://linear.app/acme/project/platform-refresh"
  },
  "issue": null
}
```

### `document list --json`

Top-level shape:

```json
[
  {
    "id": "doc-123",
    "title": "Runbook",
    "slugId": "d4b93e3b2695",
    "url": "https://linear.app/acme/document/runbook-d4b93e3b2695",
    "createdAt": "2026-03-28T00:00:00.000Z",
    "updatedAt": "2026-03-29T00:00:00.000Z",
    "creator": {
      "name": "alice.bot",
      "displayName": "Alice Bot",
      "email": "alice@example.com"
    },
    "project": {
      "id": "project-123",
      "name": "Platform Refresh",
      "slugId": "platform-refresh",
      "url": "https://linear.app/acme/project/platform-refresh"
    },
    "issue": null
  }
]
```

### `document view --json`

Top-level shape:

```json
{
  "id": "doc-123",
  "title": "Runbook",
  "slugId": "d4b93e3b2695",
  "url": "https://linear.app/acme/document/runbook-d4b93e3b2695",
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "creator": {
    "name": "alice.bot",
    "displayName": "Alice Bot",
    "email": "alice@example.com"
  },
  "project": {
    "id": "project-123",
    "name": "Platform Refresh",
    "slugId": "platform-refresh",
    "url": "https://linear.app/acme/project/platform-refresh"
  },
  "issue": null,
  "content": "# Runbook\\n\\nSteps to roll out safely."
}
```

### `webhookTeamRef`

```json
{
  "id": "team-123",
  "key": "ENG",
  "name": "Engineering"
}
```

### `webhookCreatorRef`

```json
{
  "id": "user-123",
  "name": "alice.bot",
  "displayName": "Alice Bot"
}
```

### `webhookRef`

```json
{
  "id": "webhook-123",
  "label": "Issue events",
  "displayLabel": "Issue events",
  "url": "https://example.com/linear/webhooks",
  "status": "enabled",
  "scope": "Engineering (ENG)",
  "enabled": true,
  "archivedAt": null,
  "allPublicTeams": false,
  "resourceTypes": [
    "Issue",
    "Comment"
  ],
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "team": {
    "id": "team-123",
    "key": "ENG",
    "name": "Engineering"
  },
  "creator": {
    "id": "user-123",
    "name": "alice.bot",
    "displayName": "Alice Bot"
  }
}
```

### `webhook list --json`

Top-level shape:

```json
[
  {
    "id": "webhook-123",
    "label": "Issue events",
    "displayLabel": "Issue events",
    "url": "https://example.com/linear/webhooks",
    "status": "enabled",
    "scope": "Engineering (ENG)",
    "enabled": true,
    "archivedAt": null,
    "allPublicTeams": false,
    "resourceTypes": [
      "Issue",
      "Comment"
    ],
    "createdAt": "2026-03-28T00:00:00.000Z",
    "updatedAt": "2026-03-29T00:00:00.000Z",
    "team": {
      "id": "team-123",
      "key": "ENG",
      "name": "Engineering"
    },
    "creator": {
      "id": "user-123",
      "name": "alice.bot",
      "displayName": "Alice Bot"
    }
  }
]
```

### `webhook view --json`

Top-level shape:

```json
{
  "id": "webhook-123",
  "label": "Issue events",
  "displayLabel": "Issue events",
  "url": "https://example.com/linear/webhooks",
  "status": "enabled",
  "scope": "Engineering (ENG)",
  "enabled": true,
  "archivedAt": null,
  "allPublicTeams": false,
  "resourceTypes": [
    "Issue",
    "Comment"
  ],
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "team": {
    "id": "team-123",
    "key": "ENG",
    "name": "Engineering"
  },
  "creator": {
    "id": "user-123",
    "name": "alice.bot",
    "displayName": "Alice Bot"
  }
}
```

### `notificationActorRef`

```json
{
  "name": "alice.bot",
  "displayName": "Alice Bot"
}
```

### `notificationRef`

```json
{
  "id": "notif-123",
  "type": "issueAssigned",
  "title": "ENG-123 was assigned to you",
  "subtitle": "Close rollout blockers",
  "status": "unread",
  "actor": {
    "name": "alice.bot",
    "displayName": "Alice Bot"
  },
  "createdAt": "2026-03-28T00:00:00.000Z",
  "readAt": null,
  "archivedAt": null,
  "snoozedUntilAt": null,
  "url": "https://linear.app/acme/issue/ENG-123/close-rollout-blockers",
  "inboxUrl": "https://linear.app/acme/inbox/notif-123"
}
```

### `notification list --json`

Top-level shape:

```json
[
  {
    "id": "notif-123",
    "type": "issueAssigned",
    "title": "ENG-123 was assigned to you",
    "subtitle": "Close rollout blockers",
    "status": "unread",
    "actor": {
      "name": "alice.bot",
      "displayName": "Alice Bot"
    },
    "createdAt": "2026-03-28T00:00:00.000Z",
    "readAt": null,
    "archivedAt": null,
    "snoozedUntilAt": null,
    "url": "https://linear.app/acme/issue/ENG-123/close-rollout-blockers",
    "inboxUrl": "https://linear.app/acme/inbox/notif-123"
  }
]
```

### `notification count --json`

Top-level shape:

```json
{
  "unread": 7
}
```

## Automation Contract v4

Automation Contract v4 extends the stable read surface to team, user, workflow-state, issue label, and project label commands while preserving the v1/v2/v3 guarantees for existing automation-tier commands.

The v4 additions are:

- `linear team list --json`
- `linear team view --json`
- `linear user list --json`
- `linear user view --json`
- `linear workflow-state list --json`
- `linear workflow-state view --json`
- `linear label list --json`
- `linear project-label list --json`

V4 reuses the same failure envelope, value rules, and compatibility rules defined above.

### `teamOrganizationRef`

```json
{
  "id": "org-123",
  "name": "Acme"
}
```

### `teamRefDetailed`

```json
{
  "id": "team-123",
  "name": "Engineering",
  "key": "ENG",
  "description": "Builds the product",
  "icon": "🛠️",
  "color": "#3b82f6",
  "cyclesEnabled": true,
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "archivedAt": null,
  "organization": {
    "id": "org-123",
    "name": "Acme"
  }
}
```

### `team list --json`

Top-level shape:

```json
[
  {
    "id": "team-123",
    "name": "Engineering",
    "key": "ENG",
    "description": "Builds the product",
    "icon": "🛠️",
    "color": "#3b82f6",
    "cyclesEnabled": true,
    "createdAt": "2026-03-28T00:00:00.000Z",
    "updatedAt": "2026-03-29T00:00:00.000Z",
    "archivedAt": null,
    "organization": {
      "id": "org-123",
      "name": "Acme"
    }
  }
]
```

### `team view --json`

Top-level shape:

```json
{
  "id": "team-123",
  "name": "Engineering",
  "key": "ENG",
  "description": "Builds the product",
  "icon": "🛠️",
  "color": "#3b82f6",
  "cyclesEnabled": true,
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "archivedAt": null,
  "organization": {
    "id": "org-123",
    "name": "Acme"
  }
}
```

### `workspaceUserRef`

```json
{
  "id": "user-123",
  "name": "alice.bot",
  "displayName": "Alice Bot",
  "email": "alice@example.com",
  "active": true,
  "guest": false,
  "app": false,
  "isAssignable": true,
  "isMentionable": true,
  "description": "Staff Engineer",
  "statusEmoji": ":rocket:",
  "statusLabel": "Shipping",
  "timezone": "Asia/Tokyo"
}
```

### `user list --json`

Top-level shape:

```json
[
  {
    "id": "user-123",
    "name": "alice.bot",
    "displayName": "Alice Bot",
    "email": "alice@example.com",
    "active": true,
    "guest": false,
    "app": false,
    "isAssignable": true,
    "isMentionable": true,
    "description": "Staff Engineer",
    "statusEmoji": ":rocket:",
    "statusLabel": "Shipping",
    "timezone": "Asia/Tokyo"
  }
]
```

### `user view --json`

Top-level shape:

```json
{
  "id": "user-123",
  "name": "alice.bot",
  "displayName": "Alice Bot",
  "email": "alice@example.com",
  "active": true,
  "guest": false,
  "app": false,
  "isAssignable": true,
  "isMentionable": true,
  "description": "Staff Engineer",
  "statusEmoji": ":rocket:",
  "statusLabel": "Shipping",
  "timezone": "Asia/Tokyo",
  "lastSeen": "2026-03-29T00:00:00.000Z",
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "archivedAt": null,
  "url": "https://linear.app/acme/user/alice-bot",
  "organization": {
    "name": "Acme",
    "urlKey": "acme"
  }
}
```

### `workflowStateInheritedRef`

```json
{
  "id": "state-999",
  "name": "In Progress",
  "type": "started"
}
```

### `workflowStateRef`

```json
{
  "id": "state-123",
  "name": "Backlog",
  "type": "backlog",
  "position": 0,
  "color": "#888888",
  "description": null,
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "archivedAt": null,
  "team": {
    "id": "team-123",
    "key": "ENG",
    "name": "Engineering"
  },
  "inheritedFrom": null
}
```

### `workflow-state list --json`

Top-level shape:

```json
[
  {
    "id": "state-123",
    "name": "Backlog",
    "type": "backlog",
    "position": 0,
    "color": "#888888",
    "description": null,
    "createdAt": "2026-03-28T00:00:00.000Z",
    "updatedAt": "2026-03-29T00:00:00.000Z",
    "archivedAt": null,
    "team": {
      "id": "team-123",
      "key": "ENG",
      "name": "Engineering"
    },
    "inheritedFrom": null
  }
]
```

### `workflow-state view --json`

Top-level shape:

```json
{
  "id": "state-123",
  "name": "Backlog",
  "type": "backlog",
  "position": 0,
  "color": "#888888",
  "description": null,
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "archivedAt": null,
  "team": {
    "id": "team-123",
    "key": "ENG",
    "name": "Engineering"
  },
  "inheritedFrom": null
}
```

### `issueLabelRef`

```json
{
  "id": "label-123",
  "name": "backend",
  "description": "Backend work",
  "color": "#5E6AD2",
  "team": {
    "id": "team-123",
    "key": "ENG",
    "name": "Engineering"
  }
}
```

### `label list --json`

Top-level shape:

```json
[
  {
    "id": "label-123",
    "name": "backend",
    "description": "Backend work",
    "color": "#5E6AD2",
    "team": {
      "id": "team-123",
      "key": "ENG",
      "name": "Engineering"
    }
  }
]
```

### `projectLabelRef`

```json
{
  "id": "plabel-123",
  "name": "Customer-facing",
  "description": "Visible in roadmap and updates",
  "color": "#5E6AD2",
  "isGroup": false,
  "createdAt": "2026-03-28T00:00:00.000Z",
  "updatedAt": "2026-03-29T00:00:00.000Z",
  "archivedAt": null,
  "retiredAt": null,
  "parent": {
    "id": "plabel-root",
    "name": "Product"
  }
}
```

### `project-label list --json`

Top-level shape:

```json
[
  {
    "id": "plabel-123",
    "name": "Customer-facing",
    "description": "Visible in roadmap and updates",
    "color": "#5E6AD2",
    "isGroup": false,
    "createdAt": "2026-03-28T00:00:00.000Z",
    "updatedAt": "2026-03-29T00:00:00.000Z",
    "archivedAt": null,
    "retiredAt": null,
    "parent": {
      "id": "plabel-root",
      "name": "Product"
    }
  }
]
```

## Automation Contract v5

Automation Contract v5 extends the stable read surface to initiative and update-feed commands while preserving the v1/v2/v3/v4 guarantees for existing automation-tier commands.

The v5 additions are:

- `linear initiative list --json`
- `linear initiative view --json`
- `linear project-update list --json`
- `linear initiative-update list --json`

V5 reuses the same failure envelope, value rules, and compatibility rules defined above.

### `initiativeOwnerRef`

```json
{
  "id": "user-123",
  "name": "alice.bot",
  "displayName": "Alice Bot",
  "initials": "AB"
}
```

### `initiativeRef`

```json
{
  "id": "initiative-123",
  "slugId": "agent-cli",
  "name": "Agent CLI",
  "description": "Make linear-cli self-describing for agents",
  "status": "active",
  "targetDate": "2026-04-15",
  "health": "onTrack",
  "color": "#3b82f6",
  "icon": "🤖",
  "url": "https://linear.app/acme/initiative/agent-cli",
  "archivedAt": null,
  "owner": {
    "id": "user-123",
    "name": "alice.bot",
    "displayName": "Alice Bot",
    "initials": "AB"
  },
  "projectCount": 2
}
```

### `initiative list --json`

Top-level shape:

```json
[
  {
    "id": "initiative-123",
    "slugId": "agent-cli",
    "name": "Agent CLI",
    "description": "Make linear-cli self-describing for agents",
    "status": "active",
    "targetDate": "2026-04-15",
    "health": "onTrack",
    "color": "#3b82f6",
    "icon": "🤖",
    "url": "https://linear.app/acme/initiative/agent-cli",
    "archivedAt": null,
    "owner": {
      "id": "user-123",
      "name": "alice.bot",
      "displayName": "Alice Bot",
      "initials": "AB"
    },
    "projectCount": 2
  }
]
```

### `initiative view --json`

Top-level shape:

```json
{
  "id": "initiative-123",
  "slugId": "agent-cli",
  "name": "Agent CLI",
  "description": "Make linear-cli self-describing for agents",
  "status": "active",
  "targetDate": "2026-04-15",
  "health": "onTrack",
  "color": "#3b82f6",
  "icon": "🤖",
  "url": "https://linear.app/acme/initiative/agent-cli",
  "archivedAt": null,
  "owner": {
    "id": "user-123",
    "name": "alice.bot",
    "displayName": "Alice Bot",
    "initials": "AB"
  },
  "projectCount": 2,
  "createdAt": "2026-03-30T00:00:00.000Z",
  "updatedAt": "2026-03-30T12:00:00.000Z",
  "projects": [
    {
      "id": "project-123",
      "slugId": "automation-contract-v5",
      "name": "Automation Contract v5",
      "status": {
        "name": "In Progress",
        "type": "started"
      }
    }
  ]
}
```

### `projectUpdateRef`

```json
{
  "id": "update-123",
  "body": "Schema metadata landed.",
  "health": "onTrack",
  "url": "https://linear.app/acme/update/update-123",
  "createdAt": "2026-03-30T09:00:00.000Z",
  "author": {
    "name": "alice.bot",
    "displayName": "Alice Bot"
  }
}
```

### `project-update list --json`

Top-level shape:

```json
{
  "project": {
    "id": "project-123",
    "name": "Automation Contract v5",
    "slugId": "automation-contract-v5"
  },
  "updates": [
    {
      "id": "update-123",
      "body": "Schema metadata landed.",
      "health": "onTrack",
      "url": "https://linear.app/acme/update/update-123",
      "createdAt": "2026-03-30T09:00:00.000Z",
      "author": {
        "name": "alice.bot",
        "displayName": "Alice Bot"
      }
    }
  ]
}
```

### `initiative-update list --json`

Top-level shape:

```json
{
  "initiative": {
    "id": "initiative-123",
    "name": "Agent CLI",
    "slugId": "agent-cli"
  },
  "updates": [
    {
      "id": "update-123",
      "body": "Schema metadata landed.",
      "health": "onTrack",
      "url": "https://linear.app/acme/update/update-123",
      "createdAt": "2026-03-30T09:00:00.000Z",
      "author": "alice.bot"
    }
  ]
}
```

## Automation Contract v6

Automation Contract v6 adds a read-only reference-resolution surface for agent loops that want to resolve refs before previewing or applying writes.

The v6 additions are:

- `linear resolve issue --json`
- `linear resolve team --json`
- `linear resolve workflow-state --json`
- `linear resolve user --json`
- `linear resolve label --json`

V6 reuses the same failure envelope and compatibility rules defined above. Successful resolution returns data, not a `success/data` wrapper.

### `referenceResolution`

Top-level shape:

```json
{
  "kind": "reference_resolution",
  "version": "v1",
  "refType": "workflow_state",
  "input": "started",
  "source": "argument",
  "status": "resolved",
  "matchedBy": "state_type",
  "ambiguous": false,
  "resolved": {
    "id": "state-123",
    "name": "In Progress",
    "type": "started",
    "color": "#f97316",
    "team": {
      "id": "team-123",
      "key": "ENG",
      "name": "Engineering"
    }
  },
  "candidates": [
    {
      "id": "state-123",
      "name": "In Progress",
      "type": "started",
      "color": "#f97316",
      "team": {
        "id": "team-123",
        "key": "ENG",
        "name": "Engineering"
      }
    }
  ],
  "unresolvedReason": null
}
```

## Automation Contract v7

Automation Contract v7 extends the stable automation tier to the remaining high-value JSON write surfaces that already participate in the shared `operation` / `receipt` family or retry-safe no-op semantics.

The v7 additions are:

- `linear issue assign --json`
- `linear issue estimate --json`
- `linear issue move --json`
- `linear issue priority --json`
- `linear notification archive --json`
- `linear notification read --json`
- `linear project create --json`
- `linear project label add --json`
- `linear project label remove --json`
- `linear webhook create --json`
- `linear webhook delete --json`
- `linear webhook update --json`

V7 reuses the same machine-readable failure envelope described above. When a command also supports `--dry-run`, it continues to use `dry_run_preview:v1`.

### `issue assign/estimate/move/priority --json`

Top-level shape:

```json
{
  "id": "issue-123",
  "identifier": "ENG-123",
  "title": "Stabilize auth expiry handling",
  "receipt": {
    "operationId": "issue.assign",
    "resource": "issue",
    "action": "assign",
    "resolvedRefs": {
      "issue": "ENG-123",
      "assignee": "self"
    },
    "appliedChanges": ["assignee"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "none"
  },
  "operation": {
    "family": "write_operation",
    "version": "v1",
    "command": "issue.assign",
    "resource": "issue",
    "action": "assign",
    "summary": "Assign ENG-123 to self",
    "refs": {
      "issue": "ENG-123",
      "assignee": "self"
    },
    "changes": ["assignee"],
    "noOp": false
  }
}
```

The field that actually changed varies by command:

- `issue assign`: `assignee`
- `issue estimate`: `estimate`
- `issue move`: `state`
- `issue priority`: `priority`

### `notification read/archive --json`

Top-level shape:

```json
{
  "id": "notif-123",
  "title": "New comment on ENG-123",
  "readAt": "2026-04-05T10:00:00.000Z",
  "archivedAt": null,
  "noOp": false,
  "receipt": {
    "operationId": "notification.read",
    "resource": "notification",
    "action": "read",
    "resolvedRefs": {
      "notification": "notif-123"
    },
    "appliedChanges": ["readAt"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "none"
  }
}
```

These commands are retry-safe no-op writes. When the notification is already in the requested state, they still succeed and return `noOp: true`.

### `project create --json`

Top-level shape:

```json
{
  "id": "project-123",
  "slugId": "agent-cli",
  "name": "Agent CLI",
  "url": "https://linear.app/acme/project/agent-cli",
  "receipt": {
    "operationId": "project.create",
    "resource": "project",
    "action": "create",
    "resolvedRefs": {
      "team": "ENG"
    },
    "appliedChanges": ["project"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "none"
  },
  "operation": {
    "family": "write_operation",
    "version": "v1",
    "command": "project.create",
    "resource": "project",
    "action": "create",
    "summary": "Create project Agent CLI",
    "refs": {
      "team": "ENG"
    },
    "changes": ["project"],
    "noOp": false
  }
}
```

### `project label add/remove --json`

Top-level shape:

```json
{
  "changed": true,
  "project": {
    "id": "project-123",
    "slugId": "agent-cli",
    "name": "Agent CLI"
  },
  "label": {
    "id": "label-123",
    "name": "Bug",
    "color": "#ef4444"
  },
  "receipt": {
    "operationId": "project.label.add",
    "resource": "project_label",
    "action": "add",
    "resolvedRefs": {
      "project": "agent-cli",
      "label": "Bug"
    },
    "appliedChanges": ["label"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "none"
  },
  "operation": {
    "family": "write_operation",
    "version": "v1",
    "command": "project.label.add",
    "resource": "project_label",
    "action": "add",
    "summary": "Add Bug to project agent-cli",
    "refs": {
      "project": "agent-cli",
      "label": "Bug"
    },
    "changes": ["label"],
    "noOp": false
  }
}
```

These commands are retry-safe no-op writes. When the project is already in the requested label state, they still succeed and report `changed: false`.

### `webhook create/update/delete --json`

Top-level shape for `create` and `update`:

```json
{
  "id": "webhook-123",
  "label": "agent-webhook",
  "url": "https://example.com/linear",
  "enabled": true,
  "archivedAt": null,
  "allPublicTeams": false,
  "resourceTypes": ["Issue", "Comment"],
  "createdAt": "2026-04-05T10:00:00.000Z",
  "updatedAt": "2026-04-05T10:00:00.000Z",
  "team": {
    "id": "team-123",
    "key": "ENG",
    "name": "Engineering"
  },
  "creator": {
    "id": "user-123",
    "name": "Alice Bot"
  },
  "receipt": {
    "operationId": "webhook.update",
    "resource": "webhook",
    "action": "update",
    "resolvedRefs": {
      "webhook": "webhook-123"
    },
    "appliedChanges": ["webhook"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "none"
  },
  "operation": {
    "family": "write_operation",
    "version": "v1",
    "command": "webhook.update",
    "resource": "webhook",
    "action": "update",
    "summary": "Update webhook agent-webhook",
    "refs": {
      "webhook": "webhook-123"
    },
    "changes": ["webhook"],
    "noOp": false
  }
}
```

Top-level shape for `delete`:

```json
{
  "id": "webhook-123",
  "label": "agent-webhook",
  "url": "https://example.com/linear",
  "success": true,
  "receipt": {
    "operationId": "webhook.delete",
    "resource": "webhook",
    "action": "delete",
    "resolvedRefs": {
      "webhook": "webhook-123"
    },
    "appliedChanges": ["webhook"],
    "noOp": false,
    "partialSuccess": false,
    "nextSafeAction": "none"
  },
  "operation": {
    "family": "write_operation",
    "version": "v1",
    "command": "webhook.delete",
    "resource": "webhook",
    "action": "delete",
    "summary": "Delete webhook agent-webhook",
    "refs": {
      "webhook": "webhook-123"
    },
    "changes": ["webhook"],
    "noOp": false
  }
}
```

When the CLI cannot resolve the ref without mutating Linear, the command still exits successfully and reports an unresolved payload:

```json
{
  "kind": "reference_resolution",
  "version": "v1",
  "refType": "issue",
  "input": "123",
  "source": "argument",
  "status": "unresolved",
  "matchedBy": null,
  "ambiguous": false,
  "resolved": null,
  "candidates": [],
  "unresolvedReason": {
    "code": "missing_context",
    "message": "A numeric issue reference needs a configured team key. Set LINEAR_TEAM_ID or pass a full issue identifier like ENG-123."
  }
}
```

### `resolve issue --json`

Top-level shape:

```json
{
  "kind": "reference_resolution",
  "version": "v1",
  "refType": "issue",
  "input": "ENG-123",
  "source": "argument",
  "status": "resolved",
  "matchedBy": "identifier",
  "ambiguous": false,
  "resolved": {
    "id": "issue-123",
    "identifier": "ENG-123",
    "title": "Stabilize auth expiry handling",
    "url": "https://linear.app/acme/issue/ENG-123/stabilize-auth",
    "team": {
      "id": "team-123",
      "key": "ENG",
      "name": "Engineering"
    }
  },
  "candidates": [
    {
      "id": "issue-123",
      "identifier": "ENG-123",
      "title": "Stabilize auth expiry handling",
      "url": "https://linear.app/acme/issue/ENG-123/stabilize-auth",
      "team": {
        "id": "team-123",
        "key": "ENG",
        "name": "Engineering"
      }
    }
  ],
  "unresolvedReason": null
}
```

### `resolve user --json`

Top-level shape:

```json
{
  "kind": "reference_resolution",
  "version": "v1",
  "refType": "user",
  "input": "alice",
  "source": "argument",
  "status": "resolved",
  "matchedBy": "name_contains_first",
  "ambiguous": true,
  "resolved": {
    "id": "user-123",
    "name": "alice.bot",
    "displayName": "Alice Bot",
    "email": "alice@example.com"
  },
  "candidates": [
    {
      "id": "user-123",
      "name": "alice.bot",
      "displayName": "Alice Bot",
      "email": "alice@example.com"
    },
    {
      "id": "user-456",
      "name": "alice.builder",
      "displayName": "Alice Builder",
      "email": "alice.builder@example.com"
    }
  ],
  "unresolvedReason": null
}
```

## Compatibility Rules

Within a given Automation Contract version:

- patch and minor releases may add new fields only
- removing a field is breaking
- renaming a field is breaking
- changing a field's type is breaking
- changing a command's top-level JSON shape is breaking
- changing `null` to omission for documented optional fields is breaking

Breaking changes require a new contract version.
