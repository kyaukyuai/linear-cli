import { snapshotTest } from "@cliffy/testing"
import { labelCommand } from "../../../src/commands/resolve/resolve-label.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve Label Command - JSON Ambiguous",
  meta: import.meta,
  colors: false,
  args: ["Bug", "--team", "ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "ResolveTeamReference",
        variables: { id: "ENG" },
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
            },
          },
        },
      },
      {
        queryName: "ResolveIssueLabelReference",
        variables: { name: "Bug", teamKey: "ENG" },
        response: {
          data: {
            issueLabels: {
              nodes: [
                {
                  id: "label-1",
                  name: "Bug",
                  color: "#ef4444",
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                },
                {
                  id: "label-2",
                  name: "Bug",
                  color: "#f97316",
                  team: null,
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await labelCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
