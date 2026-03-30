import { snapshotTest as cliffySnapshotTest } from "@cliffy/testing"
import { listCommand } from "../../../src/commands/webhook/webhook-list.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await cliffySnapshotTest({
  name: "Webhook List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Webhook List Command - JSON Validation Error",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--limit", "oops", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Webhook List Command - Shows Webhooks",
  meta: import.meta,
  colors: false,
  args: [],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetWebhooks",
        response: {
          data: {
            webhooks: {
              nodes: [
                {
                  id: "webhook-1",
                  label: "Issue events",
                  url: "https://example.com/hooks/issues",
                  enabled: true,
                  allPublicTeams: false,
                  resourceTypes: ["Issue", "Comment"],
                  createdAt: "2026-03-13T10:00:00Z",
                  updatedAt: "2026-03-13T10:00:00Z",
                  archivedAt: null,
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                  creator: {
                    id: "user-1",
                    name: "jdoe",
                    displayName: "John Doe",
                  },
                },
                {
                  id: "webhook-2",
                  label: null,
                  url: "https://example.com/hooks/public",
                  enabled: false,
                  allPublicTeams: true,
                  resourceTypes: ["Project"],
                  createdAt: "2026-03-12T08:00:00Z",
                  updatedAt: "2026-03-12T08:00:00Z",
                  archivedAt: null,
                  team: null,
                  creator: null,
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

await cliffySnapshotTest({
  name: "Webhook List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetWebhooks",
        response: {
          data: {
            webhooks: {
              nodes: [
                {
                  id: "webhook-1",
                  label: "Issue events",
                  url: "https://example.com/hooks/issues",
                  enabled: true,
                  allPublicTeams: false,
                  resourceTypes: ["Issue", "Comment"],
                  createdAt: "2026-03-13T10:00:00Z",
                  updatedAt: "2026-03-13T10:00:00Z",
                  archivedAt: null,
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                  creator: {
                    id: "user-1",
                    name: "jdoe",
                    displayName: "John Doe",
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

await snapshotTest({
  name: "Webhook List Command - JSON Team Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--team", "ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
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

await cliffySnapshotTest({
  name: "Webhook List Command - Team Filter",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-1" }],
            },
          },
        },
      },
      {
        queryName: "GetTeamWebhooks",
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              webhooks: {
                nodes: [
                  {
                    id: "webhook-1",
                    label: "Issue events",
                    url: "https://example.com/hooks/issues",
                    enabled: true,
                    allPublicTeams: false,
                    resourceTypes: ["Issue"],
                    createdAt: "2026-03-13T10:00:00Z",
                    updatedAt: "2026-03-13T10:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-1",
                      key: "ENG",
                      name: "Engineering",
                    },
                    creator: null,
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

await cliffySnapshotTest({
  name: "Webhook List Command - No Webhooks",
  meta: import.meta,
  colors: false,
  args: [],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetWebhooks",
        response: {
          data: {
            webhooks: {
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
