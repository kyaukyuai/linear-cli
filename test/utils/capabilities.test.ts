import { assert, assertEquals } from "@std/assert"
import { buildCapabilitiesPayload } from "../../src/utils/capabilities.ts"

Deno.test("buildCapabilitiesPayload exposes stable top-level contract metadata", () => {
  const payload = buildCapabilitiesPayload("2.10.0")

  assertEquals(payload.schemaVersion, "v1")
  assertEquals(payload.cli, {
    name: "linear-cli",
    binary: "linear",
    version: "2.10.0",
  })
  assertEquals(payload.contractVersions.automation.latest, "v4")
  assertEquals(payload.contractVersions.automation.supported, [
    "v1",
    "v2",
    "v3",
    "v4",
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
})

Deno.test("buildCapabilitiesPayload includes issue update capability traits", () => {
  const payload = buildCapabilitiesPayload("2.10.0")
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
})

Deno.test("buildCapabilitiesPayload includes raw api escape hatch traits", () => {
  const payload = buildCapabilitiesPayload("2.10.0")
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
})

Deno.test("buildCapabilitiesPayload classifies notification writes as retry-safe no-op", () => {
  const payload = buildCapabilitiesPayload("2.10.0")
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

  assert(archiveCommand != null)
  assertEquals(archiveCommand.idempotency.category, "retry_safe_no_op")
  assertEquals(
    archiveCommand.idempotency.notes,
    "Archiving an already-archived notification succeeds with noOp: true.",
  )
})
