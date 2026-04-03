import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import { resolveUserReference } from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const userCommand = new Command()
  .name("user")
  .description("Resolve a user reference without mutating Linear")
  .arguments("<user:string>")
  .option("-j, --json", "Output as JSON")
  .example(
    "Resolve the current authenticated user",
    "linear resolve user self --json",
  )
  .example(
    "Resolve a teammate by email or display name",
    "linear resolve user alice@example.com --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve user reference",
    )
  )
  .action(async ({ json }, user: string) => {
    await runResolveCommand(
      json,
      "Failed to resolve user reference",
      () => resolveUserReference(user),
    )
  })
