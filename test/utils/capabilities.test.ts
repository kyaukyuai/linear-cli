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
  assertEquals(payload.contractVersions.automation.latest, "v5")
  assertEquals(payload.contractVersions.automation.supported, [
    "v1",
    "v2",
    "v3",
    "v4",
    "v5",
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

  const issueUpdate = payload.commands.find((entry) =>
    entry.path === "linear issue update"
  )
  assert(issueUpdate != null)
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
  assertEquals(command.schema.stdinTargets, [
    { field: "description", viaFlags: [] },
  ])
  assertEquals(command.schema.fileTargets, [
    { field: "description", viaFlags: ["--description-file"] },
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
  })
  assertEquals(command.output.failure.jsonWhenRequested, true)
  assertEquals(command.output.failure.parseErrorsJsonWhenRequested, true)
  assert(command.output.failure.exitCodes.some((entry) => entry.code === 1))
  assert(command.output.failure.exitCodes.some((entry) => entry.code === 4))
  assert(command.output.failure.exitCodes.some((entry) => entry.code === 6))
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
})
