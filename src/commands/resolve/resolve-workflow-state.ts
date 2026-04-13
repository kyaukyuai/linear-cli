import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import {
  printReferenceResolution,
  resolveWorkflowStateReference,
} from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const workflowStateCommand = new Command()
  .name("workflow-state")
  .description("Resolve a workflow state reference without mutating Linear")
  .arguments("<state:string>")
  .option("--team <team:string>", "Team key for team-scoped resolution")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "Resolve a workflow state by exact name",
    "linear resolve workflow-state Done --team ENG",
  )
  .example(
    "Resolve a workflow state by type",
    "linear resolve workflow-state started --team ENG",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve workflow state reference",
    )
  )
  .action(async ({ json, text, team }, state: string) => {
    await runResolveCommand(
      "linear resolve workflow-state",
      { json, text },
      "Failed to resolve workflow state reference",
      () => resolveWorkflowStateReference(state, team),
      printReferenceResolution,
    )
  })
