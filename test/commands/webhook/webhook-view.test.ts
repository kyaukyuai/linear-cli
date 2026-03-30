import { viewCommand } from "../../../src/commands/webhook/webhook-view.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import { snapshotTest } from "../../utils/snapshot_with_fake_time.ts"
import { commonDenoArgs } from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Webhook View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Webhook View Command - JSON Missing Webhook Reference",
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
  name: "Webhook View Command - Shows Webhook",
  meta: import.meta,
  colors: false,
  args: ["webhook-1"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetWebhook",
        variables: { id: "webhook-1" },
        response: {
          data: {
            webhook: {
              id: "webhook-1",
              label: "Issue events",
              url: "https://example.com/hooks/issues",
              enabled: true,
              archivedAt: null,
              allPublicTeams: false,
              resourceTypes: ["Issue", "Comment"],
              createdAt: "2026-03-13T10:00:00Z",
              updatedAt: "2026-03-13T10:05:00Z",
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
  name: "Webhook View Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["webhook-1", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetWebhook",
        variables: { id: "webhook-1" },
        response: {
          data: {
            webhook: {
              id: "webhook-1",
              label: "Issue events",
              url: "https://example.com/hooks/issues",
              enabled: true,
              archivedAt: null,
              allPublicTeams: false,
              resourceTypes: ["Issue", "Comment"],
              createdAt: "2026-03-13T10:00:00Z",
              updatedAt: "2026-03-13T10:05:00Z",
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
  name: "Webhook View Command - JSON Webhook Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["webhook-missing", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const server = new MockLinearServer([
      {
        queryName: "GetWebhook",
        variables: { id: "webhook-missing" },
        response: {
          data: {
            webhook: null,
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
