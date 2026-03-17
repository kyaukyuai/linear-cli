import { snapshotTest } from "@cliffy/testing"
import { childrenCommand } from "../../../src/commands/issue/issue-children.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Issue Children Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await childrenCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Children Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["ENG-100", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueDetails",
        variables: { id: "ENG-100" },
        response: {
          data: {
            issue: {
              id: "issue-parent-100",
              identifier: "ENG-100",
              title: "Parent planning issue",
              dueDate: null,
              description: null,
              url:
                "https://linear.app/test-team/issue/ENG-100/parent-planning-issue",
              branchName: "eng-100-parent-planning-issue",
              assignee: null,
              priority: null,
              priorityLabel: null,
              state: {
                name: "Backlog",
                color: "#999999",
              },
              project: null,
              projectMilestone: null,
              cycle: null,
              parent: null,
              children: {
                nodes: [
                  {
                    id: "issue-child-321",
                    identifier: "ENG-321",
                    title: "Implement child workflow",
                    url:
                      "https://linear.app/test-team/issue/ENG-321/implement-child-workflow",
                    dueDate: "2026-04-10",
                    state: {
                      name: "In Progress",
                      color: "#f87462",
                    },
                  },
                  {
                    id: "issue-child-322",
                    identifier: "ENG-322",
                    title: "Wire batch creation",
                    url:
                      "https://linear.app/test-team/issue/ENG-322/wire-batch-creation",
                    dueDate: null,
                    state: {
                      name: "Todo",
                      color: "#cccccc",
                    },
                  },
                ],
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
      await childrenCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
