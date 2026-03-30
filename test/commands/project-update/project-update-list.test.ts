import { listCommand } from "../../../src/commands/project-update/project-update-list.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Project Update List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Project Update List Command - JSON Missing Project Reference",
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
  name: "Project Update List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["agent-complete", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetProjectBySlug",
        variables: { slugId: "agent-complete" },
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-1", slugId: "agent-complete" }],
            },
          },
        },
      },
      {
        queryName: "ListProjectUpdatesForAutomationContractV5",
        variables: { id: "project-1", first: 10 },
        response: {
          data: {
            project: {
              id: "project-1",
              name: "Agent Complete Surface",
              slugId: "agent-complete",
              projectUpdates: {
                nodes: [
                  {
                    id: "update-1",
                    body: "Shipped capabilities schema metadata.",
                    health: "onTrack",
                    url: "https://linear.app/test/project-update/update-1",
                    createdAt: "2026-03-30T03:00:00Z",
                    user: {
                      name: "yuya",
                      displayName: "Yuya Kakui",
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
  name: "Project Update List Command - JSON Project Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["missing-project", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetProjectBySlug",
        variables: { slugId: "missing-project" },
        response: {
          data: {
            projects: {
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
