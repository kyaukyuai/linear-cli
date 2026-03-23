import { snapshotTest } from "@cliffy/testing"
import { createBatchCommand } from "../../../src/commands/issue/issue-create-batch.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Issue Create Batch Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await createBatchCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Create Batch Command - JSON Output",
  meta: import.meta,
  colors: false,
  denoArgs: commonDenoArgs,
  async fn() {
    const batchFile = await Deno.makeTempFile({ suffix: ".json" })
    await Deno.writeTextFile(
      batchFile,
      JSON.stringify({
        team: "ENG",
        project: "Roadmap",
        parent: {
          title: "Manager bot rollout",
          description: "Coordinate rollout work",
          assignee: "self",
          state: "started",
          priority: 2,
          labels: ["automation"],
        },
        children: [
          {
            title: "Add issue list JSON",
            description: "Expose machine-readable list output",
            assignee: "self",
          },
          {
            title: "Add issue view JSON",
            dueDate: "2026-04-15",
            priority: 3,
          },
        ],
      }),
    )

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
        queryName: "GetProjectIdByName",
        variables: { name: "Roadmap" },
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-roadmap-id" }],
            },
          },
        },
      },
      {
        queryName: "GetViewerId",
        response: {
          data: {
            viewer: {
              id: "user-self-123",
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
      {
        queryName: "GetIssueLabelIdByNameForTeam",
        variables: { name: "automation", teamKey: "ENG" },
        response: {
          data: {
            issueLabels: {
              nodes: [{ id: "label-automation-id", name: "automation" }],
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Manager bot rollout",
            description: "Coordinate rollout work",
            assigneeId: "user-self-123",
            priority: 2,
            labelIds: ["label-automation-id"],
            teamId: "team-eng-id",
            projectId: "project-roadmap-id",
            stateId: "state-started",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-parent-500",
                identifier: "ENG-500",
                title: "Manager bot rollout",
                url:
                  "https://linear.app/test-team/issue/ENG-500/manager-bot-rollout",
                dueDate: null,
                assignee: {
                  id: "user-self-123",
                  name: "alice.bot",
                  displayName: "Alice Bot",
                  initials: "AB",
                },
                parent: null,
                state: {
                  name: "In Progress",
                  color: "#f87462",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Add issue list JSON",
            description: "Expose machine-readable list output",
            assigneeId: "user-self-123",
            parentId: "issue-parent-500",
            labelIds: [],
            teamId: "team-eng-id",
            projectId: "project-roadmap-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-child-501",
                identifier: "ENG-501",
                title: "Add issue list JSON",
                url:
                  "https://linear.app/test-team/issue/ENG-501/add-issue-list-json",
                dueDate: null,
                assignee: {
                  id: "user-self-123",
                  name: "alice.bot",
                  displayName: "Alice Bot",
                  initials: "AB",
                },
                parent: {
                  id: "issue-parent-500",
                  identifier: "ENG-500",
                  title: "Manager bot rollout",
                  url:
                    "https://linear.app/test-team/issue/ENG-500/manager-bot-rollout",
                  dueDate: null,
                  state: {
                    name: "In Progress",
                    color: "#f87462",
                  },
                },
                state: {
                  name: "Todo",
                  color: "#cccccc",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Add issue view JSON",
            dueDate: "2026-04-15",
            parentId: "issue-parent-500",
            priority: 3,
            labelIds: [],
            teamId: "team-eng-id",
            projectId: "project-roadmap-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-child-502",
                identifier: "ENG-502",
                title: "Add issue view JSON",
                url:
                  "https://linear.app/test-team/issue/ENG-502/add-issue-view-json",
                dueDate: "2026-04-15",
                assignee: null,
                parent: {
                  id: "issue-parent-500",
                  identifier: "ENG-500",
                  title: "Manager bot rollout",
                  url:
                    "https://linear.app/test-team/issue/ENG-500/manager-bot-rollout",
                  dueDate: null,
                  state: {
                    name: "In Progress",
                    color: "#f87462",
                  },
                },
                state: {
                  name: "Todo",
                  color: "#cccccc",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
    ])

    try {
      await createBatchCommand.parse(["--file", batchFile, "--json"])
    } finally {
      await cleanup()
      await Deno.remove(batchFile)
    }
  },
})

await snapshotTest({
  name: "Issue Create Batch Command - JSON Dry Run",
  meta: import.meta,
  colors: false,
  denoArgs: commonDenoArgs,
  async fn() {
    const batchFile = await Deno.makeTempFile({ suffix: ".json" })
    await Deno.writeTextFile(
      batchFile,
      JSON.stringify({
        team: "ENG",
        project: "Roadmap",
        parent: {
          title: "Manager bot rollout",
          description: "Coordinate rollout work",
          assignee: "self",
          state: "started",
          priority: 2,
          labels: ["automation"],
        },
        children: [
          {
            title: "Add issue list JSON",
            description: "Expose machine-readable list output",
            assignee: "self",
          },
          {
            title: "Add issue view JSON",
            dueDate: "2026-04-15",
            priority: 3,
          },
        ],
      }),
    )

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
        queryName: "GetProjectIdByName",
        variables: { name: "Roadmap" },
        response: {
          data: {
            projects: {
              nodes: [{ id: "project-roadmap-id" }],
            },
          },
        },
      },
      {
        queryName: "GetViewerId",
        response: {
          data: {
            viewer: {
              id: "user-self-123",
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
      {
        queryName: "GetIssueLabelIdByNameForTeam",
        variables: { name: "automation", teamKey: "ENG" },
        response: {
          data: {
            issueLabels: {
              nodes: [{ id: "label-automation-id", name: "automation" }],
            },
          },
        },
      },
    ])

    try {
      await createBatchCommand.parse([
        "--file",
        batchFile,
        "--json",
        "--dry-run",
      ])
    } finally {
      await cleanup()
      await Deno.remove(batchFile)
    }
  },
})

await snapshotTest({
  name: "Issue Create Batch Command - Partial Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  denoArgs: commonDenoArgs,
  async fn() {
    const batchFile = await Deno.makeTempFile({ suffix: ".json" })
    await Deno.writeTextFile(
      batchFile,
      JSON.stringify({
        team: "ENG",
        parent: {
          title: "Parent rollout issue",
        },
        children: [
          {
            title: "Create first child",
          },
          {
            title: "Create second child",
          },
        ],
      }),
    )

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
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Parent rollout issue",
            labelIds: [],
            teamId: "team-eng-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-parent-600",
                identifier: "ENG-600",
                title: "Parent rollout issue",
                url:
                  "https://linear.app/test-team/issue/ENG-600/parent-rollout-issue",
                dueDate: null,
                assignee: null,
                parent: null,
                state: {
                  name: "Todo",
                  color: "#cccccc",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Create first child",
            parentId: "issue-parent-600",
            labelIds: [],
            teamId: "team-eng-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-child-601",
                identifier: "ENG-601",
                title: "Create first child",
                url:
                  "https://linear.app/test-team/issue/ENG-601/create-first-child",
                dueDate: null,
                assignee: null,
                parent: {
                  id: "issue-parent-600",
                  identifier: "ENG-600",
                  title: "Parent rollout issue",
                  url:
                    "https://linear.app/test-team/issue/ENG-600/parent-rollout-issue",
                  dueDate: null,
                  state: {
                    name: "Todo",
                    color: "#cccccc",
                  },
                },
                state: {
                  name: "Todo",
                  color: "#cccccc",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Create second child",
            parentId: "issue-parent-600",
            labelIds: [],
            teamId: "team-eng-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: false,
              issue: null,
            },
          },
        },
      },
    ])

    try {
      await createBatchCommand.parse(["--file", batchFile])
    } finally {
      await cleanup()
      await Deno.remove(batchFile)
    }
  },
})

await snapshotTest({
  name: "Issue Create Batch Command - JSON Partial Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  denoArgs: commonDenoArgs,
  async fn() {
    const batchFile = await Deno.makeTempFile({ suffix: ".json" })
    await Deno.writeTextFile(
      batchFile,
      JSON.stringify({
        team: "ENG",
        parent: {
          title: "Parent rollout issue",
        },
        children: [
          {
            title: "Create first child",
          },
          {
            title: "Create second child",
          },
        ],
      }),
    )

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
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Parent rollout issue",
            labelIds: [],
            teamId: "team-eng-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-parent-600",
                identifier: "ENG-600",
                title: "Parent rollout issue",
                url:
                  "https://linear.app/test-team/issue/ENG-600/parent-rollout-issue",
                dueDate: null,
                assignee: null,
                parent: null,
                state: {
                  name: "Todo",
                  color: "#cccccc",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Create first child",
            parentId: "issue-parent-600",
            labelIds: [],
            teamId: "team-eng-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: true,
              issue: {
                id: "issue-child-601",
                identifier: "ENG-601",
                title: "Create first child",
                url:
                  "https://linear.app/test-team/issue/ENG-601/create-first-child",
                dueDate: null,
                assignee: null,
                parent: {
                  id: "issue-parent-600",
                  identifier: "ENG-600",
                  title: "Parent rollout issue",
                  url:
                    "https://linear.app/test-team/issue/ENG-600/parent-rollout-issue",
                  dueDate: null,
                  state: {
                    name: "Todo",
                    color: "#cccccc",
                  },
                },
                state: {
                  name: "Todo",
                  color: "#cccccc",
                },
                team: {
                  key: "ENG",
                },
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssue",
        variables: {
          input: {
            title: "Create second child",
            parentId: "issue-parent-600",
            labelIds: [],
            teamId: "team-eng-id",
          },
        },
        response: {
          data: {
            issueCreate: {
              success: false,
              issue: null,
            },
          },
        },
      },
    ])

    try {
      await createBatchCommand.parse(["--file", batchFile, "--json"])
    } finally {
      await cleanup()
      await Deno.remove(batchFile)
    }
  },
})
