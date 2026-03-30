import { snapshotTest } from "@cliffy/testing"
import { listCommand } from "../../../src/commands/label/label-list.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Label List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Label List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueLabels",
        response: {
          data: {
            issueLabels: {
              nodes: [
                {
                  id: "label-1",
                  name: "backend",
                  description: "Backend work",
                  color: "#5E6AD2",
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                },
                {
                  id: "label-2",
                  name: "workspace",
                  description: null,
                  color: "#2F80ED",
                  team: null,
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      },
    ])

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
