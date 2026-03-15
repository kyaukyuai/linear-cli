import { snapshotTest } from "@cliffy/testing"
import { userCommand } from "../../../src/commands/user/user.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "User Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await userCommand.parse()
  },
})
