import { snapshotTest } from "@cliffy/testing"
import { resolveCommand } from "../../../src/commands/resolve/resolve.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await resolveCommand.parse()
  },
})
