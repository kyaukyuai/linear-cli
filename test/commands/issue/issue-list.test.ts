import { snapshotTest as cliffySnapshotTest } from "@cliffy/testing"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { listCommand } from "../../../src/commands/issue/issue-list.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"
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

await snapshotTest({
  name: "Issue List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--all-assignees", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
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
                  url:
                    "https://linear.app/test/issue/ENG-123/fix-authentication-expiry-handling",
                  dueDate: "2025-08-25",
                  priority: 1,
                  estimate: 3,
                  assignee: {
                    id: "user-1",
                    initials: "YK",
                    name: "ykakui",
                    displayName: "Yuya Kakui",
                  },
                  state: {
                    id: "state-1",
                    name: "In Progress",
                    color: "#f87462",
                  },
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                  project: {
                    id: "project-1",
                    name: "Auth Refresh",
                    slugId: "auth-refresh",
                  },
                  parent: {
                    id: "issue-parent-1",
                    identifier: "ENG-100",
                    title: "Refresh auth platform work",
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
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      },
    ], {
      LINEAR_TEAM_ID: "ENG",
      LINEAR_ISSUE_SORT: "priority",
    })

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue List Command - All Shortcut",
  meta: import.meta,
  colors: false,
  args: ["--all", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssuesForState",
        variables: {
          sort: [
            { workflowState: { order: "Descending" } },
            {
              priority: {
                nulls: "last",
                order: "Descending",
              },
            },
            {
              manual: {
                nulls: "last",
                order: "Ascending",
              },
            },
          ],
          filter: {
            team: {
              key: {
                eq: "ENG",
              },
            },
          },
          first: 50,
        },
        response: {
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-3",
                  identifier: "ENG-125",
                  title: "Enumerate all open work",
                  url:
                    "https://linear.app/test/issue/ENG-125/enumerate-all-open-work",
                  dueDate: null,
                  priority: 2,
                  estimate: null,
                  assignee: null,
                  state: {
                    id: "state-3",
                    name: "Backlog",
                    color: "#bec2c8",
                  },
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                  project: null,
                  parent: null,
                  labels: {
                    nodes: [],
                  },
                  updatedAt: "2025-08-14T15:30:00Z",
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
    ], {
      LINEAR_TEAM_ID: "ENG",
      LINEAR_ISSUE_SORT: "priority",
    })

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue List Command - Backlog Includes Unassigned By Default",
  meta: import.meta,
  colors: false,
  args: ["--state", "backlog", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssuesForState",
        variables: {
          sort: [
            { workflowState: { order: "Descending" } },
            {
              priority: {
                nulls: "last",
                order: "Descending",
              },
            },
            {
              manual: {
                nulls: "last",
                order: "Ascending",
              },
            },
          ],
          filter: {
            and: [
              {
                team: {
                  key: {
                    eq: "ENG",
                  },
                },
              },
              {
                state: {
                  type: {
                    in: ["backlog"],
                  },
                },
              },
              {
                or: [
                  {
                    assignee: {
                      isMe: {
                        eq: true,
                      },
                    },
                  },
                  {
                    and: [
                      {
                        state: {
                          type: {
                            eq: "backlog",
                          },
                        },
                      },
                      {
                        assignee: {
                          null: true,
                        },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          first: 50,
        },
        response: {
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-2",
                  identifier: "ENG-124",
                  title: "Audit session timeout copy",
                  url:
                    "https://linear.app/test/issue/ENG-124/audit-session-timeout-copy",
                  dueDate: null,
                  priority: 4,
                  estimate: null,
                  assignee: null,
                  state: {
                    id: "state-2",
                    name: "Backlog",
                    color: "#bec2c8",
                  },
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                  project: null,
                  parent: null,
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
    ], {
      LINEAR_TEAM_ID: "ENG",
      LINEAR_ISSUE_SORT: "priority",
    })

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue List Command - All Shortcut Validation Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--all", "--assignee", "ykakui", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Issue List Command - Applies Bot Filters",
  meta: import.meta,
  colors: false,
  args: [
    "--all-assignees",
    "--all-states",
    "--project",
    "Infra",
    "--parent",
    "ENG-100",
    "--priority",
    "high",
    "--query",
    "auth",
    "--updated-before",
    "2025-08-20T00:00:00Z",
    "--due-before",
    "2025-08-31",
    "--limit",
    "1",
    "--json",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetProjectIdByName",
        variables: {
          name: "Infra",
        },
        response: {
          data: {
            projects: {
              nodes: [
                {
                  id: "project-1",
                },
              ],
            },
          },
        },
      },
      {
        queryName: "GetIssueId",
        variables: {
          id: "ENG-100",
        },
        response: {
          data: {
            issue: {
              id: "issue-parent-internal",
            },
          },
        },
      },
      {
        queryName: "GetIssuesForState",
        variables: {
          sort: [
            { workflowState: { order: "Descending" } },
            {
              priority: {
                nulls: "last",
                order: "Descending",
              },
            },
            {
              manual: {
                nulls: "last",
                order: "Ascending",
              },
            },
          ],
          filter: {
            and: [
              {
                team: {
                  key: {
                    eq: "ENG",
                  },
                },
              },
              {
                project: {
                  id: {
                    eq: "project-1",
                  },
                },
              },
              {
                or: [
                  {
                    title: {
                      containsIgnoreCase: "auth",
                    },
                  },
                  {
                    description: {
                      containsIgnoreCase: "auth",
                    },
                  },
                ],
              },
              {
                parent: {
                  id: {
                    eq: "issue-parent-internal",
                  },
                },
              },
              {
                priority: {
                  eq: 2,
                },
              },
              {
                updatedAt: {
                  lt: "2025-08-20T00:00:00Z",
                },
              },
              {
                dueDate: {
                  lt: "2025-08-31",
                },
              },
            ],
          },
          first: 1,
        },
        response: {
          data: {
            issues: {
              nodes: [],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      },
    ], {
      LINEAR_TEAM_ID: "ENG",
      LINEAR_ISSUE_SORT: "priority",
    })

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue List Command - JSON Validation Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--all-assignees", "--json", "--due-before", "2025-02-31"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([], {
      LINEAR_TEAM_ID: "ENG",
      LINEAR_ISSUE_SORT: "priority",
    })

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue List Command - JSON Parse Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--all-assignees", "--json", "--query"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})
