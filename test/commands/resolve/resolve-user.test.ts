import { snapshotTest } from "@cliffy/testing"
import { userCommand } from "../../../src/commands/resolve/resolve-user.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve User Command - JSON Self",
  meta: import.meta,
  colors: false,
  args: ["self", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "ResolveViewerReference",
        response: {
          data: {
            viewer: {
              id: "user-1",
              name: "alice.bot",
              displayName: "Alice Bot",
              email: "alice@example.com",
            },
          },
        },
      },
    ])

    try {
      await userCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Resolve User Command - JSON Ambiguous",
  meta: import.meta,
  colors: false,
  args: ["alice", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "ResolveUserReference",
        variables: { input: "alice" },
        response: {
          data: {
            users: {
              nodes: [
                {
                  id: "user-1",
                  email: "alice.bot@example.com",
                  displayName: "Alice Bot",
                  name: "alice.bot",
                },
                {
                  id: "user-2",
                  email: "alice.builder@example.com",
                  displayName: "Alice Builder",
                  name: "alice.builder",
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await userCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
