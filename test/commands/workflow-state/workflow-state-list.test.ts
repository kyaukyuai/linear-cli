import { snapshotTest } from "@cliffy/testing"
import { listCommand } from "../../../src/commands/workflow-state/workflow-state-list.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Workflow State List Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await listCommand.parse()
  },
})

await snapshotTest({
  name: "Workflow State List Command - Shows Workflow States",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetWorkflowStates",
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
                    name: "Backlog",
                    type: "backlog",
                    position: 0,
                    color: "#888888",
                    description: null,
                    createdAt: "2026-03-10T10:00:00Z",
                    updatedAt: "2026-03-10T10:00:00Z",
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
                    name: "In Progress",
                    type: "started",
                    position: 1,
                    color: "#00AAFF",
                    description: "Actively being worked on",
                    createdAt: "2026-03-10T10:00:00Z",
                    updatedAt: "2026-03-10T10:00:00Z",
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
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Workflow State List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["--team", "ENG", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetWorkflowStates",
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
                    name: "Backlog",
                    type: "backlog",
                    position: 0,
                    color: "#888888",
                    description: null,
                    createdAt: "2026-03-10T10:00:00Z",
                    updatedAt: "2026-03-10T10:00:00Z",
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
      await listCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Workflow State List Command - Team Not Found",
  meta: import.meta,
  colors: false,
  args: ["--team", "NOPE"],
  canFail: true,
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetWorkflowStates",
        response: {
          data: {
            team: null,
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
