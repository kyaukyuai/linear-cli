import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { viewCommand } from "../../../src/commands/project/project-view.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"

const denoArgs = ["--allow-all", "--quiet"]
const fakeTime = "2025-08-17T15:30:00Z"

function projectLookupResponse(slugId: string, id?: string) {
  return {
    queryName: "GetProjectBySlug",
    variables: { slugId },
    response: {
      data: {
        projects: {
          nodes: id ? [{ id, slugId }] : [],
        },
      },
    },
  }
}

await snapshotTest({
  name: "Project View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Project View Command - JSON Missing Project Reference",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--json"],
  denoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Project View Command - With Project Details",
  meta: import.meta,
  colors: false,
  args: ["project-123"],
  denoArgs,
  fakeTime,
  async fn() {
    const server = new MockLinearServer([
      projectLookupResponse("project-123", "project-detail-id"),
      {
        queryName: "GetProjectDetails",
        variables: { id: "project-detail-id" },
        response: {
          data: {
            project: {
              id: "project-detail-id",
              name: "Authentication System Redesign",
              description:
                "Complete overhaul of the authentication system to improve security and user experience.\n\n## Goals\n- Implement OAuth 2.0 / OpenID Connect\n- Add multi-factor authentication\n- Improve password reset flow\n- Add social login options\n\n## Technical Requirements\n- JWT tokens with proper rotation\n- Rate limiting on auth endpoints\n- Audit logging for security events\n- GDPR compliance for user data",
              slugId: "auth-redesign-2024",
              icon: "🔐",
              color: "#3b82f6",
              status: {
                id: "status-started",
                name: "In Progress",
                color: "#f59e0b",
                type: "started",
              },
              creator: {
                name: "john.admin",
                displayName: "John Admin",
              },
              lead: {
                name: "jane.lead",
                displayName: "Jane Lead",
              },
              priority: 2,
              health: "onTrack",
              startDate: "2024-01-15",
              targetDate: "2024-04-30",
              startedAt: "2024-01-16T09:00:00Z",
              completedAt: null,
              canceledAt: null,
              updatedAt: "2024-01-25T14:30:00Z",
              createdAt: "2024-01-10T10:00:00Z",
              url: "https://linear.app/acme/project/auth-redesign-2024",
              teams: {
                nodes: [
                  {
                    id: "team-1",
                    key: "BACKEND",
                    name: "Backend Team",
                  },
                  {
                    id: "team-2",
                    key: "SECURITY",
                    name: "Security Team",
                  },
                ],
              },
              issues: {
                nodes: [
                  {
                    id: "issue-1",
                    identifier: "AUTH-101",
                    title: "Implement OAuth 2.0 flow",
                    state: {
                      name: "In Progress",
                      type: "started",
                    },
                  },
                  {
                    id: "issue-2",
                    identifier: "AUTH-102",
                    title: "Add MFA support",
                    state: {
                      name: "To Do",
                      type: "unstarted",
                    },
                  },
                  {
                    id: "issue-3",
                    identifier: "AUTH-103",
                    title: "Design new login UI",
                    state: {
                      name: "Done",
                      type: "completed",
                    },
                  },
                  {
                    id: "issue-4",
                    identifier: "AUTH-104",
                    title: "Security audit of current system",
                    state: {
                      name: "Canceled",
                      type: "canceled",
                    },
                  },
                ],
              },
              lastUpdate: {
                id: "update-1",
                body:
                  "Great progress this week! The OAuth implementation is nearly complete and we're on track for our Q1 delivery. The team has been collaborating well across backend and security concerns.\n\n**This week's highlights:**\n- OAuth 2.0 flow implementation 80% complete\n- MFA design reviews completed\n- Security penetration testing scheduled\n\n**Next week:**\n- Complete OAuth testing\n- Begin MFA implementation\n- Finalize UI designs",
                health: "onTrack",
                createdAt: "2024-01-22T16:00:00Z",
                user: {
                  name: "jane.lead",
                  displayName: "Jane Lead",
                },
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
  name: "Project View Command - Minimal Project",
  meta: import.meta,
  colors: false,
  args: ["minimal-project"],
  denoArgs,
  fakeTime,
  async fn() {
    const server = new MockLinearServer([
      projectLookupResponse("minimal-project", "minimal-project-id"),
      {
        queryName: "GetProjectDetails",
        variables: { id: "minimal-project-id" },
        response: {
          data: {
            project: {
              id: "minimal-project-id",
              name: "Simple Project",
              description: "",
              slugId: "simple",
              icon: null,
              color: "#64748b",
              status: {
                id: "status-backlog",
                name: "Backlog",
                color: "#94a3b8",
                type: "backlog",
              },
              creator: null,
              lead: null,
              priority: 0,
              health: null,
              startDate: null,
              targetDate: null,
              startedAt: null,
              completedAt: null,
              canceledAt: null,
              updatedAt: "2024-01-20T12:00:00Z",
              createdAt: "2024-01-20T12:00:00Z",
              url: "https://linear.app/acme/project/simple",
              teams: {
                nodes: [],
              },
              issues: {
                nodes: [],
              },
              lastUpdate: null,
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
  name: "Project View Command - JSON Project Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["missing-project", "--json"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      projectLookupResponse("missing-project"),
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
  name: "Project View Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["project-123", "--json"],
  denoArgs,
  async fn() {
    const server = new MockLinearServer([
      projectLookupResponse("project-123", "project-json-id"),
      {
        queryName: "GetProjectDetails",
        variables: { id: "project-json-id" },
        response: {
          data: {
            project: {
              id: "project-json-id",
              name: "Authentication System Redesign",
              description:
                "Complete overhaul of the authentication system to improve security and user experience.",
              slugId: "auth-redesign-2024",
              icon: "🔐",
              color: "#3b82f6",
              status: {
                id: "status-started",
                name: "In Progress",
                color: "#f59e0b",
                type: "started",
              },
              creator: {
                name: "john.admin",
                displayName: "John Admin",
              },
              lead: {
                name: "jane.lead",
                displayName: "Jane Lead",
              },
              priority: 2,
              health: "onTrack",
              startDate: "2024-01-15",
              targetDate: "2024-04-30",
              startedAt: "2024-01-16T09:00:00Z",
              completedAt: null,
              canceledAt: null,
              updatedAt: "2024-01-25T14:30:00Z",
              createdAt: "2024-01-10T10:00:00Z",
              url: "https://linear.app/acme/project/auth-redesign-2024",
              teams: {
                nodes: [
                  {
                    id: "team-1",
                    key: "BACKEND",
                    name: "Backend Team",
                  },
                ],
              },
              issues: {
                nodes: [
                  {
                    id: "issue-1",
                    identifier: "AUTH-101",
                    title: "Implement OAuth 2.0 flow",
                    state: {
                      name: "In Progress",
                      type: "started",
                    },
                  },
                  {
                    id: "issue-2",
                    identifier: "AUTH-102",
                    title: "Add MFA support",
                    state: {
                      name: "To Do",
                      type: "unstarted",
                    },
                  },
                  {
                    id: "issue-3",
                    identifier: "AUTH-103",
                    title: "Design new login UI",
                    state: {
                      name: "Done",
                      type: "completed",
                    },
                  },
                ],
              },
              lastUpdate: {
                id: "update-1",
                body: "OAuth implementation is nearly complete.",
                health: "onTrack",
                createdAt: "2024-01-22T16:00:00Z",
                user: {
                  name: "jane.lead",
                  displayName: "Jane Lead",
                },
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
