import { snapshotTest as cliffySnapshotTest } from "@cliffy/testing"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { listCommand } from "../../../src/commands/issue/issue-list.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"

// Test help output
await cliffySnapshotTest({
  name: "Issue List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Issue List Command - Shows Due Date Column",
  meta: import.meta,
  colors: false,
  args: ["--all-assignees", "--no-pager"],
  denoArgs: commonDenoArgs,
  fakeTime: "2025-08-17T15:30:00Z",
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssuesForState",
        response: {
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-1",
                  identifier: "ENG-123",
                  title: "Fix authentication expiry handling",
                  dueDate: "2025-08-25",
                  priority: 1,
                  estimate: 3,
                  assignee: {
                    initials: "YK",
                  },
                  state: {
                    id: "state-1",
                    name: "In Progress",
                    color: "#f87462",
                  },
                  labels: {
                    nodes: [
                      {
                        id: "label-1",
                        name: "backend",
                        color: "#4f46e5",
                      },
                    ],
                  },
                  updatedAt: "2025-08-16T15:30:00Z",
                },
                {
                  id: "issue-2",
                  identifier: "ENG-124",
                  title: "Audit session timeout copy",
                  dueDate: null,
                  priority: 4,
                  estimate: null,
                  assignee: null,
                  state: {
                    id: "state-2",
                    name: "Todo",
                    color: "#bec2c8",
                  },
                  labels: {
                    nodes: [],
                  },
                  updatedAt: "2025-08-15T15:30:00Z",
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
      await server.start()
      Deno.env.set("LINEAR_GRAPHQL_ENDPOINT", server.getEndpoint())
      Deno.env.set("LINEAR_API_KEY", "Bearer test-token")
      Deno.env.set("LINEAR_TEAM_ID", "ENG")
      Deno.env.set("LINEAR_ISSUE_SORT", "priority")

      await listCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
      Deno.env.delete("LINEAR_TEAM_ID")
      Deno.env.delete("LINEAR_ISSUE_SORT")
    }
  },
})
