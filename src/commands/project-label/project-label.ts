import { Command } from "@cliffy/command"
import { listCommand } from "./project-label-list.ts"

export const projectLabelCommand = new Command()
  .description("Manage Linear project labels")
  .action(function () {
    this.showHelp()
  })
  .command("list", listCommand)
