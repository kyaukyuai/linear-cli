import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveIssueLabelReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const labelCommand = new Command()
  .name("label")
  .description("Resolve an issue label reference without mutating Linear")
  .arguments("<label:string>")
  .option("--team <team:string>", "Team key for team-scoped resolution")
  .option("-j, --json", "Output as JSON")
  .example(
    "Resolve a label within a team context",
    "linear resolve label Bug --team ENG --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve label reference",
    )
  )
  .action(async ({ json, team }, label: string) => {
    await runResolveCommand(
      json,
      "Failed to resolve label reference",
      () => resolveIssueLabelReference(label, team),
    )
  })
