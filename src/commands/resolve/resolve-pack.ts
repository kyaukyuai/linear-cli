import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import {
  printContextPackResolution,
  resolveContextPack,
} from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const packCommand = new Command()
  .name("pack")
  .description("Resolve a multi-entity context pack without mutating Linear")
  .option("--issue <issue:string>", "Issue identifier or numeric issue ref")
  .option("--team <team:string>", "Team key for explicit team context")
  .option(
    "--workflow-state <state:string>",
    "Workflow state name, type, or ID within the active team context",
  )
  .option("--user <user:string>", "User email, display name, or self")
  .option("--project <project:string>", "Project ID or slug")
  .option(
    "--label <label:string>",
    "Issue label name. May be repeated.",
    { collect: true },
  )
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "Resolve an issue-scoped pack for triage planning",
    "linear resolve pack --issue ENG-123 --workflow-state started --label Bug --json",
  )
  .example(
    "Resolve a user and project pack",
    "linear resolve pack --user self --project auth-refresh --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve context pack",
    )
  )
  .action(
    async (
      { issue, json, label, project, team, text, user, workflowState },
    ) => {
      await runResolveCommand(
        "linear resolve pack",
        { json, text },
        "Failed to resolve context pack",
        () =>
          resolveContextPack({
            issue,
            team,
            workflowState,
            user,
            project,
            labels: label,
          }),
        printContextPackResolution,
      )
    },
  )
