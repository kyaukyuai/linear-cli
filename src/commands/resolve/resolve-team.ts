import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveTeamReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const teamCommand = new Command()
  .name("team")
  .description("Resolve a team reference without mutating Linear")
  .arguments("[team:string]")
  .option("-j, --json", "Output as JSON")
  .example(
    "Resolve an explicit team key",
    "linear resolve team ENG --json",
  )
  .example(
    "Resolve the configured current team",
    "linear resolve team --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve team reference",
    )
  )
  .action(async ({ json }, team?: string) => {
    await runResolveCommand(
      json,
      "Failed to resolve team reference",
      () => resolveTeamReference(team),
    )
  })
