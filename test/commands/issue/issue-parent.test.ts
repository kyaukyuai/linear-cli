import { snapshotTest } from "@cliffy/testing"
import { parentCommand } from "../../../src/commands/issue/issue-parent.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Issue Parent Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await parentCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Parent Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["ENG-321", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "ENG-321" },
        response: {
          data: {
            issue: {
              id: "issue-child-321",
              identifier: "ENG-321",
              title: "Implement child workflow",
              dueDate: "2026-04-10",
              description: null,
              url:
                "https://linear.app/test-team/issue/ENG-321/implement-child-workflow",
              branchName: "eng-321-implement-child-workflow",
              assignee: null,
              priority: 2,
              priorityLabel: "High",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              cycle: null,
              parent: {
                id: "issue-parent-100",
                identifier: "ENG-100",
                title: "Parent planning issue",
                url:
                  "https://linear.app/test-team/issue/ENG-100/parent-planning-issue",
                dueDate: "2026-04-01",
                state: {
                  name: "Backlog",
                  color: "#999999",
                },
              },
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
    ])

    try {
      await parentCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
