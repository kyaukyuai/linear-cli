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
    "writeSemantics" in docsDefaultIssueUpdate,
    "writeSemantics" in runtimeDefaultIssueUpdate,
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
  }
})
