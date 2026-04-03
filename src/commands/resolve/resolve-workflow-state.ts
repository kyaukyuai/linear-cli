import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveWorkflowStateReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const workflowStateCommand = new Command()
  .name("workflow-state")
  .description("Resolve a workflow state reference without mutating Linear")
  .arguments("<state:string>")
  .option("--team <team:string>", "Team key for team-scoped resolution")
  .option("-j, --json", "Output as JSON")
  .example(
    "Resolve a workflow state by exact name",
    "linear resolve workflow-state Done --team ENG --json",
  )
  .example(
    "Resolve a workflow state by type",
    "linear resolve workflow-state started --team ENG --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve workflow state reference",
    )
  )
  .action(async ({ json, team }, state: string) => {
    await runResolveCommand(
      json,
      "Failed to resolve workflow state reference",
      () => resolveWorkflowStateReference(state, team),
    )
  })
