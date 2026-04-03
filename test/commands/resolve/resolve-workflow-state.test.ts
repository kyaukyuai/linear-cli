import { snapshotTest } from "@cliffy/testing"
import { workflowStateCommand } from "../../../src/commands/resolve/resolve-workflow-state.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve Workflow State Command - JSON Resolved",
  meta: import.meta,
  colors: false,
  args: ["Done", "--team", "ENG", "--json"],
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
      {
        queryName: "GetWorkflowStates",
        variables: { teamKey: "ENG" },
        response: {
          data: {
            team: {
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              states: {
                nodes: [
                  {
                    id: "state-1",
                    name: "Todo",
                    type: "unstarted",
                    position: 1,
                    color: "#94a3b8",
                    description: null,
                    createdAt: "2026-04-02T10:00:00Z",
                    updatedAt: "2026-04-02T10:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-1",
                      key: "ENG",
                      name: "Engineering",
                    },
                    inheritedFrom: null,
                  },
                  {
                    id: "state-2",
                    name: "Done",
                    type: "completed",
                    position: 2,
                    color: "#22c55e",
                    description: null,
                    createdAt: "2026-04-02T10:00:00Z",
                    updatedAt: "2026-04-02T10:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-1",
                      key: "ENG",
                      name: "Engineering",
                    },
                    inheritedFrom: null,
                  },
                ],
              },
            },
          },
        },
      },
    ])

    try {
      await workflowStateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Resolve Workflow State Command - JSON Missing Team Context",
  meta: import.meta,
  colors: false,
  args: ["Done", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const existingTeam = Deno.env.get("LINEAR_TEAM_ID")
    Deno.env.set("LINEAR_TEAM_ID", "")

    try {
      await workflowStateCommand.parse()
    } finally {
      if (existingTeam != null) {
        Deno.env.set("LINEAR_TEAM_ID", existingTeam)
      } else {
        Deno.env.delete("LINEAR_TEAM_ID")
      }
    }
  },
})
