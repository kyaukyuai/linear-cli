import { snapshotTest } from "@cliffy/testing"
import { viewCommand } from "../../../src/commands/user/user-view.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "User View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "User View Command - Shows User",
  meta: import.meta,
  colors: false,
  args: ["user-1"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetUser",
        response: {
          data: {
            user: {
              id: "user-1",
              name: "jdoe",
              displayName: "John Doe",
              email: "john@example.com",
              active: true,
              guest: false,
              app: false,
              isAssignable: true,
              isMentionable: true,
              description: "Staff Engineer",
              statusEmoji: ":hammer:",
              statusLabel: "Shipping",
              timezone: "Asia/Tokyo",
              lastSeen: "2026-03-15T12:00:00Z",
              createdAt: "2026-03-10T09:00:00Z",
              updatedAt: "2026-03-15T12:00:00Z",
              archivedAt: null,
              url: "https://linear.app/kyaukyuai/user/jdoe",
              organization: {
                name: "Kyaukyuai",
                urlKey: "kyaukyuai",
              },
            },
          },
        },
      },
    ])

    try {
      await viewCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "User View Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["user-1", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetUser",
        response: {
          data: {
            user: {
              id: "user-1",
              name: "jdoe",
              displayName: "John Doe",
              email: "john@example.com",
              active: true,
              guest: false,
              app: false,
              isAssignable: true,
              isMentionable: true,
              description: "Staff Engineer",
              statusEmoji: ":hammer:",
              statusLabel: "Shipping",
              timezone: "Asia/Tokyo",
              lastSeen: "2026-03-15T12:00:00Z",
              createdAt: "2026-03-10T09:00:00Z",
              updatedAt: "2026-03-15T12:00:00Z",
              archivedAt: null,
              url: "https://linear.app/kyaukyuai/user/jdoe",
              organization: {
                name: "Kyaukyuai",
                urlKey: "kyaukyuai",
              },
            },
          },
        },
      },
    ])

    try {
      await viewCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "User View Command - JSON User Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["missing-user", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetUser",
        variables: { id: "missing-user" },
        response: {
          data: {
            user: null,
          },
        },
      },
    ])

    try {
      await viewCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
