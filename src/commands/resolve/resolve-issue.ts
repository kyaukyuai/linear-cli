import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveIssueReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const issueCommand = new Command()
  .name("issue")
  .description("Resolve an issue reference without mutating Linear")
  .arguments("[issue:string]")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "Resolve an explicit issue identifier",
    "linear resolve issue ENG-123",
  )
  .example(
    "Resolve the current issue from VCS context",
    "linear resolve issue",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve issue reference",
    )
  )
  .action(async ({ json, text }, issue?: string) => {
    await runResolveCommand(
      "linear resolve issue",
      { json, text },
      "Failed to resolve issue reference",
      () => resolveIssueReference(issue),
    )
  })
