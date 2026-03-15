import { snapshotTest } from "@cliffy/testing"
import { projectLabelCommand } from "../../../src/commands/project/project-label.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Project Label Subcommand - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await projectLabelCommand.parse()
  },
})
