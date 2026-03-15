import { Command } from "@cliffy/command"
import { listCommand } from "./user-list.ts"
import { viewCommand } from "./user-view.ts"

export const userCommand = new Command()
  .description("Manage Linear users")
  .action(function () {
    this.showHelp()
  })
  .command("list", listCommand)
  .command("view", viewCommand)
