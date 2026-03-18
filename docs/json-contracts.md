# Automation Contract v1

`linear-cli` exposes many `--json` modes, but only a subset is treated as a stable automation contract.

This document defines the v1 contract for org-wide automation. The contract applies to:

- success payload top-level shapes
- failure payload shape for `--json`
- common value conventions
- backward-compatibility rules

It does not apply to:

- non-JSON terminal output
- `linear api`
- commands outside the automation tier listed below
- stderr output when `LINEAR_DEBUG=1`

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
- `cli_error`
- `graphql_error`
- `unknown_error`

`suggestion` and `context` are nullable and always present in the envelope.

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
    "estimate": 3,
    "updatedAt": "2026-03-18T00:00:00.000Z",
    "assignee": null,
    "state": { "id": "state-1", "name": "In Progress", "color": "#f87462" },
    "team": { "id": "team-1", "key": "ENG", "name": "Engineering" },
    "project": null,
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
  "state": null
}
```

### `issue relation add --json` and `issue relation delete --json`

Top-level shape:

```json
{
  "success": true,
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
  "relationId": "relation-789"
}
```

For delete, `relationId` is the deleted relation ID.

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
  }
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

## Compatibility Rules

Within Automation Contract v1:

- patch and minor releases may add new fields only
- removing a field is breaking
- renaming a field is breaking
- changing a field's type is breaking
- changing a command's top-level JSON shape is breaking
- changing `null` to omission for documented optional fields is breaking

Breaking changes require a new contract version.
