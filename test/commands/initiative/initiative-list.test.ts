import { listCommand } from "../../../src/commands/initiative/initiative-list.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Initiative List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Initiative List Command - JSON Validation Error",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--status", "unknown", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Initiative List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetInitiativesForAutomationContractV5",
        variables: {
          filter: { status: { eq: "Active" } },
          includeArchived: false,
        },
        response: {
          data: {
            initiatives: {
              nodes: [
                {
                  id: "init-1",
                  slugId: "automation-contract-v5",
                  name: "Automation Contract v5",
                  description: "Expand remaining high-value read surfaces.",
                  status: "Active",
                  targetDate: "2026-04-30",
                  health: "onTrack",
                  color: "#5E6AD2",
                  icon: "rocket",
                  url:
                    "https://linear.app/test/initiative/automation-contract-v5",
                  archivedAt: null,
                  owner: {
                    id: "user-1",
                    name: "yuya",
                    displayName: "Yuya Kakui",
                    initials: "YK",
                  },
                  projects: {
                    nodes: [
                      {
                        id: "project-1",
                        name: "linear-cli Agent-Complete Surface",
                        status: { name: "Started" },
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await server.start()
      Deno.env.set("LINEAR_GRAPHQL_ENDPOINT", server.getEndpoint())
      Deno.env.set("LINEAR_API_KEY", "Bearer test-token")

      await listCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})
