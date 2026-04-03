import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveIssueLabelReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const labelCommand = new Command()
  .name("label")
  .description("Resolve an issue label reference without mutating Linear")
  .arguments("<label:string>")
  .option("--team <team:string>", "Team key for team-scoped resolution")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "Resolve a label within a team context",
    "linear resolve label Bug --team ENG",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve label reference",
    )
  )
  .action(async ({ json, text, team }, label: string) => {
    await runResolveCommand(
      "linear resolve label",
      { json, text },
      "Failed to resolve label reference",
      () => resolveIssueLabelReference(label, team),
    )
  })
