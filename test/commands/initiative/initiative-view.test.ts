import { viewCommand } from "../../../src/commands/initiative/initiative-view.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Initiative View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Initiative View Command - JSON Missing Initiative Reference",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Initiative View Command - JSON Output",
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
        queryName: "GetInitiativeDetailsForAutomationContractV5",
        variables: { id: "init-1" },
        response: {
          data: {
            initiative: {
              id: "init-1",
              slugId: "automation-contract-v5",
              name: "Automation Contract v5",
              description: "Expand remaining high-value read surfaces.",
              status: "active",
              targetDate: "2026-04-30",
              health: "onTrack",
              color: "#5E6AD2",
              icon: "rocket",
              url: "https://linear.app/test/initiative/automation-contract-v5",
              archivedAt: null,
              createdAt: "2026-03-01T00:00:00Z",
              updatedAt: "2026-03-29T00:00:00Z",
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
                    slugId: "agent-complete",
                    name: "Agent Complete Surface",
                    status: {
                      name: "Started",
                      type: "started",
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

      await viewCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})

await snapshotTest({
  name: "Initiative View Command - JSON Initiative Not Found",
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

      await viewCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})
