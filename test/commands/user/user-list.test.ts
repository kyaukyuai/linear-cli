import { snapshotTest } from "@cliffy/testing"
import { listCommand } from "../../../src/commands/user/user-list.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "User List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "User List Command - Shows Users",
  meta: import.meta,
  colors: false,
  args: [],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetUsers",
        response: {
          data: {
            users: {
              nodes: [
                {
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
                },
                {
                  id: "user-2",
                  name: "contractor",
                  displayName: "Contractor",
                  email: "contractor@example.com",
                  active: false,
                  guest: true,
                  app: false,
                  isAssignable: false,
                  isMentionable: true,
                  description: null,
                  statusEmoji: null,
                  statusLabel: null,
                  timezone: null,
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "User List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetUsers",
        response: {
          data: {
            users: {
              nodes: [
                {
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
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "User List Command - Includes Disabled With All",
  meta: import.meta,
  colors: false,
  args: ["--all"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetUsers",
        variables: {
          first: 50,
          includeDisabled: true,
        },
        response: {
          data: {
            users: {
              nodes: [
                {
                  id: "user-2",
                  name: "contractor",
                  displayName: "Contractor",
                  email: "contractor@example.com",
                  active: false,
                  guest: true,
                  app: false,
                  isAssignable: false,
                  isMentionable: true,
                  description: null,
                  statusEmoji: null,
                  statusLabel: null,
                  timezone: null,
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "User List Command - JSON Invalid Limit",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--json", "--limit", "0"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})
