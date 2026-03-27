import { assertEquals } from "@std/assert"
import { snapshotTest } from "@cliffy/testing"
import { commentUpdateCommand } from "../../../src/commands/issue/issue-comment-update.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"
import { runSnapshotCommand } from "../../utils/snapshot_with_fake_time.ts"

// Test updating a comment with body flag
await snapshotTest({
  name: "Issue Comment Update Command - With Body Flag",
  meta: import.meta,
  colors: false,
  args: ["comment-uuid-123", "--body", "This is the updated comment text"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "UpdateComment",
        response: {
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: "comment-uuid-123",
                body: "This is the updated comment text",
                updatedAt: "2024-01-15T14:30:00Z",
                url: "https://linear.app/issue/TEST-123#comment-uuid-123",
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
      await commentUpdateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Comment Update Command - With Stdin Body",
  meta: import.meta,
  colors: false,
  ignore: true,
  args: ["comment-uuid-123"],
  stdin: ["This is the updated comment text from stdin\n"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "UpdateComment",
        response: {
          data: {
            commentUpdate: {
              success: true,
              comment: {
                id: "comment-uuid-123",
                body: "This is the updated comment text from stdin\n",
                updatedAt: "2024-01-15T14:30:00Z",
                url: "https://linear.app/issue/TEST-123#comment-uuid-123",
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
      await commentUpdateCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Comment Update Command - Empty Stdin Validation Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  ignore: true,
  args: ["comment-uuid-123"],
  denoArgs: commonDenoArgs,
  async fn() {
    await commentUpdateCommand.parse()
  },
})

Deno.test("Issue Comment Update Command - With Stdin Body", async () => {
  const { stdout, stderr, code } = await runSnapshotCommand({
    meta: import.meta,
    name: "Issue Comment Update Command - With Stdin Body",
    args: ["comment-uuid-123"],
    stdin: ["This is the updated comment text from stdin\n"],
    denoArgs: commonDenoArgs,
  })

  assertEquals(code, 0)
  assertEquals(stderr, "")
  assertEquals(
    stdout,
    "✓ Comment updated\nhttps://linear.app/issue/TEST-123#comment-uuid-123\n",
  )
})

Deno.test("Issue Comment Update Command - Empty Stdin Validation Failure", async () => {
  const { stdout, stderr, code } = await runSnapshotCommand({
    meta: import.meta,
    name: "Issue Comment Update Command - Empty Stdin Validation Failure",
    args: ["comment-uuid-123"],
    stdin: [],
    denoArgs: commonDenoArgs,
  })

  assertEquals(code, 1)
  assertEquals(stdout, "")
  assertEquals(
    stderr,
    "✗ Failed to update comment: Comment body cannot be empty\n  Provide --body, --body-file, or pipe the updated comment body on stdin.\n",
  )
})
