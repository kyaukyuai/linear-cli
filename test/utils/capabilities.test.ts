import { assert, assertEquals } from "@std/assert"
import { buildCapabilitiesPayload } from "../../src/utils/capabilities.ts"

Deno.test("buildCapabilitiesPayload defaults to the v1 compatibility shape", () => {
  const payload = buildCapabilitiesPayload("2.11.0")

  assertEquals(payload.schemaVersion, "v1")
  assertEquals(payload.cli, {
    name: "linear-cli",
    binary: "linear",
    version: "2.11.0",
  })
  assertEquals(payload.contractVersions.automation.latest, "v6")
  assertEquals(payload.contractVersions.automation.supported, [
    "v1",
    "v2",
    "v3",
    "v4",
    "v5",
    "v6",
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

  const issueUpdate = payload.commands.find((entry) =>
    entry.path === "linear issue update"
  )
  assert(issueUpdate != null)
  assertEquals("executionProfiles" in payload, false)
  assertEquals("schema" in issueUpdate, false)
  assertEquals("output" in issueUpdate, false)
})

Deno.test("buildCapabilitiesPayload v2 includes issue update capability traits", () => {
  const payload = buildCapabilitiesPayload("2.11.0", "v2")
  assertEquals(payload.compatibility, {
    defaultSchemaVersion: "v1",
    latestSchemaVersion: "v2",
    supportedSchemaVersions: ["v1", "v2"],
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
          "Does not change startup-safe capabilities compatibility defaults.",
        ],
      },
    ],
  })
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
  assertEquals(command.schema.optionalInputs, [
    { source: "argument", name: "issue" },
    { source: "flag", name: "--json" },
    { source: "flag", name: "--dry-run" },
    { source: "flag", name: "--timeout-ms" },
    { source: "flag", name: "--state" },
    { source: "flag", name: "--comment" },
    { source: "flag", name: "--description" },
    { source: "flag", name: "--description-file" },
  ])
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
      name: "--timeout-ms",
      value: null,
      description:
        "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    },
  ])
  assertEquals(command.schema.resolutions, [
    {
      source: "argument",
      name: "issue",
      strategy: "current_issue_context",
      description:
        "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    },
    {
      source: "flag",
      name: "--timeout-ms",
      strategy: "env_or_internal_default",
      description:
        "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    },
  ])
  assertEquals(command.schema.constraints, [
    {
      source: { source: "flag", name: "--description" },
      kind: "conflicts_with",
      targets: [{ source: "flag", name: "--description-file" }],
      reason:
        "Choose either inline replacement description text or a description file.",
    },
  ])
  assertEquals(command.schema.stdinTargets, [
    { field: "description", viaFlags: [] },
  ])
  assertEquals(command.schema.fileTargets, [
    { field: "description", viaFlags: ["--description-file"] },
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
  assert(command.schema.flags.some((flag) => flag.name === "--dry-run"))
  assert(command.schema.flags.some((flag) => flag.name === "--timeout-ms"))
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
  assertEquals(readCommand.output.success.category, "curated_json")
  assertEquals(archiveCommand.output.success.category, "curated_json")
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
      value: "v1",
      description: "Defaults to the startup-safe capabilities schema shape.",
    },
  ])
  assertEquals(capabilitiesCommand.schema.constraints, [
    {
      source: { source: "flag", name: "--compat" },
      kind: "requires_all_of",
      targets: [{ source: "flag", name: "--json" }],
      reason: "--compat only applies to the machine-readable JSON output.",
    },
  ])
  assertEquals(capabilitiesCommand.schema.examples, [
    {
      description: "Read the startup-safe capabilities registry.",
      argv: ["linear", "capabilities", "--json"],
    },
    {
      description: "Opt into richer schema metadata for advanced agents.",
      argv: ["linear", "capabilities", "--json", "--compat", "v2"],
    },
  ])
})
