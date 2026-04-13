import { Command } from "@cliffy/command"
import { handleAutomationContractParseError } from "../../utils/json_output.ts"
import {
  printReferenceResolution,
  resolveUserReference,
} from "../../utils/reference_resolution.ts"
import { runResolveCommand } from "./resolve-common.ts"

export const userCommand = new Command()
  .name("user")
  .description("Resolve a user reference without mutating Linear")
  .arguments("<user:string>")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "Resolve the current authenticated user",
    "linear resolve user self",
  )
  .example(
    "Resolve a teammate by email or display name",
    "linear resolve user alice@example.com",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to resolve user reference",
    )
  )
  .action(async ({ json, text }, user: string) => {
    await runResolveCommand(
      "linear resolve user",
      { json, text },
      "Failed to resolve user reference",
      () => resolveUserReference(user),
      printReferenceResolution,
    )
  })
