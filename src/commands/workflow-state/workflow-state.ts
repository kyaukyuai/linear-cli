import { Command } from "@cliffy/command"
import { listCommand } from "./workflow-state-list.ts"
import { viewCommand } from "./workflow-state-view.ts"

export const workflowStateCommand = new Command()
  .description("Manage Linear workflow states")
  .action(function () {
    this.showHelp()
  })
  .command("list", listCommand)
  .command("view", viewCommand)
