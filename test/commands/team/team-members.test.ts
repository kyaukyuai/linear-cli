import { snapshotTest } from "@cliffy/testing"
import { membersCommand } from "../../../src/commands/team/team-members.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Team Members Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeamMembers",
        variables: { teamKey: "ENG", first: 100, after: undefined },
        response: {
          data: {
            team: {
              members: {
                nodes: [
                  {
                    id: "user-2",
                    name: "asmith",
                    displayName: "Alice Smith",
                    email: "alice@example.com",
                    active: true,
                    initials: "AS",
                    description: "Engineer",
                    timezone: "America/Los_Angeles",
                    lastSeen: "2026-03-17T10:00:00Z",
                    statusEmoji: ":rocket:",
                    statusLabel: "Shipping",
                    guest: false,
                    isAssignable: true,
                  },
                  {
                    id: "user-1",
                    name: "jdoe",
                    displayName: "Jane Doe",
                    email: "jane@example.com",
                    active: false,
                    initials: "JD",
                    description: "PM",
                    timezone: "Asia/Tokyo",
                    lastSeen: "2026-03-16T18:30:00Z",
                    statusEmoji: null,
                    statusLabel: null,
                    guest: true,
                    isAssignable: false,
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
      },
    ])

    try {
      await membersCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Team Members Command - JSON Team Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["ENGX", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeamMembers",
        variables: { teamKey: "ENGX", first: 100, after: undefined },
        response: {
          data: {
            team: null,
          },
        },
      },
    ])

    try {
      await membersCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
