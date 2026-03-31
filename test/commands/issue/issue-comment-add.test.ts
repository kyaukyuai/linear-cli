import { assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { snapshotTest } from "@cliffy/testing"
import { commentAddCommand } from "../../../src/commands/issue/issue-comment-add.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"
import { runSnapshotCommand } from "../../utils/snapshot_with_fake_time.ts"

const repoRoot = fromFileUrl(new URL("../../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../../src/main.ts", import.meta.url))

// Test adding a comment with body flag
await snapshotTest({
  name: "Issue Comment Add Command - With Body Flag",
  meta: import.meta,
  colors: false,
  args: ["TEST-123", "--body", "This is a test comment"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
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
                id: "comment-uuid-456",
                body: "This is a test comment",
                createdAt: "2024-01-15T10:30:00Z",
                url: "https://linear.app/issue/TEST-123#comment-uuid-456",
                user: {
                  name: "testuser",
                  displayName: "Test User",
                },
              },
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test replying to a comment with parent flag
await snapshotTest({
  name: "Issue Comment Add Command - With Positional Body",
  meta: import.meta,
  colors: false,
  args: [
    "TEST-123",
    "This is a positional comment",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
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
                id: "comment-uuid-positional-456",
                body: "This is a positional comment",
                createdAt: "2024-01-15T10:35:00Z",
                url:
                  "https://linear.app/issue/TEST-123#comment-uuid-positional-456",
                user: {
                  name: "testuser",
                  displayName: "Test User",
                },
              },
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test replying to a comment with parent flag
await snapshotTest({
  name: "Issue Comment Add Command - With Parent Flag",
  meta: import.meta,
  colors: false,
  args: [
    "TEST-123",
    "--body",
    "This is a reply to the comment",
    "--parent",
    "parent-comment-uuid-123",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
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
                id: "comment-uuid-reply-789",
                body: "This is a reply to the comment",
                createdAt: "2024-01-15T11:45:00Z",
                url: "https://linear.app/issue/TEST-123#comment-uuid-reply-789",
                user: {
                  name: "testuser",
                  displayName: "Test User",
                },
              },
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Comment Add Command - Body Conflict",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: [
    "TEST-123",
    "Positional body",
    "--body",
    "Flag body",
    "--json",
  ],
  denoArgs: commonDenoArgs,
  async fn() {
    await commentAddCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Comment Add Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["TEST-123", "--body", "Tracking follow-up", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
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
                body: "Tracking follow-up",
                createdAt: "2026-03-17T14:30:00Z",
                url: "https://linear.app/issue/TEST-123#comment-json-123",
                parent: null,
                issue: {
                  id: "issue-uuid-123",
                  identifier: "TEST-123",
                  title: "Tracking issue",
                  url: "https://linear.app/issue/TEST-123",
                },
                user: {
                  name: "testuser",
                  displayName: "Test User",
                },
              },
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Comment Add Command - JSON Dry Run",
  meta: import.meta,
  colors: false,
  args: ["TEST-123", "--body", "Tracking follow-up", "--json", "--dry-run"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Comment Add Command - JSON Dry Run From Stdin",
  meta: import.meta,
  colors: false,
  ignore: true,
  args: ["TEST-123", "--json", "--dry-run"],
  stdin: ["Piped follow-up\n"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Comment Add Command - Empty Stdin Validation Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  ignore: true,
  args: ["TEST-123", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
            },
          },
        },
      },
    ])

    try {
      await commentAddCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

Deno.test("Issue Comment Add Command - JSON Dry Run From Stdin", async () => {
  const { stdout, stderr, code } = await runSnapshotCommand({
    meta: import.meta,
    name: "Issue Comment Add Command - JSON Dry Run From Stdin",
    args: ["TEST-123", "--json", "--dry-run"],
    stdin: ["Piped follow-up\n"],
    denoArgs: commonDenoArgs,
  })

  assertEquals(code, 0)
  assertEquals(stderr, "")

  const payload = JSON.parse(stdout)
  assertEquals(payload.success, true)
  assertEquals(payload.dryRun, true)
  assertEquals(payload.data.body, "Piped follow-up\n")
})

Deno.test("Issue Comment Add Command - Empty Stdin Validation Failure", async () => {
  const { stdout, stderr, code } = await runSnapshotCommand({
    meta: import.meta,
    name: "Issue Comment Add Command - Empty Stdin Validation Failure",
    args: ["TEST-123", "--json"],
    stdin: [],
    denoArgs: commonDenoArgs,
  })

  assertEquals(code, 1)
  assertEquals(stderr, "")

  const payload = JSON.parse(stdout)
  assertEquals(payload.success, false)
  assertEquals(payload.error.type, "validation_error")
  assertEquals(payload.error.message, "Comment body cannot be empty")
})

Deno.test(
  "Issue Comment Add Command - JSON Timeout Reconciles To Probably Succeeded",
  async () => {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
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
                id: "comment-timeout-123",
                body: "Tracking follow-up",
                createdAt: "2026-03-30T12:15:00Z",
                url: "https://linear.app/issue/TEST-123#comment-timeout-123",
                parent: null,
                issue: {
                  id: "issue-uuid-123",
                  identifier: "TEST-123",
                  title: "Tracking issue",
                  url: "https://linear.app/issue/TEST-123",
                },
                user: {
                  name: "testuser",
                  displayName: "Test User",
                },
              },
            },
          },
        },
      },
      {
        queryName: "GetIssueCommentsForTimeoutReconciliation",
        variables: { id: "TEST-123" },
        response: {
          data: {
            issue: {
              id: "issue-uuid-123",
              identifier: "TEST-123",
              title: "Tracking issue",
              url: "https://linear.app/issue/TEST-123",
              comments: {
                nodes: [
                  {
                    id: "comment-timeout-123",
                    body: "Tracking follow-up",
                    createdAt: "2026-03-30T12:15:00Z",
                    url:
                      "https://linear.app/issue/TEST-123#comment-timeout-123",
                    parent: null,
                    user: {
                      name: "testuser",
                      displayName: "Test User",
                    },
                  },
                ],
              },
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runIssueCommentAddSubprocess([
        "TEST-123",
        "--body",
        "Tracking follow-up",
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

      const payload = JSON.parse(new TextDecoder().decode(output.stdout))
      assertEquals(payload.error.type, "timeout_error")
      assertEquals(payload.error.details.outcome, "probably_succeeded")
      assertEquals(payload.error.details.appliedState, "applied")
      assertEquals(payload.error.details.callerGuidance, {
        nextAction: "treat_as_applied",
        readBeforeRetry: false,
      })
      assertEquals(payload.error.details.commentObserved, true)
      assertEquals(payload.error.details.comment.body, "Tracking follow-up")
    } finally {
      await server.stop()
    }
  },
)

async function runIssueCommentAddSubprocess(
  args: string[],
  env: Record<string, string>,
): Promise<Deno.CommandOutput> {
  return await new Deno.Command("deno", {
    args: [
      "run",
      "-c",
      denoJsonPath,
      "--allow-all",
      "--quiet",
      mainPath,
      "issue",
      "comment",
      "add",
      ...args,
    ],
    cwd: repoRoot,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output()
}
