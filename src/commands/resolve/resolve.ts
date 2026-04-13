import { Command } from "@cliffy/command"
import { issueCommand } from "./resolve-issue.ts"
import { labelCommand } from "./resolve-label.ts"
import { packCommand } from "./resolve-pack.ts"
import { teamCommand } from "./resolve-team.ts"
import { userCommand } from "./resolve-user.ts"
import { workflowStateCommand } from "./resolve-workflow-state.ts"

export const resolveCommand = new Command()
  .description("Resolve references without mutating Linear")
  .action(function () {
    this.showHelp()
  })
  .command("issue", issueCommand)
  .command("team", teamCommand)
  .command("workflow-state", workflowStateCommand)
  .command("user", userCommand)
  .command("pack", packCommand)
  .command("label", labelCommand)
