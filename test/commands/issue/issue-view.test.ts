import { snapshotTest as cliffySnapshotTest } from "@cliffy/testing"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { viewCommand } from "../../../src/commands/issue/issue-view.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"

// Common Deno args for permissions
const denoArgs = ["--allow-all", "--quiet"]
const fakeTime = "2025-08-17T15:30:00Z"

// Test help output
await cliffySnapshotTest({
  name: "Issue View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

// Test with mock GraphQL endpoint - connection refused
// NOTE: This test verifies error handling when the Linear API is unreachable.
// The error output varies by platform (different OS error codes), so we remove it.
// The important behavior (user-friendly error message on stderr) is covered by other "Not Found" tests.

// Test with working mock server - Terminal output (no comments available)
await snapshotTest({
  name: "Issue View Command - With Mock Server Terminal No Comments",
  meta: import.meta,
  colors: false,
  args: ["TEST-123"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              identifier: "TEST-123",
              title: "Fix authentication bug in login flow",
              description:
                "Users are experiencing issues logging in when their session expires. This affects the main authentication flow and needs to be resolved quickly.\n\n## Steps to reproduce\n1. Log in to the application\n2. Wait for session to expire\n3. Try to perform an authenticated action\n4. Observe the error\n\n## Expected behavior\nUser should be redirected to login page with clear messaging.\n\n## Actual behavior\nUser sees cryptic error message and gets stuck.",
              url:
                "https://linear.app/test-team/issue/TEST-123/fix-authentication-bug-in-login-flow",
              branchName: "fix/test-123-auth-bug",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              parent: null,
              children: {
                nodes: [],
              },
              comments: {
                nodes: [],
                pageInfo: {
                  hasNextPage: false,
                },
              },
              attachments: {
                nodes: [],
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

// Test with no-comments flag to disable comments
await snapshotTest({
  name: "Issue View Command - With No Comments Flag",
  meta: import.meta,
  colors: false,
  args: ["TEST-123", "--no-comments"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              identifier: "TEST-123",
              title: "Fix authentication bug in login flow",
              dueDate: "2025-08-25",
              description:
                "Users are experiencing issues logging in when their session expires.",
              url:
                "https://linear.app/test-team/issue/TEST-123/fix-authentication-bug-in-login-flow",
              branchName: "fix/test-123-auth-bug",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              parent: null,
              children: {
                nodes: [],
              },
              attachments: {
                nodes: [],
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

// Test with comments (default behavior)
await snapshotTest({
  name: "Issue View Command - With Comments Default",
  meta: import.meta,
  colors: false,
  args: ["TEST-123"],
  denoArgs,
  fakeTime,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              identifier: "TEST-123",
              title: "Fix authentication bug in login flow",
              description:
                "Users are experiencing issues logging in when their session expires.",
              url:
                "https://linear.app/test-team/issue/TEST-123/fix-authentication-bug-in-login-flow",
              branchName: "fix/test-123-auth-bug",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              parent: null,
              children: {
                nodes: [],
              },
              comments: {
                nodes: [
                  {
                    id: "comment-1",
                    body:
                      "I've reproduced this issue on staging. The session timeout seems to be too aggressive.",
                    createdAt: "2024-01-15T10:30:00Z",
                    user: {
                      name: "john.doe",
                      displayName: "John Doe",
                    },
                    externalUser: null,
                    parent: null,
                  },
                  {
                    id: "comment-2",
                    body:
                      "Working on a fix. Will increase the session timeout and add proper error handling.",
                    createdAt: "2024-01-15T14:22:00Z",
                    user: {
                      name: "jane.smith",
                      displayName: "Jane Smith",
                    },
                    externalUser: null,
                    parent: {
                      id: "comment-1",
                    },
                  },
                  {
                    id: "comment-3",
                    body:
                      "Sounds good! Also, we should add better error messaging for expired sessions.",
                    createdAt: "2024-01-15T15:10:00Z",
                    user: {
                      name: "alice.dev",
                      displayName: "Alice Developer",
                    },
                    externalUser: null,
                    parent: {
                      id: "comment-1",
                    },
                  },
                  {
                    id: "comment-4",
                    body:
                      "Should we also consider implementing automatic session refresh?",
                    createdAt: "2024-01-15T16:00:00Z",
                    user: {
                      name: "bob.senior",
                      displayName: "Bob Senior",
                    },
                    externalUser: null,
                    parent: null,
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                },
              },
              attachments: {
                nodes: [],
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

// Test with mock server - Issue not found
await snapshotTest({
  name: "Issue View Command - Issue Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["TEST-999"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "TEST-999" },
        response: {
          errors: [{
            message: "Issue not found: TEST-999",
            extensions: { code: "NOT_FOUND" },
          }],
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

// Test JSON output with no comments
await snapshotTest({
  name: "Issue View Command - JSON Output No Comments",
  meta: import.meta,
  colors: false,
  args: ["TEST-123", "--json", "--no-comments"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-123",
              identifier: "TEST-123",
              title: "Fix authentication bug in login flow",
              dueDate: "2025-08-25",
              description:
                "Users are experiencing issues logging in when their session expires.",
              url:
                "https://linear.app/test-team/issue/TEST-123/fix-authentication-bug-in-login-flow",
              branchName: "fix/test-123-auth-bug",
              assignee: {
                id: "user-1",
                name: "jane.doe",
                displayName: "Jane Doe",
                initials: "JD",
              },
              priority: 2,
              priorityLabel: "High",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: {
                name: "Auth Reliability",
              },
              projectMilestone: null,
              cycle: null,
              parent: {
                id: "issue-100",
                identifier: "TEST-100",
                title: "Epic: Security Improvements",
                url:
                  "https://linear.app/test-team/issue/TEST-100/epic-security-improvements",
                dueDate: null,
                state: {
                  name: "Backlog",
                  color: "#bec2c8",
                },
              },
              children: {
                nodes: [],
              },
              comments: {
                nodes: [
                  {
                    id: "comment-1",
                    body:
                      "I've reproduced this issue on staging. The session timeout seems to be too aggressive.",
                    createdAt: "2024-01-15T10:30:00Z",
                    user: {
                      name: "john.doe",
                      displayName: "John Doe",
                    },
                    externalUser: null,
                    parent: null,
                  },
                  {
                    id: "comment-2",
                    body:
                      "Working on a fix. Will increase the session timeout and add proper error handling.",
                    createdAt: "2024-01-15T14:22:00Z",
                    user: {
                      name: "jane.doe",
                      displayName: "Jane Doe",
                    },
                    externalUser: null,
                    parent: {
                      id: "comment-1",
                    },
                  },
                ],
                pageInfo: {
                  hasNextPage: false,
                },
              },
              relations: {
                nodes: [
                  {
                    id: "relation-1",
                    type: "blocks",
                    relatedIssue: {
                      id: "issue-200",
                      identifier: "TEST-200",
                      title: "Update session middleware",
                      url:
                        "https://linear.app/test-team/issue/TEST-200/update-session-middleware",
                      dueDate: "2025-08-20",
                      state: {
                        name: "Todo",
                        color: "#bec2c8",
                      },
                    },
                  },
                  {
                    id: "relation-2",
                    type: "related",
                    relatedIssue: {
                      id: "issue-201",
                      identifier: "TEST-201",
                      title: "Improve auth logging",
                      url:
                        "https://linear.app/test-team/issue/TEST-201/improve-auth-logging",
                      dueDate: null,
                      state: {
                        name: "In Progress",
                        color: "#f87462",
                      },
                    },
                  },
                  {
                    id: "relation-3",
                    type: "duplicate",
                    relatedIssue: {
                      id: "issue-202",
                      identifier: "TEST-202",
                      title: "Older auth bug report",
                      url:
                        "https://linear.app/test-team/issue/TEST-202/older-auth-bug-report",
                      dueDate: null,
                      state: {
                        name: "Canceled",
                        color: "#bec2c8",
                      },
                    },
                  },
                ],
              },
              inverseRelations: {
                nodes: [
                  {
                    id: "relation-4",
                    type: "blocks",
                    issue: {
                      id: "issue-203",
                      identifier: "TEST-203",
                      title: "Investigate auth regression",
                      url:
                        "https://linear.app/test-team/issue/TEST-203/investigate-auth-regression",
                      dueDate: "2025-08-19",
                      state: {
                        name: "Started",
                        color: "#f87462",
                      },
                    },
                  },
                  {
                    id: "relation-5",
                    type: "related",
                    issue: {
                      id: "issue-204",
                      identifier: "TEST-204",
                      title: "Token refresh edge cases",
                      url:
                        "https://linear.app/test-team/issue/TEST-204/token-refresh-edge-cases",
                      dueDate: null,
                      state: {
                        name: "Backlog",
                        color: "#bec2c8",
                      },
                    },
                  },
                  {
                    id: "relation-6",
                    type: "duplicate",
                    issue: {
                      id: "issue-205",
                      identifier: "TEST-205",
                      title: "Duplicate auth bug follow-up",
                      url:
                        "https://linear.app/test-team/issue/TEST-205/duplicate-auth-bug-follow-up",
                      dueDate: null,
                      state: {
                        name: "Done",
                        color: "#4cb782",
                      },
                    },
                  },
                ],
              },
              attachments: {
                nodes: [],
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

// Test JSON output with comments
await snapshotTest({
  name: "Issue View Command - JSON Output With Comments",
  meta: import.meta,
  colors: false,
  args: ["TEST-123", "--json"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-123",
              identifier: "TEST-123",
              title: "Fix authentication bug in login flow",
              dueDate: "2025-08-25",
              description:
                "Users are experiencing issues logging in when their session expires.",
              url:
                "https://linear.app/test-team/issue/TEST-123/fix-authentication-bug-in-login-flow",
              branchName: "fix/test-123-auth-bug",
              assignee: {
                id: "user-2",
                name: "alex.dev",
                displayName: "Alex Developer",
                initials: "AD",
              },
              priority: 1,
              priorityLabel: "Urgent",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              cycle: {
                name: "Sprint 12",
                number: 12,
              },
              parent: null,
              children: {
                nodes: [],
              },
              comments: {
                nodes: [
                  {
                    id: "comment-1",
                    body:
                      "I've reproduced this issue on staging. The session timeout seems to be too aggressive.",
                    createdAt: "2024-01-15T10:30:00Z",
                    user: {
                      name: "john.doe",
                      displayName: "John Doe",
                    },
                    externalUser: null,
                    parent: null,
                  },
                  {
                    id: "comment-2",
                    body:
                      "Working on a fix. Will increase the session timeout and add proper error handling.",
                    createdAt: "2024-01-15T14:22:00Z",
                    user: {
                      name: "jane.smith",
                      displayName: "Jane Smith",
                    },
                    externalUser: null,
                    parent: {
                      id: "comment-1",
                    },
                  },
                ],
                pageInfo: {
                  hasNextPage: true,
                },
              },
              relations: {
                nodes: [
                  {
                    id: "relation-7",
                    type: "related",
                    relatedIssue: {
                      id: "issue-301",
                      identifier: "TEST-301",
                      title: "Session timeout audit",
                      url:
                        "https://linear.app/test-team/issue/TEST-301/session-timeout-audit",
                      dueDate: null,
                      state: {
                        name: "Todo",
                        color: "#bec2c8",
                      },
                    },
                  },
                ],
              },
              inverseRelations: {
                nodes: [],
              },
              attachments: {
                nodes: [],
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

// Test with parent and sub-issues
await snapshotTest({
  name: "Issue View Command - With Parent And Sub-issues",
  meta: import.meta,
  colors: false,
  args: ["TEST-456", "--no-comments"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "TEST-456" },
        response: {
          data: {
            issue: {
              identifier: "TEST-456",
              title: "Implement user authentication",
              description: "Add user authentication to the application.",
              url:
                "https://linear.app/test-team/issue/TEST-456/implement-user-authentication",
              branchName: "feat/test-456-auth",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              parent: {
                identifier: "TEST-100",
                title: "Epic: Security Improvements",
                state: {
                  name: "In Progress",
                  color: "#f87462",
                },
              },
              children: {
                nodes: [
                  {
                    identifier: "TEST-457",
                    title: "Add login form",
                    state: {
                      name: "Done",
                      color: "#4cb782",
                    },
                  },
                  {
                    identifier: "TEST-458",
                    title: "Add password reset flow",
                    state: {
                      name: "Todo",
                      color: "#bec2c8",
                    },
                  },
                  {
                    identifier: "TEST-459",
                    title: "Add OAuth support",
                    state: {
                      name: "In Progress",
                      color: "#f87462",
                    },
                  },
                ],
              },
              attachments: {
                nodes: [],
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

// Test with project and milestone
await snapshotTest({
  name: "Issue View Command - With Project And Milestone",
  meta: import.meta,
  colors: false,
  args: ["TEST-789", "--no-comments"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "TEST-789" },
        response: {
          data: {
            issue: {
              identifier: "TEST-789",
              title: "Add monitoring dashboards",
              dueDate: "2025-08-31",
              description: "Set up Datadog dashboards for the new service.",
              url:
                "https://linear.app/test-team/issue/TEST-789/add-monitoring-dashboards",
              branchName: "feat/test-789-monitoring",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: {
                name: "Platform Infrastructure Q1",
              },
              projectMilestone: {
                name: "Phase 2: Observability",
              },
              parent: null,
              children: {
                nodes: [],
              },
              attachments: {
                nodes: [],
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

// Test with cycle
await snapshotTest({
  name: "Issue View Command - With Cycle",
  meta: import.meta,
  colors: false,
  args: ["TEST-890", "--no-comments"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "TEST-890" },
        response: {
          data: {
            issue: {
              identifier: "TEST-890",
              title: "Implement rate limiting",
              description: "Add rate limiting to the API gateway.",
              url:
                "https://linear.app/test-team/issue/TEST-890/implement-rate-limiting",
              branchName: "feat/test-890-rate-limiting",
              state: {
                name: "Todo",
                color: "#e2e2e2",
              },
              project: {
                name: "API Gateway v2",
              },
              projectMilestone: null,
              cycle: {
                name: "Sprint 7",
                number: 7,
              },
              parent: null,
              children: {
                nodes: [],
              },
              attachments: {
                nodes: [],
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
