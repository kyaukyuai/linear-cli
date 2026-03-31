import { assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { snapshotTest } from "@cliffy/testing"
import { updateCommand } from "../../../src/commands/issue/issue-update.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"
import { runSnapshotCommand } from "../../utils/snapshot_with_fake_time.ts"

const repoRoot = fromFileUrl(new URL("../../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../../src/main.ts", import.meta.url))

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
  name: "Issue Update Command - JSON Dry Run",
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
    "--dry-run",
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
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Update Command - JSON Dry Run From Stdin",
  meta: import.meta,
  colors: false,
  ignore: true,
  args: [
    "ENG-123",
    "--state",
    "started",
    "--json",
    "--dry-run",
  ],
  stdin: ["Updated from piped stdin\n\nWith markdown.\n"],
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
    ], { LINEAR_TEAM_ID: "ENG" })

    try {
      await updateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

Deno.test("Issue Update Command - JSON Dry Run From Stdin", async () => {
  const { stdout, stderr, code } = await runSnapshotCommand({
    meta: import.meta,
    name: "Issue Update Command - JSON Dry Run From Stdin",
    args: [
      "ENG-123",
      "--state",
      "started",
      "--json",
      "--dry-run",
    ],
    stdin: ["Updated from piped stdin\n\nWith markdown.\n"],
    denoArgs: commonDenoArgs,
  })

  assertEquals(code, 0)
  assertEquals(stderr, "")

  const payload = JSON.parse(stdout)
  assertEquals(payload.success, true)
  assertEquals(payload.dryRun, true)
  assertEquals(
    payload.data.changes.description,
    "Updated from piped stdin\n\nWith markdown.\n",
  )
})

Deno.test(
  "Issue Update Command - JSON Output Returns From Subprocess Combined Path",
  async () => {
    const server = new MockLinearServer([
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
                title: "Updated from subprocess",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-from-subprocess",
                dueDate: null,
                assignee: null,
                parent: null,
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
                id: "comment-subprocess-123",
                body: "Investigating now",
                createdAt: "2026-03-29T12:00:00Z",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-from-subprocess#comment-subprocess-123",
                parent: null,
                issue: {
                  id: "issue-existing-123",
                  identifier: "ENG-123",
                  title: "Updated from subprocess",
                  url:
                    "https://linear.app/test-team/issue/ENG-123/updated-from-subprocess",
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
    ])

    try {
      await server.start()

      const output = await runIssueUpdateSubprocess([
        "ENG-123",
        "--title",
        "Updated from subprocess",
        "--comment",
        "Investigating now",
        "--json",
      ], {
        LINEAR_GRAPHQL_ENDPOINT: server.getEndpoint(),
        LINEAR_API_KEY: "Bearer test-token",
        NO_COLOR: "1",
      })

      assertEquals(output.success, true)
      assertEquals(new TextDecoder().decode(output.stderr), "")

      const result = JSON.parse(new TextDecoder().decode(output.stdout))
      assertEquals(result.identifier, "ENG-123")
      assertEquals(result.comment.body, "Investigating now")
    } finally {
      await server.stop()
    }
  },
)

Deno.test(
  "Issue Update Command - JSON Output Distinguishes Write Timeout",
  async () => {
    const server = new MockLinearServer([
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
        delayMs: 250,
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                title: "Updated after timeout",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-after-timeout",
                dueDate: null,
                assignee: {
                  id: "user-self-123",
                  name: "alice.bot",
                  displayName: "Alice Bot",
                  initials: "AB",
                },
                parent: null,
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
        queryName: "GetIssueForTimeoutReconciliation",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              id: "issue-existing-123",
              identifier: "ENG-123",
              title: "Updated after timeout",
              url:
                "https://linear.app/test-team/issue/ENG-123/updated-after-timeout",
              dueDate: null,
              priority: null,
              estimate: null,
              description: null,
              assignee: {
                id: "user-self-123",
                name: "alice.bot",
                displayName: "Alice Bot",
                initials: "AB",
              },
              parent: null,
              state: null,
              labels: { nodes: [] },
              team: { id: "team-eng-id" },
              project: null,
              projectMilestone: null,
              cycle: null,
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runIssueUpdateSubprocess([
        "ENG-123",
        "--assignee",
        "self",
        "--json",
        "--timeout-ms",
        "50",
      ], {
        LINEAR_GRAPHQL_ENDPOINT: server.getEndpoint(),
        LINEAR_API_KEY: "Bearer test-token",
        NO_COLOR: "1",
      })

      assertEquals(output.success, false)
      assertEquals(output.code, 6)
      assertEquals(new TextDecoder().decode(output.stderr), "")

      const result = JSON.parse(new TextDecoder().decode(output.stdout))
      assertEquals(result.success, false)
      assertEquals(result.error.type, "timeout_error")
      assertEquals(
        result.error.message,
        "Timed out waiting for issue update confirmation after 50ms. The write may still have been accepted by Linear.",
      )
      assertEquals(
        result.error.details.failureMode,
        "timeout_waiting_for_confirmation",
      )
      assertEquals(result.error.details.timeoutMs, 50)
      assertEquals(result.error.details.operation, "issue update")
      assertEquals(result.error.details.outcome, "probably_succeeded")
      assertEquals(result.error.details.appliedState, "applied")
      assertEquals(result.error.details.callerGuidance, {
        nextAction: "treat_as_applied",
        readBeforeRetry: false,
      })
      assertEquals(result.error.details.reconciliationAttempted, true)
      assertEquals(result.error.details.matchedFields, ["assignee", "team"])
      assertEquals(
        result.error.details.observedIssue.assignee.id,
        "user-self-123",
      )
    } finally {
      await server.stop()
    }
  },
)

Deno.test(
  "Issue Update Command - JSON Output Reconciles Comment Timeout As Partial Success",
  async () => {
    const server = new MockLinearServer([
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
                title: "Updated with timeout reconciliation",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation",
                dueDate: null,
                assignee: null,
                parent: null,
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
        delayMs: 250,
        response: {
          data: {
            commentCreate: {
              success: true,
              comment: {
                id: "comment-json-timeout-123",
                body: "Investigating now",
                createdAt: "2026-03-30T12:00:00Z",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation#comment-json-timeout-123",
                parent: null,
                issue: {
                  id: "issue-existing-123",
                  identifier: "ENG-123",
                  title: "Updated with timeout reconciliation",
                  url:
                    "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation",
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
      {
        queryName: "GetIssueCommentsForTimeoutReconciliation",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              id: "issue-existing-123",
              identifier: "ENG-123",
              title: "Updated with timeout reconciliation",
              url:
                "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation",
              comments: {
                nodes: [],
              },
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runIssueUpdateSubprocess([
        "ENG-123",
        "--title",
        "Updated with timeout reconciliation",
        "--comment",
        "Investigating now",
        "--json",
        "--timeout-ms",
        "50",
      ], {
        LINEAR_GRAPHQL_ENDPOINT: server.getEndpoint(),
        LINEAR_API_KEY: "Bearer test-token",
        NO_COLOR: "1",
      })

      assertEquals(output.success, false)
      assertEquals(output.code, 6)

      const result = JSON.parse(new TextDecoder().decode(output.stdout))
      assertEquals(result.error.type, "timeout_error")
      assertEquals(
        result.error.message,
        "Issue ENG-123 was updated, but adding the comment did not complete in time.",
      )
      assertEquals(result.error.details.outcome, "partial_success")
      assertEquals(result.error.details.appliedState, "partially_applied")
      assertEquals(result.error.details.callerGuidance, {
        nextAction: "resume_partial_write",
        readBeforeRetry: false,
      })
      assertEquals(result.error.details.commentObserved, false)
      assertEquals(result.error.details.failureStage, "comment_create")
      assertEquals(result.error.details.partialSuccess.issueUpdated, true)
      assertEquals(result.error.details.partialSuccess.commentAttempted, true)
    } finally {
      await server.stop()
    }
  },
)

Deno.test(
  "Issue Update Command - JSON Output Reports Partial Success When Comment Fails",
  async () => {
    const server = new MockLinearServer([
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
                title: "Updated with partial success",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-with-partial-success",
                dueDate: null,
                assignee: null,
                parent: null,
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
              success: false,
              comment: null,
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runIssueUpdateSubprocess([
        "ENG-123",
        "--title",
        "Updated with partial success",
        "--comment",
        "Investigating now",
        "--json",
      ], {
        LINEAR_GRAPHQL_ENDPOINT: server.getEndpoint(),
        LINEAR_API_KEY: "Bearer test-token",
        NO_COLOR: "1",
      })

      assertEquals(output.success, false)
      assertEquals(output.code, 1)
      assertEquals(new TextDecoder().decode(output.stderr), "")

      const result = JSON.parse(new TextDecoder().decode(output.stdout))
      assertEquals(result.success, false)
      assertEquals(result.error.type, "cli_error")
      assertEquals(
        result.error.message,
        "Issue ENG-123 was updated, but adding the comment failed.",
      )
      assertEquals(result.error.details.failureStage, "comment_create")
      assertEquals(result.error.details.failureMode, "error")
      assertEquals(result.error.details.retryable, true)
      assertEquals(
        result.error.details.retryCommand,
        'linear issue comment add ENG-123 --body "Investigating now"',
      )
      assertEquals(result.error.details.partialSuccess.issueUpdated, true)
      assertEquals(result.error.details.partialSuccess.commentAttempted, true)
      assertEquals(
        result.error.details.partialSuccess.issue.identifier,
        "ENG-123",
      )
    } finally {
      await server.stop()
    }
  },
)

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

async function runIssueUpdateSubprocess(
  args: string[],
  env: Record<string, string>,
): Promise<Deno.CommandOutput> {
  const child = new Deno.Command("deno", {
    args: [
      "run",
      "-c",
      denoJsonPath,
      "--allow-all",
      "--quiet",
      mainPath,
      "issue",
      "update",
      ...args,
    ],
    cwd: repoRoot,
    env,
    stdout: "piped",
    stderr: "piped",
  }).spawn()

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      child.output(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          child.kill()
          reject(
            new Error(
              "issue update subprocess did not exit within 5000ms",
            ),
          )
        }, 5000)
      }),
    ])
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}

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

await snapshotTest({
  name: "Issue Update Command - Description Parse Guidance",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: [
    "ENG-123",
    "-d",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    await updateCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Update Command - JSON Description Parse Guidance",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: [
    "ENG-123",
    "--json",
    "-d",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    await updateCommand.parse()
  },
})
