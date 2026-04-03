import { snapshotTest } from "@cliffy/testing"
import { issueCommand } from "../../../src/commands/resolve/resolve-issue.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve Issue Command - JSON Resolved",
  meta: import.meta,
  colors: false,
  args: ["ENG-123", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "ResolveIssueReference",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              id: "issue-123",
              identifier: "ENG-123",
              title: "Stabilize auth expiry handling",
              url: "https://linear.app/test/issue/ENG-123/auth-expiry",
              team: {
                id: "team-1",
                key: "ENG",
                name: "Engineering",
              },
            },
          },
        },
      },
    ])

    try {
      await issueCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Resolve Issue Command - JSON Missing Team Context",
  meta: import.meta,
  colors: false,
  args: ["123", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const existingTeam = Deno.env.get("LINEAR_TEAM_ID")
    Deno.env.set("LINEAR_TEAM_ID", "")

    try {
      await issueCommand.parse()
    } finally {
      if (existingTeam != null) {
        Deno.env.set("LINEAR_TEAM_ID", existingTeam)
      } else {
        Deno.env.delete("LINEAR_TEAM_ID")
      }
    }
  },
})
