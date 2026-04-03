import { snapshotTest } from "@cliffy/testing"
import { teamCommand } from "../../../src/commands/resolve/resolve-team.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve Team Command - JSON Resolved",
  meta: import.meta,
  colors: false,
  args: ["ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "ResolveTeamReference",
        variables: { id: "ENG" },
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
            },
          },
        },
      },
    ])

    try {
      await teamCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Resolve Team Command - JSON Configured Team Fallback",
  meta: import.meta,
  colors: false,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer(
      [
        {
          queryName: "ResolveTeamReference",
          variables: { id: "ENG" },
          response: {
            data: {
              team: {
                id: "team-1",
                key: "ENG",
                name: "Engineering",
              },
            },
          },
        },
      ],
      { LINEAR_TEAM_ID: "ENG" },
    )

    try {
      await teamCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
