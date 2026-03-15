import { snapshotTest } from "@cliffy/testing"
import { viewCommand } from "../../../src/commands/workflow-state/workflow-state-view.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Workflow State View Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await viewCommand.parse()
  },
})

await snapshotTest({
  name: "Workflow State View Command - Shows Workflow State",
  meta: import.meta,
  colors: false,
  args: ["state-2"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetWorkflowState",
        response: {
          data: {
            workflowState: {
              id: "state-2",
              name: "In Progress",
              type: "started",
              position: 1,
              color: "#00AAFF",
              description: "Actively being worked on",
              createdAt: "2026-03-10T10:00:00Z",
              updatedAt: "2026-03-11T08:00:00Z",
              archivedAt: null,
              team: {
                id: "team-1",
                key: "ENG",
                name: "Engineering",
              },
              inheritedFrom: {
                id: "template-1",
                name: "Started",
                type: "started",
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
  name: "Workflow State View Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["state-2", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetWorkflowState",
        response: {
          data: {
            workflowState: {
              id: "state-2",
              name: "In Progress",
              type: "started",
              position: 1,
              color: "#00AAFF",
              description: "Actively being worked on",
              createdAt: "2026-03-10T10:00:00Z",
              updatedAt: "2026-03-11T08:00:00Z",
              archivedAt: null,
              team: {
                id: "team-1",
                key: "ENG",
                name: "Engineering",
              },
              inheritedFrom: {
                id: "template-1",
                name: "Started",
                type: "started",
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
