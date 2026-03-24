import { snapshotTest } from "@cliffy/testing"
import { startCommand } from "../../../src/commands/issue/issue-start.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Issue Start Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await startCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Start Command - Dry Run",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--dry-run",
    "--from-ref",
    "origin/main",
    "--branch",
    "feature/eng-123-auth-hardening",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              id: "issue-123",
              identifier: "ENG-123",
              title: "Harden authentication flow",
              dueDate: null,
              description: null,
              url:
                "https://linear.app/test-team/issue/ENG-123/harden-authentication-flow",
              branchName: "eng-123-harden-authentication-flow",
              assignee: null,
              priority: 2,
              priorityLabel: "High",
              state: {
                name: "Todo",
                color: "#bec2c8",
              },
              project: null,
              projectMilestone: null,
              cycle: null,
              parent: null,
              children: {
                nodes: [],
              },
              relations: {
                nodes: [],
              },
              inverseRelations: {
                nodes: [],
              },
              attachments: {
                nodes: [],
              },
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
              id: "team-eng-id",
              key: "ENG",
              name: "Engineering",
              states: {
                nodes: [
                  {
                    id: "state-backlog",
                    name: "Backlog",
                    type: "backlog",
                    position: 0,
                    color: "#999999",
                    description: null,
                    createdAt: "2026-03-01T00:00:00Z",
                    updatedAt: "2026-03-01T00:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-eng-id",
                      key: "ENG",
                      name: "Engineering",
                    },
                    inheritedFrom: null,
                  },
                  {
                    id: "state-started",
                    name: "In Progress",
                    type: "started",
                    position: 1,
                    color: "#f87462",
                    description: null,
                    createdAt: "2026-03-01T00:00:00Z",
                    updatedAt: "2026-03-01T00:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-eng-id",
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
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await startCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
