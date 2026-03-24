import { snapshotTest } from "@cliffy/testing"
import { nextCommand } from "../../../src/commands/cycle/cycle-next.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

// Test help output
await snapshotTest({
  name: "Cycle Next Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await nextCommand.parse()
  },
})

// Test showing next cycle
await snapshotTest({
  name: "Cycle Next Command - Shows Upcoming Cycle",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }],
            },
          },
        },
      },
      {
        queryName: "GetUpcomingCycles",
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              cycles: {
                nodes: [
                  {
                    id: "cycle-2",
                    number: 43,
                    name: "Sprint 43",
                    description: "Planning for Q2 features",
                    startsAt: "2026-01-27T00:00:00Z",
                    endsAt: "2026-02-10T00:00:00Z",
                    completedAt: null,
                    isActive: false,
                    isFuture: true,
                    isPast: false,
                    progress: 0,
                    createdAt: "2026-01-15T00:00:00Z",
                    updatedAt: "2026-01-20T00:00:00Z",
                    issues: {
                      nodes: [
                        {
                          id: "issue-1",
                          identifier: "ENG-200",
                          title: "Plan Q2 roadmap",
                          state: {
                            name: "Todo",
                            type: "unstarted",
                            color: "#94a3b8",
                          },
                        },
                      ],
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

      await nextCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})

await snapshotTest({
  name: "Cycle Next Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }],
            },
          },
        },
      },
      {
        queryName: "GetUpcomingCycles",
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              cycles: {
                nodes: [
                  {
                    id: "cycle-2",
                    number: 43,
                    name: "Sprint 43",
                    description: "Planning for Q2 features",
                    startsAt: "2026-01-27T00:00:00Z",
                    endsAt: "2026-02-10T00:00:00Z",
                    completedAt: null,
                    isActive: false,
                    isFuture: true,
                    isPast: false,
                    progress: 0,
                    createdAt: "2026-01-15T00:00:00Z",
                    updatedAt: "2026-01-20T00:00:00Z",
                    issues: {
                      nodes: [
                        {
                          id: "issue-1",
                          identifier: "ENG-200",
                          title: "Plan Q2 roadmap",
                          state: {
                            name: "Todo",
                            type: "unstarted",
                            color: "#94a3b8",
                          },
                        },
                      ],
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

      await nextCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})

// Test no upcoming cycle
await snapshotTest({
  name: "Cycle Next Command - No Upcoming Cycle",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }],
            },
          },
        },
      },
      {
        queryName: "GetUpcomingCycles",
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              cycles: {
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

      await nextCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})

await snapshotTest({
  name: "Cycle Next Command - JSON No Upcoming Cycle",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }],
            },
          },
        },
      },
      {
        queryName: "GetUpcomingCycles",
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              cycles: {
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

      await nextCommand.parse()
    } finally {
      await server.stop()
      Deno.env.delete("LINEAR_GRAPHQL_ENDPOINT")
      Deno.env.delete("LINEAR_API_KEY")
    }
  },
})
