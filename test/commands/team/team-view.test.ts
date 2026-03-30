import { snapshotTest } from "@cliffy/testing"
import { viewCommand } from "../../../src/commands/team/team-view.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Team View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Team View Command - Shows Team",
  meta: import.meta,
  colors: false,
  args: ["ENG"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeam",
        variables: { id: "ENG" },
        response: {
          data: {
            team: {
              id: "team-1",
              name: "Engineering",
              key: "ENG",
              description: "Builds the product",
              icon: "🛠️",
              color: "#3b82f6",
              cyclesEnabled: true,
              createdAt: "2026-03-10T10:00:00Z",
              updatedAt: "2026-03-15T11:00:00Z",
              archivedAt: null,
              organization: {
                id: "org-1",
                name: "Kyaukyuai",
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
  name: "Team View Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeam",
        variables: { id: "ENG" },
        response: {
          data: {
            team: {
              id: "team-1",
              name: "Engineering",
              key: "ENG",
              description: "Builds the product",
              icon: "🛠️",
              color: "#3b82f6",
              cyclesEnabled: true,
              createdAt: "2026-03-10T10:00:00Z",
              updatedAt: "2026-03-15T11:00:00Z",
              archivedAt: null,
              organization: {
                id: "org-1",
                name: "Kyaukyuai",
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
  name: "Team View Command - JSON Team Not Found",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["NOPE", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeam",
        variables: { id: "NOPE" },
        response: {
          data: {
            team: null,
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
