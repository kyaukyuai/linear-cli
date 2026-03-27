import { snapshotTest } from "@cliffy/testing"
import { deleteCommand } from "../../../src/commands/issue/issue-delete.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Issue Delete Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await deleteCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Delete Command - With Yes Flag",
  meta: import.meta,
  colors: false,
  args: ["ENG-123", "--yes"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueDeleteDetails",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              identifier: "ENG-123",
              title: "Delete me",
            },
          },
        },
      },
      {
        queryName: "DeleteIssue",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issueDelete: {
              success: true,
              entity: {
                identifier: "ENG-123",
                title: "Delete me",
              },
            },
          },
        },
      },
    ])

    try {
      await deleteCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Delete Command - Legacy Confirm Alias",
  meta: import.meta,
  colors: false,
  args: ["ENG-123", "--confirm"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueDeleteDetails",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              identifier: "ENG-123",
              title: "Delete me",
            },
          },
        },
      },
      {
        queryName: "DeleteIssue",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issueDelete: {
              success: true,
              entity: {
                identifier: "ENG-123",
                title: "Delete me",
              },
            },
          },
        },
      },
    ])

    try {
      await deleteCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
