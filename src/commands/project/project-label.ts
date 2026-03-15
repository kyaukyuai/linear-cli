import { Command } from "@cliffy/command"
import { addLabelCommand } from "./project-label-add.ts"
import { removeLabelCommand } from "./project-label-remove.ts"

export const projectLabelCommand = new Command()
  .description("Manage project labels on a project")
  .action(function () {
    this.showHelp()
  })
  .command("add", addLabelCommand)
  .command("remove", removeLabelCommand)
