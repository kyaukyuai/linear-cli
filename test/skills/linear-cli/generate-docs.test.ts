import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert"
import {
  type CommandInfo,
  generateCommandsSection,
  generateIndex,
  generateReferenceToc,
  renderTemplate,
} from "../../../skills/linear-cli/scripts/generate-docs.ts"

const FIXTURE_COMMANDS: CommandInfo[] = [
  {
    name: "issue",
    description: "Manage Linear issues",
    help: "Issue help text",
    subcommands: [],
  },
  {
    name: "capabilities",
    description: "Describe the agent-facing command surface",
    help: "Capabilities help text",
    subcommands: [],
  },
]

Deno.test("renderTemplate throws when a required placeholder is missing", () => {
  assertThrows(
    () => renderTemplate("hello", { "{{MISSING}}": "value" }),
    Error,
    "Template is missing required placeholder",
  )
})

Deno.test("SKILL template remains the source of truth for agent guidance", async () => {
  const template = await Deno.readTextFile(
    new URL("../../../skills/linear-cli/SKILL.template.md", import.meta.url),
  )

  const rendered = renderTemplate(template, {
    "{{COMMANDS}}": generateCommandsSection(FIXTURE_COMMANDS),
    "{{REFERENCE_TOC}}": generateReferenceToc(FIXTURE_COMMANDS),
  })

  assertStringIncludes(
    rendered,
    "Discover command traits with `linear capabilities`; use `--compat v1` only when an older consumer still expects the trimmed legacy shape",
  )
  assertStringIncludes(
    rendered,
    "linear issue         # Manage Linear issues",
  )
  assertStringIncludes(
    rendered,
    "- [capabilities](references/capabilities.md) - Describe the agent-facing command surface",
  )
})

Deno.test("commands template renders quick reference and workflow from source template", async () => {
  const template = await Deno.readTextFile(
    new URL(
      "../../../skills/linear-cli/references/commands.template.md",
      import.meta.url,
    ),
  )

  const rendered = generateIndex(FIXTURE_COMMANDS, template)

  assertStringIncludes(
    rendered,
    "- [issue](./issue.md) - Manage Linear issues",
  )
  assertStringIncludes(
    rendered,
    "linear capabilities --compat v1",
  )
  assertStringIncludes(
    rendered,
    "5. Inspect exit codes and `error.details` for retries or reconciliation",
  )
})

Deno.test("generateReferenceToc remains stable for generated skill references", () => {
  assertEquals(
    generateReferenceToc(FIXTURE_COMMANDS),
    [
      "- [issue](references/issue.md) - Manage Linear issues",
      "- [capabilities](references/capabilities.md) - Describe the agent-facing command surface",
    ].join("\n"),
  )
})
