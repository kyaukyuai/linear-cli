import { snapshotTest } from "@cliffy/testing"
import { commentAddCommand } from "../../../src/commands/issue/issue-comment-add.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

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
