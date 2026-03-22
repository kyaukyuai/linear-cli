import { snapshotTest } from "@cliffy/testing"
import { updateCommand } from "../../../src/commands/issue/issue-update.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

// Test help output
await snapshotTest({
  name: "Issue Update Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await updateCommand.parse()
  },
})

// Test updating an issue with flags (happy path)
await snapshotTest({
  name: "Issue Update Command - Happy Path",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--title",
    "Updated authentication bug fix",
    "--description",
    "Updated description for login issues",
    "--assignee",
    "self",
    "--priority",
    "1",
    "--estimate",
    "5",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      // Mock response for getTeamIdByKey() - converting team key to ID
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      // Mock response for lookupUserId("self") - resolves to viewer
      {
        queryName: "GetViewerId",
        variables: {},
        response: {
          data: {
            viewer: {
              id: "user-self-123",
            },
          },
        },
      },
      // Mock response for the update issue mutation
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-authentication-bug-fix",
                title: "Updated authentication bug fix",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Update Command - Accepts No Interactive Flag",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--no-interactive",
    "--title",
    "Updated without prompts",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-without-prompts",
                title: "Updated without prompts",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Update Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--title",
    "Updated from bot",
    "--due-date",
    "2026-04-01",
    "--assignee",
    "self",
    "--comment",
    "Investigating now",
    "--json",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      {
        queryName: "GetViewerId",
        variables: {},
        response: {
          data: {
            viewer: {
              id: "user-self-123",
            },
          },
        },
      },
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                title: "Updated from bot",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-from-bot",
                dueDate: "2026-04-01",
                assignee: {
                  id: "user-self-123",
                  name: "alice.bot",
                  displayName: "Alice Bot",
                  initials: "AB",
                },
                parent: {
                  id: "parent-issue-id",
                  identifier: "ENG-100",
                  title: "Parent Epic",
                  url: "https://linear.app/test-team/issue/ENG-100/parent-epic",
                  dueDate: null,
                  state: {
                    name: "In Progress",
                    color: "#f87462",
                  },
                },
                state: {
                  name: "Todo",
                  color: "#bec2c8",
                },
              },
            },
          },
        },
      },
      {
        queryName: "AddComment",
        response: {
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: "comment-json-123",
                body: "Investigating now",
                createdAt: "2026-03-22T12:45:00Z",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-from-bot#comment-json-123",
                parent: null,
                issue: {
                  id: "issue-existing-123",
                  identifier: "ENG-123",
                  title: "Updated from bot",
                  url:
                    "https://linear.app/test-team/issue/ENG-123/updated-from-bot",
                },
                user: {
                  name: "alice.bot",
                  displayName: "Alice Bot",
                },
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Update Command - With Comment",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--state",
    "started",
    "--comment",
    "Work has started",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
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
              states: {
                nodes: [
                  {
                    id: "state-started-id",
                    name: "In Progress",
                    type: "started",
                  },
                ],
              },
            },
          },
        },
      },
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                title: "Test Issue",
                url: "https://linear.app/test-team/issue/ENG-123/test-issue",
              },
            },
          },
        },
      },
      {
        queryName: "AddComment",
        response: {
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: "comment-123",
                body: "Work has started",
                createdAt: "2026-03-22T12:50:00Z",
                url:
                  "https://linear.app/test-team/issue/ENG-123/test-issue#comment-123",
                user: {
                  name: "alice.bot",
                  displayName: "Alice Bot",
                },
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test updating an issue with milestone
await snapshotTest({
  name: "Issue Update Command - With Milestone",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--project",
    "My Project",
    "--milestone",
    "Phase 1",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      // Mock response for getTeamIdByKey()
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      // Mock response for getProjectIdByName()
      {
        queryName: "GetProjectIdByName",
        variables: { name: "My Project" },
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-123" }],
            },
          },
        },
      },
      // Mock response for getMilestoneIdByName()
      {
        queryName: "GetProjectMilestonesForLookup",
        variables: { projectId: "project-123" },
        response: {
          data: {
            project: {
              projectMilestones: {
                nodes: [
                  { id: "milestone-1", name: "Phase 1" },
                  { id: "milestone-2", name: "Phase 2" },
                ],
              },
            },
          },
        },
      },
      // Mock response for the update issue mutation
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url: "https://linear.app/test-team/issue/ENG-123/test-issue",
                title: "Test Issue",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test updating an issue with case-insensitive label matching
await snapshotTest({
  name: "Issue Update Command - Case Insensitive Label Matching",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--label",
    "FRONTEND", // uppercase label that should match "frontend" label
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      // Mock response for getTeamIdByKey() - converting team key to ID
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      // Mock response for getIssueLabelIdByNameForTeam("FRONTEND", "ENG") - case insensitive
      {
        queryName: "GetIssueLabelIdByNameForTeam",
        variables: { name: "FRONTEND", teamKey: "ENG" },
        response: {
          data: {
            issueLabels: {
              nodes: [{
                id: "label-frontend-456",
                name: "frontend", // actual label is lowercase
              }],
            },
          },
        },
      },
      // Mock response for the update issue mutation
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url: "https://linear.app/test-team/issue/ENG-123/test-issue",
                title: "Test Issue",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test that -p is priority (not parent), resolving the flag conflict
await snapshotTest({
  name: "Issue Update Command - Short Flag -p Is Priority",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "-p",
    "2",
    "--parent",
    "ENG-220",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      // Mock response for getTeamIdByKey()
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      // Mock response for getIssueId("ENG-220") - resolves parent identifier to ID
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-220" },
        response: {
          data: {
            issue: {
              id: "parent-issue-id",
            },
          },
        },
      },
      // Mock response for the update issue mutation
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url: "https://linear.app/test-team/issue/ENG-123/test-issue",
                title: "Test Issue",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test updating an issue with cycle
await snapshotTest({
  name: "Issue Update Command - With Cycle",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--cycle",
    "Sprint 7",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      // Mock response for getTeamIdByKey()
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      // Mock response for getCycleIdByNameOrNumber()
      {
        queryName: "GetTeamCyclesForLookup",
        variables: { teamId: "team-eng-id" },
        response: {
          data: {
            team: {
              cycles: {
                nodes: [
                  { id: "cycle-1", number: 7, name: "Sprint 7" },
                  { id: "cycle-2", number: 8, name: "Sprint 8" },
                ],
              },
              activeCycle: { id: "cycle-1", number: 7, name: "Sprint 7" },
            },
          },
        },
      },
      // Mock response for the update issue mutation
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url: "https://linear.app/test-team/issue/ENG-123/test-issue",
                title: "Test Issue",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Update Command - Clear Due Date",
  meta: import.meta,
  colors: false,
  args: [
    "ENG-123",
    "--clear-due-date",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                url: "https://linear.app/test-team/issue/ENG-123/test-issue",
                title: "Test Issue",
              },
            },
          },
        },
      },
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Update Command - Due Date Conflict",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: [
    "ENG-123",
    "--due-date",
    "2026-03-31",
    "--clear-due-date",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    await updateCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Update Command - JSON Due Date Conflict",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: [
    "ENG-123",
    "--due-date",
    "2026-03-31",
    "--clear-due-date",
    "--json",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    await updateCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Update Command - JSON Comment Requires Updates",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: [
    "ENG-123",
    "--comment",
    "Standalone comment",
    "--json",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    await updateCommand.parse()
  },
})
