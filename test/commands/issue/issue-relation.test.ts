import { assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { snapshotTest } from "@cliffy/testing"
import { relationCommand } from "../../../src/commands/issue/issue-relation.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

const repoRoot = fromFileUrl(new URL("../../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../../src/main.ts", import.meta.url))

// Test help output
await snapshotTest({
  name: "Issue Relation Add Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["add", "--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await relationCommand.parse()
  },
})

Deno.test(
  "Issue Relation Add Command - JSON Timeout Reconciles To Probably Succeeded",
  async () => {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        consume: true,
        response: {
          data: {
            issue: {
              relations: {
                nodes: [],
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssueRelation",
        delayMs: 250,
        response: {
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: { id: "relation-id-1" },
            },
          },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        consume: true,
        response: {
          data: {
            issue: {
              relations: {
                nodes: [
                  {
                    id: "relation-id-1",
                    type: "blocks",
                    relatedIssue: { id: "issue-id-456" },
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

      const output = await runIssueRelationSubprocess([
        "add",
        "ENG-123",
        "blocks",
        "ENG-456",
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
      assertEquals(payload.error.details.relationObserved, true)
      assertEquals(payload.error.details.relationId, "relation-id-1")
    } finally {
      await server.stop()
    }
  },
)

Deno.test(
  "Issue Relation Delete Command - JSON Timeout Reconciles To Probably Succeeded",
  async () => {
    const server = new MockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        consume: true,
        response: {
          data: {
            issue: {
              relations: {
                nodes: [
                  {
                    id: "relation-id-existing",
                    type: "blocks",
                    relatedIssue: { id: "issue-id-456" },
                  },
                ],
              },
            },
          },
        },
      },
      {
        queryName: "DeleteIssueRelation",
        delayMs: 250,
        response: {
          data: {
            issueRelationDelete: {
              success: true,
            },
          },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        consume: true,
        response: {
          data: {
            issue: {
              relations: {
                nodes: [],
              },
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runIssueRelationSubprocess([
        "delete",
        "ENG-123",
        "blocks",
        "ENG-456",
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
      assertEquals(payload.error.details.relationObserved, false)
    } finally {
      await server.stop()
    }
  },
)

async function runIssueRelationSubprocess(
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
      "relation",
      ...args,
    ],
    cwd: repoRoot,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output()
}

// Test: relation add with "blocks" - success message shows original order
await snapshotTest({
  name: "Issue Relation Add Command - blocks",
  meta: import.meta,
  colors: false,
  args: ["add", "ENG-123", "blocks", "ENG-456"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        response: {
          data: {
            issue: {
              relations: {
                nodes: [],
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssueRelation",
        response: {
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: { id: "relation-id-1" },
            },
          },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

// Test: relation add with "blocked-by" - success message should show original user-specified order
// i.e. "ENG-123 blocked-by ENG-456" NOT "ENG-456 blocked-by ENG-123"
await snapshotTest({
  name: "Issue Relation Add Command - blocked-by shows correct order",
  meta: import.meta,
  colors: false,
  args: ["add", "ENG-123", "blocked-by", "ENG-456"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-456" },
        response: {
          data: {
            issue: {
              relations: {
                nodes: [],
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssueRelation",
        response: {
          data: {
            issueRelationCreate: {
              success: true,
              // API is called with swapped IDs (ENG-456 blocks ENG-123),
              // but we should display the user-specified order in the message
              issueRelation: { id: "relation-id-2" },
            },
          },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Add Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["add", "ENG-123", "blocked-by", "ENG-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-456" },
        response: {
          data: {
            issue: {
              relations: {
                nodes: [],
              },
            },
          },
        },
      },
      {
        queryName: "CreateIssueRelation",
        response: {
          data: {
            issueRelationCreate: {
              success: true,
              issueRelation: { id: "relation-id-2" },
            },
          },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Add Command - JSON No-op When Already Present",
  meta: import.meta,
  colors: false,
  args: ["add", "ENG-123", "blocks", "ENG-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        response: {
          data: {
            issue: {
              relations: {
                nodes: [
                  {
                    id: "relation-id-existing",
                    type: "blocks",
                    relatedIssue: { id: "issue-id-456" },
                  },
                ],
              },
            },
          },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Add Command - JSON Dry Run",
  meta: import.meta,
  colors: false,
  args: ["add", "ENG-123", "blocked-by", "ENG-456", "--json", "--dry-run"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Add Command - JSON Validation Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["add", "ENG-123", "invalid", "ENG-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await relationCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Relation Delete Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["delete", "ENG-123", "blocks", "ENG-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        response: {
          data: {
            issue: {
              relations: {
                nodes: [
                  {
                    id: "relation-id-3",
                    type: "blocks",
                    relatedIssue: { id: "issue-id-456" },
                  },
                ],
              },
            },
          },
        },
      },
      {
        queryName: "DeleteIssueRelation",
        variables: { id: "relation-id-3" },
        response: {
          data: {
            issueRelationDelete: {
              success: true,
            },
          },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Delete Command - JSON No-op When Already Absent",
  meta: import.meta,
  colors: false,
  args: ["delete", "ENG-123", "blocks", "ENG-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
      {
        queryName: "FindIssueRelation",
        variables: { issueId: "issue-id-123" },
        response: {
          data: {
            issue: {
              relations: {
                nodes: [],
              },
            },
          },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Delete Command - JSON Dry Run",
  meta: import.meta,
  colors: false,
  args: ["delete", "ENG-123", "blocks", "ENG-456", "--json", "--dry-run"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-123" },
        response: {
          data: { issue: { id: "issue-id-123" } },
        },
      },
      {
        queryName: "GetIssueId",
        variables: { id: "ENG-456" },
        response: {
          data: { issue: { id: "issue-id-456" } },
        },
      },
    ])

    try {
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Issue Relation Delete Command - JSON Validation Failure",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["delete", "ENG-123", "invalid", "ENG-456", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await relationCommand.parse()
  },
})

await snapshotTest({
  name: "Issue Relation List Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["list", "ENG-123", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "ListIssueRelations",
        variables: { issueId: "ENG-123" },
        response: {
          data: {
            issue: {
              id: "issue-id-123",
              identifier: "ENG-123",
              title: "Parent issue",
              url: "https://linear.app/issue/ENG-123",
              relations: {
                nodes: [
                  {
                    id: "relation-out-1",
                    type: "blocks",
                    relatedIssue: {
                      id: "issue-id-456",
                      identifier: "ENG-456",
                      title: "Blocked issue",
                      url: "https://linear.app/issue/ENG-456",
                      dueDate: "2026-03-20",
                      state: {
                        name: "Todo",
                        color: "#94a3b8",
                      },
                    },
                  },
                ],
              },
              inverseRelations: {
                nodes: [
                  {
                    id: "relation-in-1",
                    type: "blocks",
                    issue: {
                      id: "issue-id-789",
                      identifier: "ENG-789",
                      title: "Blocking issue",
                      url: "https://linear.app/issue/ENG-789",
                      dueDate: null,
                      state: {
                        name: "In Progress",
                        color: "#3b82f6",
                      },
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
      await relationCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
