import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { listCommand } from "../../../src/commands/milestone/milestone-list.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"

await snapshotTest({
  name: "Milestone List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Milestone List Command - JSON Parse Failure",
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
  name: "Milestone List Command - With Mock Milestones",
  meta: import.meta,
  colors: false,
  args: ["--project", "project-123"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{
                id: "project-123",
                slugId: "project-123",
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectMilestones",
        variables: { projectId: "project-123" },
        response: {
          data: {
            project: {
              id: "project-123",
              name: "Test Project",
              projectMilestones: {
                nodes: [
                  {
                    id: "milestone-1",
                    name: "Infrastructure Foundation",
                    description: "Build the shared platform base",
                    targetDate: "2026-01-31",
                    sortOrder: 1,
                    createdAt: "2026-01-01T10:00:00Z",
                    updatedAt: "2026-01-05T12:00:00Z",
                    project: {
                      id: "project-123",
                      name: "Test Project",
                      slugId: "test-project",
                      url: "https://linear.app/test/project/test-project",
                    },
                  },
                  {
                    id: "milestone-2",
                    name: "Observation Phase",
                    description: null,
                    targetDate: "2026-02-28",
                    sortOrder: 2,
                    createdAt: "2026-01-06T10:00:00Z",
                    updatedAt: "2026-01-10T12:00:00Z",
                    project: {
                      id: "project-123",
                      name: "Test Project",
                      slugId: "test-project",
                      url: "https://linear.app/test/project/test-project",
                    },
                  },
                  {
                    id: "milestone-3",
                    name: "Safe Enablement",
                    description: "Roll out feature flags safely",
                    targetDate: "2026-03-31",
                    sortOrder: 3,
                    createdAt: "2026-01-11T10:00:00Z",
                    updatedAt: "2026-01-15T12:00:00Z",
                    project: {
                      id: "project-123",
                      name: "Test Project",
                      slugId: "test-project",
                      url: "https://linear.app/test/project/test-project",
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
  name: "Milestone List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--project", "project-123", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{
                id: "project-123",
                slugId: "project-123",
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectMilestones",
        variables: { projectId: "project-123" },
        response: {
          data: {
            project: {
              id: "project-123",
              name: "Test Project",
              projectMilestones: {
                nodes: [
                  {
                    id: "milestone-1",
                    name: "Infrastructure Foundation",
                    description: "Build the shared platform base",
                    targetDate: "2026-01-31",
                    sortOrder: 1,
                    createdAt: "2026-01-01T10:00:00Z",
                    updatedAt: "2026-01-05T12:00:00Z",
                    project: {
                      id: "project-123",
                      name: "Test Project",
                      slugId: "test-project",
                      url: "https://linear.app/test/project/test-project",
                    },
                  },
                  {
                    id: "milestone-2",
                    name: "Observation Phase",
                    description: null,
                    targetDate: "2026-02-28",
                    sortOrder: 2,
                    createdAt: "2026-01-06T10:00:00Z",
                    updatedAt: "2026-01-10T12:00:00Z",
                    project: {
                      id: "project-123",
                      name: "Test Project",
                      slugId: "test-project",
                      url: "https://linear.app/test/project/test-project",
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
  name: "Milestone List Command - No Milestones Found",
  meta: import.meta,
  colors: false,
  args: ["--project", "project-456"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{
                id: "project-456",
                slugId: "project-456",
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectMilestones",
        variables: { projectId: "project-456" },
        response: {
          data: {
            project: {
              id: "project-456",
              name: "Empty Project",
              projectMilestones: {
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

      await listCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})

await snapshotTest({
  name: "Milestone List Command - No Milestones Found JSON",
  meta: import.meta,
  colors: false,
  args: ["--project", "project-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetProjectBySlug",
        response: {
          data: {
            projects: {
              nodes: [{
                id: "project-456",
                slugId: "project-456",
              }],
            },
          },
        },
      },
      {
        queryName: "GetProjectMilestones",
        variables: { projectId: "project-456" },
        response: {
          data: {
            project: {
              id: "project-456",
              name: "Empty Project",
              projectMilestones: {
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

      await listCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})
