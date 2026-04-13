import { snapshotTest } from "@cliffy/testing"
import { packCommand } from "../../../src/commands/resolve/resolve-pack.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

await snapshotTest({
  name: "Resolve Pack Command - JSON Resolved",
  meta: import.meta,
  colors: false,
  args: [
    "--issue",
    "ENG-123",
    "--workflow-state",
    "started",
    "--label",
    "Bug",
    "--label",
    "Customer",
    "--user",
    "self",
    "--project",
    "auth-refresh",
    "--json",
  ],
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
      {
        queryName: "ResolveViewerReference",
        response: {
          data: {
            viewer: {
              id: "user-1",
              name: "alice.bot",
              displayName: "Alice Bot",
              email: "alice@example.com",
            },
          },
        },
      },
      {
        queryName: "ResolveProjectReferenceBySlug",
        variables: { slugId: "auth-refresh" },
        response: {
          data: {
            projects: {
              nodes: [
                {
                  id: "project-1",
                  slugId: "auth-refresh",
                  name: "Auth Refresh",
                  url: "https://linear.app/test/project/auth-refresh",
                },
              ],
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
              id: "team-1",
              key: "ENG",
              name: "Engineering",
              states: {
                nodes: [
                  {
                    id: "state-1",
                    name: "Todo",
                    type: "unstarted",
                    position: 1,
                    color: "#94a3b8",
                    description: null,
                    createdAt: "2026-04-13T00:00:00Z",
                    updatedAt: "2026-04-13T00:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-1",
                      key: "ENG",
                      name: "Engineering",
                    },
                    inheritedFrom: null,
                  },
                  {
                    id: "state-2",
                    name: "In Progress",
                    type: "started",
                    position: 2,
                    color: "#f97316",
                    description: null,
                    createdAt: "2026-04-13T00:00:00Z",
                    updatedAt: "2026-04-13T00:00:00Z",
                    archivedAt: null,
                    team: {
                      id: "team-1",
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
        queryName: "ResolveIssueLabelReference",
        variables: { name: "Bug", teamKey: "ENG" },
        response: {
          data: {
            issueLabels: {
              nodes: [
                {
                  id: "label-1",
                  name: "Bug",
                  color: "#ef4444",
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                },
              ],
            },
          },
        },
      },
      {
        queryName: "ResolveIssueLabelReference",
        variables: { name: "Customer", teamKey: "ENG" },
        response: {
          data: {
            issueLabels: {
              nodes: [
                {
                  id: "label-2",
                  name: "Customer",
                  color: "#3b82f6",
                  team: null,
                },
              ],
            },
          },
        },
      },
    ])

    try {
      await packCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Resolve Pack Command - JSON Requires At Least One Reference",
  meta: import.meta,
  colors: false,
  canFail: true,
  args: ["--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    await packCommand.parse()
  },
})
