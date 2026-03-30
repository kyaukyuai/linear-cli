import { listCommand } from "../../../src/commands/initiative-update/initiative-update-list.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Initiative Update List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Initiative Update List Command - JSON Missing Initiative Reference",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Initiative Update List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["automation-contract-v5", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetInitiativeBySlugForStatusUpdate",
        variables: { slugId: "automation-contract-v5" },
        response: {
          data: {
            initiatives: {
              nodes: [{ id: "init-1" }],
            },
          },
        },
      },
      {
        queryName: "ListInitiativeUpdatesForAutomationContractV5",
        variables: { id: "init-1", first: 10 },
        response: {
          data: {
            initiative: {
              id: "init-1",
              name: "Automation Contract v5",
              slugId: "automation-contract-v5",
              initiativeUpdates: {
                nodes: [
                  {
                    id: "initiative-update-1",
                    body: "Expanded initiative and project-update reads.",
                    health: "onTrack",
                    url:
                      "https://linear.app/test/initiative-update/initiative-update-1",
                    createdAt: "2026-03-30T05:00:00Z",
                    user: {
                      name: "yuya",
                    },
                  },
                ],
              },
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

await snapshotTest({
  name: "Initiative Update List Command - JSON Initiative Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["missing-initiative", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetInitiativeBySlugForStatusUpdate",
        variables: { slugId: "missing-initiative" },
        response: {
          data: {
            initiatives: {
              nodes: [],
            },
          },
        },
      },
      {
        queryName: "GetInitiativeByNameForStatusUpdate",
        variables: { name: "missing-initiative" },
        response: {
          data: {
            initiatives: {
              nodes: [],
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
