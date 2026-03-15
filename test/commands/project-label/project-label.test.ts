import { snapshotTest } from "@cliffy/testing"
import { projectLabelCommand } from "../../../src/commands/project-label/project-label.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Project Label Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await projectLabelCommand.parse()
  },
})
