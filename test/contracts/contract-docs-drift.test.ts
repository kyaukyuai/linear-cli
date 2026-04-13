import { assert, assertEquals, assertStringIncludes } from "@std/assert"
import { fromFileUrl } from "@std/path"

const repoRoot = fromFileUrl(new URL("../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../src/main.ts", import.meta.url))
const jsonContractsPath = fromFileUrl(
  new URL("../../docs/json-contracts.md", import.meta.url),
)
const agentFirstPath = fromFileUrl(
  new URL("../../docs/agent-first.md", import.meta.url),
)
const readmePath = fromFileUrl(new URL("../../README.md", import.meta.url))
const migrationCookbookPath = fromFileUrl(
  new URL("../../docs/v2-to-v3-migration-cookbook.md", import.meta.url),
)
const skillTemplatePath = fromFileUrl(
  new URL("../../skills/linear-cli/SKILL.template.md", import.meta.url),
)
const commandsTemplatePath = fromFileUrl(
  new URL(
    "../../skills/linear-cli/references/commands.template.md",
    import.meta.url,
  ),
)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

async function getCurrentCliVersion(): Promise<string> {
  const denoJsonText = await Deno.readTextFile(denoJsonPath)
  const denoJson = JSON.parse(denoJsonText)

  assert(
    isRecord(denoJson) && typeof denoJson.version === "string",
    "deno.json must define a string version",
  )

  return denoJson.version
}

async function runLinearJsonCommand(
  args: string[],
): Promise<Record<string, unknown>> {
  const output = await new Deno.Command("deno", {
    args: [
      "run",
      "-c",
      denoJsonPath,
      "--allow-all",
      "--quiet",
      mainPath,
      ...args,
    ],
    cwd: repoRoot,
    env: {
      NO_COLOR: "1",
    },
    stdout: "piped",
    stderr: "piped",
  }).output()

  const stderr = new TextDecoder().decode(output.stderr)
  const stdout = new TextDecoder().decode(output.stdout)

  assertEquals(stderr, "", `Expected no stderr for: linear ${args.join(" ")}`)
  assert(
    output.success,
    `Expected success for: linear ${args.join(" ")}\n${stdout}`,
  )

  const payload = JSON.parse(stdout)
  assert(
    isRecord(payload),
    `Expected object JSON payload for: linear ${args.join(" ")}`,
  )

  return payload
}

function extractJsonExample(
  markdown: string,
  marker: string,
): Record<string, unknown> {
  const start = markdown.indexOf(marker)
  assert(
    start !== -1,
    `Missing JSON example marker in docs/json-contracts.md: ${marker}`,
  )

  const blockStart = markdown.indexOf("```json\n", start)
  assert(blockStart !== -1, `Missing JSON code fence after marker: ${marker}`)

  const contentStart = blockStart + "```json\n".length
  const blockEnd = markdown.indexOf("\n```", contentStart)
  assert(
    blockEnd !== -1,
    `Missing closing JSON code fence after marker: ${marker}`,
  )

  const jsonText = markdown.slice(contentStart, blockEnd)
  const payload = JSON.parse(jsonText)

  assert(
    isRecord(payload),
    `Expected object JSON example for marker: ${marker}`,
  )
  return payload
}

function findCapabilityCommand(
  payload: Record<string, unknown>,
  path: string,
): Record<string, unknown> {
  const commands = payload.commands
  assert(Array.isArray(commands), "Expected commands to be an array")

  const command = commands.find((value) =>
    isRecord(value) && value.path === path
  )

  assert(isRecord(command), `Expected capability command: ${path}`)
  return command
}

Deno.test("contract docs pin current CLI version in capabilities examples", async () => {
  const currentVersion = await getCurrentCliVersion()
  const docs = await Deno.readTextFile(jsonContractsPath)

  const defaultExample = extractJsonExample(
    docs,
    "Default top-level shape from `linear capabilities`:",
  )

  assert(
    isRecord(defaultExample.cli),
    "Expected default capabilities example to include cli",
  )
  assertEquals(
    defaultExample.cli.version,
    currentVersion,
    [
      "docs/json-contracts.md has a stale capabilities example version.",
      `Expected cli.version to match deno.json (${currentVersion}).`,
    ].join(" "),
  )
})

Deno.test("contract docs describe capabilities compat modes that match runtime output", async () => {
  const docs = await Deno.readTextFile(jsonContractsPath)
  const defaultExample = extractJsonExample(
    docs,
    "Default top-level shape from `linear capabilities`:",
  )
  const compatV1Example = extractJsonExample(
    docs,
    "`linear capabilities --compat v1` preserves the trimmed legacy startup shape for older consumers:",
  )

  assertStringIncludes(
    docs,
    "`linear capabilities` defaults to the richer `v2` schema-like discovery shape in v3",
    "docs/json-contracts.md must document the v2 default capabilities shape",
  )
  assertStringIncludes(
    docs,
    "`linear capabilities --compat v1`",
    "docs/json-contracts.md must document the explicit legacy v1 capabilities shape",
  )

  const runtimeDefault = await runLinearJsonCommand(["capabilities"])
  const runtimeCompatV1 = await runLinearJsonCommand([
    "capabilities",
    "--compat",
    "v1",
  ])

  assertEquals(defaultExample.schemaVersion, runtimeDefault.schemaVersion)
  assertEquals(compatV1Example.schemaVersion, runtimeCompatV1.schemaVersion)
  assertEquals(
    "compatibility" in defaultExample,
    "compatibility" in runtimeDefault,
  )
  assertEquals(
    "compatibility" in compatV1Example,
    "compatibility" in runtimeCompatV1,
  )

  assert(
    isRecord(defaultExample.contractVersions),
    "Expected contractVersions in default example",
  )
  assert(
    isRecord(runtimeDefault.contractVersions),
    "Expected contractVersions in runtime payload",
  )
  assert(
    isRecord(defaultExample.automationTier),
    "Expected automationTier in default example",
  )
  assert(
    isRecord(runtimeDefault.automationTier),
    "Expected automationTier in runtime payload",
  )

  const defaultExampleAutomation = defaultExample.contractVersions.automation
  const runtimeDefaultAutomation = runtimeDefault.contractVersions.automation
  assert(
    isRecord(defaultExampleAutomation),
    "Expected automation contract version in docs example",
  )
  assert(
    isRecord(runtimeDefaultAutomation),
    "Expected automation contract version in runtime payload",
  )
  assertEquals(defaultExampleAutomation.latest, runtimeDefaultAutomation.latest)
  assertEquals(
    defaultExample.automationTier.latestVersion,
    runtimeDefault.automationTier.latestVersion,
  )
  assertStringIncludes(
    docs,
    "## Automation Contract v7",
    "docs/json-contracts.md must document the latest automation contract generation",
  )
  assertStringIncludes(
    docs,
    "`linear issue assign --json`",
    "docs/json-contracts.md must list v7 write additions explicitly",
  )
  assertStringIncludes(
    docs,
    "`repeatable`, `variadic`, `aliases`, `deprecated`, `defaultValue`, and per-parameter `examples`",
    "docs/json-contracts.md must describe richer parser-oriented parameter metadata",
  )
  assertStringIncludes(
    docs,
    "`requires_any_of`, `conflicts_with`, and `at_most_one_of`",
    "docs/json-contracts.md must document the stronger constraint kinds",
  )
  assertStringIncludes(
    docs,
    "startup-monitor consumer suite",
    "docs/json-contracts.md must document named consumer certification suites",
  )
  assertStringIncludes(
    docs,
    "compatibility-bridge consumer suite",
    "docs/json-contracts.md must document the compatibility certification suite",
  )
  assertStringIncludes(
    docs,
    "timeout-recovery consumer suite",
    "docs/json-contracts.md must document the timeout recovery certification suite",
  )
  assertStringIncludes(
    docs,
    "`stable`, `partial`, and `escape_hatch`",
    "docs/json-contracts.md must document runtime surface classes",
  )

  const docsDefaultIssueUpdate = findCapabilityCommand(
    defaultExample,
    "linear issue update",
  )
  const runtimeDefaultIssueUpdate = findCapabilityCommand(
    runtimeDefault,
    "linear issue update",
  )
  assertEquals(
    "schema" in docsDefaultIssueUpdate,
    "schema" in runtimeDefaultIssueUpdate,
  )
  assertEquals(
    "output" in docsDefaultIssueUpdate,
    "output" in runtimeDefaultIssueUpdate,
  )
  assertEquals(
    "surface" in docsDefaultIssueUpdate,
    "surface" in runtimeDefaultIssueUpdate,
  )
  assertEquals(
    "writeSemantics" in docsDefaultIssueUpdate,
    "writeSemantics" in runtimeDefaultIssueUpdate,
  )
  assertEquals(
    "surfaceClasses" in defaultExample,
    "surfaceClasses" in runtimeDefault,
  )

  const docsCompatV1IssueUpdate = findCapabilityCommand(
    compatV1Example,
    "linear issue update",
  )
  const runtimeCompatV1IssueUpdate = findCapabilityCommand(
    runtimeCompatV1,
    "linear issue update",
  )
  assertEquals(
    "schema" in docsCompatV1IssueUpdate,
    "schema" in runtimeCompatV1IssueUpdate,
  )
  assertEquals(
    "output" in docsCompatV1IssueUpdate,
    "output" in runtimeCompatV1IssueUpdate,
  )
  assertEquals(
    "writeSemantics" in docsCompatV1IssueUpdate,
    "writeSemantics" in runtimeCompatV1IssueUpdate,
  )
})

Deno.test("agent-facing source docs keep default v2 and legacy v1 capabilities examples", async () => {
  const sourceDocs = [
    { label: "README", path: readmePath },
    { label: "docs/agent-first.md", path: agentFirstPath },
    { label: "skills/linear-cli/SKILL.template.md", path: skillTemplatePath },
    {
      label: "skills/linear-cli/references/commands.template.md",
      path: commandsTemplatePath,
    },
  ]

  for (const sourceDoc of sourceDocs) {
    const text = await Deno.readTextFile(sourceDoc.path)

    assertStringIncludes(
      text,
      "linear capabilities",
      `${sourceDoc.label} must keep the default capabilities example`,
    )
    assertStringIncludes(
      text,
      "linear capabilities --compat v1",
      `${sourceDoc.label} must keep the legacy v1 capabilities example`,
    )
    assertStringIncludes(
      text,
      "--profile human-debug --interactive",
      `${sourceDoc.label} must document the explicit human/debug prompt mode`,
    )
    assertStringIncludes(
      text,
      "--text",
      `${sourceDoc.label} must document the explicit human-readable output escape hatch`,
    )
    assertStringIncludes(
      text,
      "--apply-triage",
      `${sourceDoc.label} must document deterministic source triage intake`,
    )
    assertStringIncludes(
      text,
      "v2-to-v3-migration-cookbook.md",
      `${sourceDoc.label} must reference the v2-to-v3 migration cookbook`,
    )
    assertStringIncludes(
      text,
      "escape hatch",
      `${sourceDoc.label} must classify escape-hatch surfaces explicitly`,
    )
  }

  const readme = await Deno.readTextFile(readmePath)
  assertStringIncludes(
    readme,
    "repeatable/variadic inputs, deprecated aliases, default values",
    "README must describe the richer parser-oriented capabilities metadata",
  )
})

Deno.test("v3 migration guide keeps explicit diagnostics migration examples", async () => {
  const v3Guide = await Deno.readTextFile(
    fromFileUrl(new URL("../../docs/agent-only-v3.md", import.meta.url)),
  )

  assertStringIncludes(
    v3Guide,
    "linear team list --json",
    "docs/agent-only-v3.md must document the machine-readable diagnostics path",
  )
  assertStringIncludes(
    v3Guide,
    "linear issue view ENG-123 --text",
    "docs/agent-only-v3.md must keep the explicit human-readable escape hatch example",
  )
  assertStringIncludes(
    v3Guide,
    "linear capabilities --compat v1",
    "docs/agent-only-v3.md must keep the legacy startup compatibility example",
  )
  assertStringIncludes(
    v3Guide,
    "`stable`: startup-contract or automation-contract surfaces",
    "docs/agent-only-v3.md must classify stable surfaces",
  )
})

Deno.test("agent-native docs keep named consumer certification suites", async () => {
  const runbook = await Deno.readTextFile(agentFirstPath)

  for (
    const suiteName of [
      "startup-monitor consumer suite",
      "diagnostics consumer suite",
      "compatibility-bridge consumer suite",
      "control-plane consumer suite",
      "timeout-recovery consumer suite",
    ]
  ) {
    assertStringIncludes(
      runbook,
      suiteName,
      `docs/agent-first.md must document ${suiteName}`,
    )
  }

  assertStringIncludes(
    runbook,
    "`partial`: shared dry-run or machine-readable helper surface without a full stable contract.",
    "docs/agent-first.md must classify partial surfaces",
  )
  assertStringIncludes(
    runbook,
    "linear issue update ENG-123 --context-file ./slack-thread.json --apply-triage --dry-run --json",
    "docs/agent-first.md must keep the triage preview example",
  )
})

Deno.test("migration cookbook keeps copy-pasteable v2-to-v3 examples", async () => {
  const cookbook = await Deno.readTextFile(migrationCookbookPath)

  for (
    const snippet of [
      "linear capabilities --compat v1",
      "linear team list --json",
      "linear issue view ENG-123 --text",
      "linear --profile human-debug --interactive issue create",
      "linear issue update ENG-123 --state done --dry-run --json",
      "## Surface Classes",
    ]
  ) {
    assertStringIncludes(
      cookbook,
      snippet,
      `docs/v2-to-v3-migration-cookbook.md must include ${snippet}`,
    )
  }
})
