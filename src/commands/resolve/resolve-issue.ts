import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveIssueReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const issueCommand = new Command()
  .name("issue")
  .description("Resolve an issue reference without mutating Linear")
  .arguments("[issue:string]")
  .option("-j, --json", "Output as JSON")
  .example(
    "Resolve an explicit issue identifier",
    "linear resolve issue ENG-123 --json",
  )
  .example(
    "Resolve the current issue from VCS context",
    "linear resolve issue --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve issue reference",
    )
  )
  .action(async ({ json }, issue?: string) => {
    await runResolveCommand(
      json,
      "Failed to resolve issue reference",
      () => resolveIssueReference(issue),
    )
  })
