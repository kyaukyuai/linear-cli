import { assert, assertEquals, assertObjectMatch } from "@std/assert"
import { buildCapabilitiesPayload } from "../../src/utils/capabilities.ts"

Deno.test("buildCapabilitiesPayload defaults to the v2 compatibility shape", () => {
  const payload = buildCapabilitiesPayload("2.11.0")

  assertEquals(payload.schemaVersion, "v2")
  assertEquals(payload.cli, {
    name: "linear-cli",
    binary: "linear",
    version: "2.11.0",
  })
  assertEquals(payload.contractVersions.automation.latest, "v7")
  assertEquals(payload.contractVersions.automation.supported, [
    "v1",
    "v2",
    "v3",
    "v4",
    "v5",
    "v6",
    "v7",
  ])
  assertEquals(payload.contractVersions.dryRunPreview.latest, "v1")
  assertEquals(payload.contractVersions.stdinPolicy.latest, "v1")
  assert(
    payload.automationTier.allCommands.includes("linear issue list"),
  )
  assert(
    payload.automationTier.allCommands.includes("linear document list"),
  )
  assert(
    payload.automationTier.byVersion.v3.includes("linear notification count"),
  )
  assert(
    payload.automationTier.byVersion.v4.includes("linear team view"),
  )
  assert(
    payload.automationTier.byVersion.v4.includes("linear label list"),
  )
  assert(
    payload.automationTier.byVersion.v5.includes("linear initiative list"),
  )
  assert(
    payload.automationTier.byVersion.v5.includes("linear initiative view"),
  )
  assert(
    payload.automationTier.byVersion.v5.includes(
      "linear initiative-update list",
    ),
  )
  assert(
    payload.automationTier.byVersion.v5.includes("linear project-update list"),
  )
  assert(
    payload.automationTier.byVersion.v6.includes("linear resolve issue"),
  )
  assert(
    payload.automationTier.byVersion.v7.includes("linear issue assign"),
  )
  assert(
    payload.automationTier.byVersion.v7.includes("linear project create"),
  )
  assert(
    payload.automationTier.byVersion.v7.includes("linear webhook update"),
  )
  assert(
    payload.automationTier.byVersion.v7.includes("linear notification read"),
  )

  const issueUpdate = payload.commands.find((entry) =>
    entry.path === "linear issue update"
  )
  assert(issueUpdate != null)
  assertEquals(payload.compatibility, {
    defaultSchemaVersion: "v2",
    latestSchemaVersion: "v2",
    supportedSchemaVersions: ["v1", "v2"],
  })
  assertEquals(payload.surfaceClasses, {
    stable: {
      description:
        "Stable machine-readable surface with an explicit startup or automation contract.",
      callerExpectation:
        "Safe to treat as the primary agent-runtime path and depend on for startup, read, preview, or apply loops.",
    },
    partial: {
      description:
        "Agent-usable surface with some structured semantics, but without a full stable apply/read contract.",
      callerExpectation:
        "Prefer only when the stable surface does not cover the workflow yet, and pin explicit flags or migration guidance instead of assuming long-term shape stability.",
    },
    escape_hatch: {
      description:
        "Intentionally raw or human/debug-oriented path outside the stable agent-runtime contract.",
      callerExpectation:
        "Use only as an explicit fallback. Do not infer startup-critical or automation-tier guarantees from availability alone.",
    },
  })
  assertEquals(payload.executionProfiles, {
    defaultProfile: "agent-safe",
    availableProfiles: [
      {
        name: "agent-safe",
        description:
          "Default profile for agent and automation runs that prefer predictable non-interactive defaults.",
        semantics: {
          disablePagerByDefault: true,
          preferJsonWhenSupported: true,
          requireExplicitConfirmationBypass: true,
          defaultWriteTimeoutMs: 45000,
          allowInteractivePrompts: false,
        },
        nonGoals: [
          "Does not force --json when the caller omits it.",
          "Does not auto-confirm destructive actions; use --yes explicitly.",
          "Does not replace missing required inputs; human/debug prompt flows still require explicit --profile human-debug --interactive opt-in.",
        ],
      },
      {
        name: "human-debug",
        description:
          "Opt-in profile for human-guided debugging that re-enables prompt and pager defaults.",
        semantics: {
          disablePagerByDefault: false,
          preferJsonWhenSupported: false,
          requireExplicitConfirmationBypass: false,
          defaultWriteTimeoutMs: 30000,
          allowInteractivePrompts: true,
        },
        nonGoals: [
          "Does not revert default-JSON command surfaces; use --text for human-readable output.",
          "Does not auto-confirm destructive actions when --interactive is omitted.",
          "Does not change explicit legacy capabilities compatibility requests.",
        ],
      },
    ],
  })
})

Deno.test("buildCapabilitiesPayload v1 preserves the legacy trimmed shape", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v1")
  const issueUpdate = payload.commands.find((entry) =>
    entry.path === "linear issue update"
  )

  assertEquals(payload.schemaVersion, "v1")
  assert(issueUpdate != null)
  assertEquals("executionProfiles" in payload, false)
  assertEquals("surfaceClasses" in payload, false)
  assertEquals("schema" in issueUpdate, false)
  assertEquals("output" in issueUpdate, false)
  assertEquals("surface" in issueUpdate, false)
})

Deno.test("buildCapabilitiesPayload v2 includes issue update capability traits", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  const command = payload.commands.find((entry) =>
    entry.path === "linear issue update"
  )

  assert(command != null)
  assertEquals(command.json, {
    supported: true,
    contractVersion: "v1",
  })
  assertEquals(command.dryRun, {
    supported: true,
    contractVersion: "v1",
  })
  assertEquals(command.stdin, { mode: "implicit_text" })
  assertEquals(command.confirmationBypass, null)
  assertEquals(command.idempotency.category, "conditional")
  assertEquals(
    command.idempotency.notes,
    "Field-only updates are retry-safe; adding --comment makes the command non-idempotent.",
  )
  assertEquals(command.writeSemantics, {
    timeoutAware: true,
    timeoutReconciliation: true,
    mayReturnNoOp: false,
    mayReturnPartialSuccess: true,
  })
  assertEquals(command.schema.coverage, "curated_primary_inputs")
  assertEquals(command.schema.inputModes, ["flags", "stdin", "file"])
  assertEquals(command.schema.arguments, [
    {
      name: "issue",
      required: false,
      valueType: "issue_ref",
      description:
        "Issue identifier or internal ID. Defaults to the current issue.",
      allowedValues: null,
    },
  ])
  assertEquals(command.schema.requiredInputs, [])
  assert(
    command.schema.optionalInputs.some((entry) =>
      entry.source === "argument" && entry.name === "issue"
    ),
  )
  assert(
    command.schema.optionalInputs.some((entry) =>
      entry.source === "flag" && entry.name === "--json"
    ),
  )
  assert(
    command.schema.optionalInputs.some((entry) =>
      entry.source === "flag" && entry.name === "--text"
    ),
  )
  assert(
    command.schema.optionalInputs.some((entry) =>
      entry.source === "flag" && entry.name === "--timeout-ms"
    ),
  )
  assert(
    command.schema.optionalInputs.some((entry) =>
      entry.source === "flag" && entry.name === "--description-file"
    ),
  )
  assert(
    command.schema.optionalInputs.some((entry) =>
      entry.source === "flag" && entry.name === "--label"
    ),
  )
  assertEquals(command.schema.defaults, [
    {
      source: "argument",
      name: "issue",
      value: null,
      description:
        "Defaults to the current issue from the branch name or jj trailer.",
    },
    {
      source: "flag",
      name: "--context-target",
      value: "comment",
      description: "Defaults to comment when --context-file is provided.",
    },
    {
      source: "flag",
      name: "--timeout-ms",
      value: null,
      description:
        "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    },
  ])
  assertEquals(command.schema.resolutions.length, 3)
  assertObjectMatch(command.schema.resolutions[0], {
    source: "argument",
    name: "issue",
    strategy: "current_issue_context",
    sources: [
      { kind: "git_branch", name: "issue identifier from branch name" },
      { kind: "jj_trailer", name: "linear issue trailer" },
    ],
  })
  assertObjectMatch(command.schema.resolutions[1], {
    source: "stdin",
    name: "stdin",
    strategy: "implicit_input_source",
    sources: [{ kind: "stdin", name: "implicit description text" }],
  })
  assertObjectMatch(command.schema.resolutions[2], {
    source: "flag",
    name: "--timeout-ms",
    strategy: "env_or_internal_default",
    sources: [
      { kind: "env", name: "LINEAR_WRITE_TIMEOUT_MS" },
      { kind: "internal_default", name: "execution profile write timeout" },
    ],
  })
  assertEquals(command.schema.constraints, [
    {
      source: { source: "flag", name: "--due-date" },
      kind: "conflicts_with",
      targets: [{ source: "flag", name: "--clear-due-date" }],
      reason: "Choose either a replacement due date or --clear-due-date.",
    },
    {
      source: { source: "flag", name: "--description" },
      kind: "conflicts_with",
      targets: [{ source: "flag", name: "--description-file" }],
      reason:
        "Choose either inline replacement description text or a description file.",
    },
    {
      source: { source: "flag", name: "--context-target" },
      kind: "requires_all_of",
      targets: [{ source: "flag", name: "--context-file" }],
      reason:
        "--context-target only applies when a normalized context file is provided.",
    },
    {
      source: { source: "flag", name: "--context-file" },
      kind: "conflicts_with",
      targets: [{ source: "flag", name: "--description-file" }],
      reason:
        "Normalized source context and --description-file are mutually exclusive.",
    },
    {
      source: { source: "flag", name: "--apply-triage" },
      kind: "requires_all_of",
      targets: [{ source: "flag", name: "--context-file" }],
      reason:
        "--apply-triage only applies when a normalized context file is provided.",
    },
    {
      kind: "at_most_one_of",
      targets: [
        { source: "flag", name: "--json" },
        { source: "flag", name: "--text" },
      ],
      reason:
        "Choose either machine-readable JSON output or human-readable text.",
    },
  ])
  assertEquals(command.schema.stdinTargets, [
    { field: "description", viaFlags: [] },
  ])
  assertEquals(command.schema.fileTargets, [
    { field: "description", viaFlags: ["--description-file"] },
    { field: "sourceContext", viaFlags: ["--context-file"] },
  ])
  assertEquals(command.schema.examples, [
    {
      description: "Preview an issue update with dry-run JSON.",
      argv: [
        "linear",
        "issue",
        "update",
        "ENG-123",
        "--state",
        "done",
        "--dry-run",
        "--json",
      ],
    },
    {
      description: "Attach normalized source context to an update comment.",
      argv: [
        "linear",
        "issue",
        "update",
        "ENG-123",
        "--state",
        "triage",
        "--context-file",
        "slack-thread.json",
        "--dry-run",
        "--json",
      ],
    },
    {
      description:
        "Preview deterministic triage from normalized source context.",
      argv: [
        "linear",
        "issue",
        "update",
        "ENG-123",
        "--context-file",
        "slack-thread.json",
        "--apply-triage",
        "--dry-run",
        "--json",
      ],
    },
    {
      description: "Apply an update and append a comment.",
      argv: [
        "linear",
        "issue",
        "update",
        "ENG-123",
        "--state",
        "done",
        "--comment",
        "Shipped",
        "--json",
      ],
    },
  ])
  assert(command.schema.flags.some((flag) => flag.name === "--state"))
  assert(command.schema.flags.some((flag) => flag.name === "--comment"))
  assert(command.schema.flags.some((flag) => flag.name === "--json"))
  assert(command.schema.flags.some((flag) => flag.name === "--text"))
  assert(command.schema.flags.some((flag) => flag.name === "--dry-run"))
  assert(command.schema.flags.some((flag) => flag.name === "--timeout-ms"))
  assert(command.schema.flags.some((flag) => flag.name === "--label"))
  assert(command.schema.flags.some((flag) => flag.name === "--context-file"))
  assert(command.schema.flags.some((flag) => flag.name === "--context-target"))
  assert(command.schema.flags.some((flag) => flag.name === "--apply-triage"))
  assertEquals(command.output.success, {
    category: "automation_contract",
    contractTarget: "automation_contract:v1",
    contract: {
      kind: "automation_contract",
      version: "v1",
    },
    shape: "object",
    exitCode: 0,
    topLevelFields: [
      "id",
      "identifier",
      "title",
      "url",
      "dueDate",
      "assignee",
      "parent",
      "state",
      "comment",
      "sourceContext",
      "triage",
      "receipt",
      "operation",
    ],
  })
  assertEquals(command.output.preview, {
    supported: true,
    contractTarget: "dry_run_preview:v1",
    contract: {
      kind: "dry_run_preview",
      version: "v1",
    },
    shape: "object",
    exitCode: 0,
    topLevelFields: ["success", "dryRun", "summary", "data", "operation"],
  })
  assertEquals(command.output.failure.jsonWhenRequested, true)
  assertEquals(command.output.failure.parseErrorsJsonWhenRequested, true)
  assert(command.output.failure.exitCodes.some((entry) => entry.code === 1))
  assert(command.output.failure.exitCodes.some((entry) => entry.code === 4))
  assert(command.output.failure.exitCodes.some((entry) => entry.code === 6))
  assertEquals(command.output.failure.topLevelFields, ["success", "error"])
  assertEquals(command.output.failure.errorFields, [
    "type",
    "message",
    "suggestion",
    "context",
    "details",
  ])
  assertEquals(command.output.failure.detailFields, [
    "failureMode",
    "outcome",
    "appliedState",
    "callerGuidance",
    "partialSuccess",
    "retryCommand",
  ])
})

Deno.test("buildCapabilitiesPayload includes raw api escape hatch traits", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  const command = payload.commands.find((entry) => entry.path === "linear api")

  assert(command != null)
  assertEquals(command.json, {
    supported: false,
    contractVersion: null,
  })
  assertEquals(command.stdin, { mode: "implicit_text" })
  assertEquals(command.idempotency.category, "read_only")
  assertEquals(command.surface, {
    class: "escape_hatch",
    reason: "raw_api",
  })
  assertEquals(
    command.notes,
    "Outputs JSON by default and accepts stdin, but does not use a --json flag.",
  )
  assertEquals(command.schema.inputModes, ["flags", "stdin"])
  assertEquals(command.schema.stdinTargets, [{ field: "query", viaFlags: [] }])
  assertEquals(command.schema.fileTargets, [])
  assertEquals(command.output.success.category, "json_default")
  assertEquals(command.output.success.contractTarget, "raw_graphql_response")
  assertEquals(command.output.success.contract, {
    kind: "raw_graphql_response",
    version: null,
  })
  assertEquals(command.output.failure.jsonWhenRequested, false)
})

Deno.test("buildCapabilitiesPayload classifies stable and partial surfaces", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  const capabilities = payload.commands.find((entry) =>
    entry.path === "linear capabilities"
  )
  const documentUpdate = payload.commands.find((entry) =>
    entry.path === "linear document update"
  )

  assert(capabilities != null)
  assertEquals(capabilities.surface, {
    class: "stable",
    reason: "startup_contract",
  })

  assert(documentUpdate != null)
  assertEquals(documentUpdate.surface, {
    class: "partial",
    reason: "shared_preview_contract",
  })
})

Deno.test("buildCapabilitiesPayload classifies notification writes as retry-safe no-op", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  const readCommand = payload.commands.find((entry) =>
    entry.path === "linear notification read"
  )
  const archiveCommand = payload.commands.find((entry) =>
    entry.path === "linear notification archive"
  )

  assert(readCommand != null)
  assertEquals(readCommand.idempotency.category, "retry_safe_no_op")
  assertEquals(
    readCommand.idempotency.notes,
    "Reading an already-read notification succeeds with noOp: true.",
  )
  assertEquals(readCommand.writeSemantics, {
    timeoutAware: true,
    timeoutReconciliation: true,
    mayReturnNoOp: true,
    mayReturnPartialSuccess: false,
  })

  assert(archiveCommand != null)
  assertEquals(archiveCommand.idempotency.category, "retry_safe_no_op")
  assertEquals(
    archiveCommand.idempotency.notes,
    "Archiving an already-archived notification succeeds with noOp: true.",
  )
  assertEquals(readCommand.json.contractVersion, "v7")
  assertEquals(archiveCommand.json.contractVersion, "v7")
  assertEquals(readCommand.output.success.category, "automation_contract")
  assertEquals(archiveCommand.output.success.category, "automation_contract")
  assertEquals(
    readCommand.output.success.contractTarget,
    "automation_contract:v7",
  )
  assertEquals(
    archiveCommand.output.success.contractTarget,
    "automation_contract:v7",
  )
})

Deno.test("buildCapabilitiesPayload promotes remaining high-value writes into automation contract v7", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")

  const promotedCommands = [
    "linear issue assign",
    "linear issue estimate",
    "linear issue move",
    "linear issue priority",
    "linear project create",
    "linear project label add",
    "linear project label remove",
    "linear webhook create",
    "linear webhook delete",
    "linear webhook update",
    "linear notification archive",
    "linear notification read",
  ]

  for (const path of promotedCommands) {
    const command = payload.commands.find((entry) => entry.path === path)
    assert(command != null, `Expected capability command: ${path}`)
    assertEquals(command.json.contractVersion, "v7")
    assertEquals(command.output.success.category, "automation_contract")
    assertEquals(
      command.output.success.contractTarget,
      "automation_contract:v7",
    )
    assert(command.output.success.topLevelFields.length > 0)
  }

  const projectCreate = payload.commands.find((entry) =>
    entry.path === "linear project create"
  )
  assert(projectCreate != null)
  assertEquals(projectCreate.dryRun.contractVersion, "v1")
  assertEquals(
    projectCreate.output.preview.contractTarget,
    "dry_run_preview:v1",
  )

  const issueAssign = payload.commands.find((entry) =>
    entry.path === "linear issue assign"
  )
  assert(issueAssign != null)
  assertEquals(issueAssign.output.success.topLevelFields, [
    "identifier",
    "assignee",
    "receipt",
    "operation",
  ])
})

Deno.test("buildCapabilitiesPayload v2 exposes parser-oriented metadata for representative commands", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  const capabilities = payload.commands.find((entry) =>
    entry.path === "linear capabilities"
  )
  const issueCreate = payload.commands.find((entry) =>
    entry.path === "linear issue create"
  )
  const issueUpdate = payload.commands.find((entry) =>
    entry.path === "linear issue update"
  )
  const issueList = payload.commands.find((entry) =>
    entry.path === "linear issue list"
  )
  const api = payload.commands.find((entry) => entry.path === "linear api")
  const projectDelete = payload.commands.find((entry) =>
    entry.path === "linear project delete"
  )
  const documentDelete = payload.commands.find((entry) =>
    entry.path === "linear document delete"
  )

  assert(capabilities != null)
  assert(issueCreate != null)
  assert(issueUpdate != null)
  assert(issueList != null)
  assert(api != null)
  assert(projectDelete != null)
  assert(documentDelete != null)

  const compatFlag = capabilities.schema.flags.find((flag) =>
    flag.name === "--compat"
  )
  assertEquals(compatFlag?.defaultValue, "v2")
  assertEquals(compatFlag?.examples, ["v1", "v2"])
  assert(
    capabilities.schema.constraints.some((constraint) =>
      constraint.kind === "at_most_one_of" &&
      constraint.targets.some((target) => target.name === "--text")
    ),
  )

  const issueCreateLabel = issueCreate.schema.flags.find((flag) =>
    flag.name === "--label"
  )
  const issueCreateContextFile = issueCreate.schema.flags.find((flag) =>
    flag.name === "--context-file"
  )
  assertEquals(issueCreateLabel?.repeatable, true)
  assertEquals(issueCreateLabel?.examples, ["bug", "customer"])
  assertEquals(issueCreateContextFile?.examples, ["slack-thread.json"])
  assert(
    issueCreate.schema.flags.some((flag) => flag.name === "--interactive"),
  )
  assert(
    issueCreate.schema.flags.some((flag) => flag.name === "--apply-triage"),
  )
  assert(
    issueCreate.schema.fileTargets.some((target) =>
      target.field === "sourceContext"
    ),
  )
  assert(
    issueCreate.schema.constraints.some((constraint) =>
      constraint.kind === "requires_any_of" &&
      constraint.targets.some((target) => target.name === "--context-file")
    ),
  )
  assert(
    issueCreate.schema.constraints.some((constraint) =>
      constraint.source?.name === "--apply-triage" &&
      constraint.kind === "requires_all_of" &&
      constraint.targets.some((target) => target.name === "--context-file")
    ),
  )
  assert(
    issueCreate.schema.constraints.some((constraint) =>
      constraint.kind === "at_most_one_of" &&
      constraint.targets.some((target) => target.name === "--json") &&
      constraint.targets.some((target) => target.name === "--text")
    ),
  )

  const issueUpdateContextTarget = issueUpdate.schema.flags.find((flag) =>
    flag.name === "--context-target"
  )
  assertEquals(
    issueUpdateContextTarget?.allowedValues?.map((entry) => entry.value),
    ["comment", "description"],
  )
  assert(
    issueUpdate.schema.flags.some((flag) => flag.name === "--apply-triage"),
  )
  assert(
    issueUpdate.schema.fileTargets.some((target) =>
      target.field === "sourceContext"
    ),
  )
  assert(
    issueUpdate.schema.constraints.some((constraint) =>
      constraint.source?.name === "--apply-triage" &&
      constraint.kind === "requires_all_of" &&
      constraint.targets.some((target) => target.name === "--context-file")
    ),
  )

  const issueListState = issueList.schema.flags.find((flag) =>
    flag.name === "--state"
  )
  assertEquals(issueListState?.repeatable, true)
  assertEquals(issueListState?.defaultValue, ["unstarted"])
  assertEquals(issueListState?.aliases, ["todo"])
  assert(
    issueList.schema.resolutions.some((resolution) =>
      resolution.name === "--sort" &&
      resolution.sources?.some((source) =>
        source.kind === "env" && source.name === "LINEAR_ISSUE_SORT"
      )
    ),
  )

  const apiVariable = api.schema.flags.find((flag) =>
    flag.name === "--variable"
  )
  assertEquals(apiVariable?.repeatable, true)
  assertEquals(apiVariable?.examples, [
    "teamId=ENG",
    "limit=10",
    "input=@payload.json",
  ])

  const projectDeleteForce = projectDelete.schema.flags.find((flag) =>
    flag.name === "--force"
  )
  assert(projectDeleteForce != null)
  assertObjectMatch(projectDeleteForce, {
    aliases: ["--yes"],
    deprecated: {
      replacement: "--yes",
      note: "Deprecated alias for --yes.",
    },
  })
  assert(
    projectDelete.schema.constraints.some((constraint) =>
      constraint.kind === "requires_any_of" &&
      constraint.targets.some((target) => target.name === "--interactive")
    ),
  )

  assertEquals(documentDelete.schema.arguments, [
    {
      name: "documentIds",
      required: false,
      valueType: "document_id",
      description: "One or more document IDs.",
      allowedValues: null,
      repeatable: true,
      variadic: true,
      examples: ["doc_123", "doc_456"],
    },
  ])
})

Deno.test("buildCapabilitiesPayload v2 exposes constrained values where practical", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  const relationCommand = payload.commands.find((entry) =>
    entry.path === "linear issue relation add"
  )
  const capabilitiesCommand = payload.commands.find((entry) =>
    entry.path === "linear capabilities"
  )

  assert(relationCommand != null)
  assertEquals(
    relationCommand.schema.arguments.find((entry) =>
      entry.name === "relationType"
    )
      ?.allowedValues,
    [
      { value: "blocks", description: null },
      { value: "blocked-by", description: null },
      { value: "related", description: null },
      { value: "duplicate", description: null },
    ],
  )

  assert(capabilitiesCommand != null)
  assertEquals(
    capabilitiesCommand.schema.flags.find((entry) => entry.name === "--compat")
      ?.allowedValues,
    [
      { value: "v1", description: null },
      { value: "v2", description: null },
    ],
  )
  assertEquals(capabilitiesCommand.schema.defaults, [
    {
      source: "flag",
      name: "--compat",
      value: "v2",
      description: "Defaults to the richer v2 capabilities schema shape.",
    },
  ])
  assert(
    capabilitiesCommand.schema.constraints.some((constraint) =>
      constraint.kind === "requires_all_of" &&
      constraint.source?.name === "--compat" &&
      constraint.targets.some((target) => target.name === "--json")
    ),
  )
  assert(
    capabilitiesCommand.schema.constraints.some((constraint) =>
      constraint.kind === "at_most_one_of" &&
      constraint.targets.some((target) => target.name === "--json") &&
      constraint.targets.some((target) => target.name === "--text")
    ),
  )
  assertEquals(capabilitiesCommand.schema.examples, [
    {
      description: "Read the default schema-like capabilities registry.",
      argv: ["linear", "capabilities", "--json"],
    },
    {
      description:
        "Request the legacy v1 compatibility shape for older consumers.",
      argv: ["linear", "capabilities", "--json", "--compat", "v1"],
    },
    {
      description: "Pin the richer v2 schema metadata explicitly.",
      argv: ["linear", "capabilities", "--json", "--compat", "v2"],
    },
  ])
})
