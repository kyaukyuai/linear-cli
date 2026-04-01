import { assert, assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { MockLinearServer } from "../utils/mock_linear_server.ts"

type MockResponse = {
  queryName: string
  variables?: Record<string, unknown>
  response: Record<string, unknown>
  status?: number
  headers?: Record<string, string>
  delayMs?: number
  consume?: boolean
}

const repoRoot = fromFileUrl(new URL("../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../src/main.ts", import.meta.url))

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

async function runLinearJsonCommand(
  args: string[],
  env: Record<string, string> = {},
): Promise<unknown> {
  const output = await new Deno.Command("deno", {
    args: [
      "run",
      "-c",
      denoJsonPath,
      "--allow-all",
      "--quiet",
      mainPath,
      ...args,
    ],
    cwd: repoRoot,
    env: {
      NO_COLOR: "1",
      ...env,
    },
    stdout: "piped",
    stderr: "piped",
  }).output()

  assertEquals(
    new TextDecoder().decode(output.stderr),
    "",
    `Expected no stderr for: linear ${args.join(" ")}`,
  )
  assert(
    output.success,
    `Expected success for: linear ${args.join(" ")}\n${
      new TextDecoder().decode(output.stdout)
    }`,
  )

  return JSON.parse(new TextDecoder().decode(output.stdout))
}

async function withMockServer<T>(
  responses: MockResponse[],
  fn: (env: Record<string, string>) => Promise<T>,
  env: Record<string, string> = {},
): Promise<T> {
  const server = new MockLinearServer(responses)
  await server.start()

  try {
    return await fn({
      LINEAR_GRAPHQL_ENDPOINT: server.getEndpoint(),
      LINEAR_API_KEY: "Bearer test-token",
      ...env,
    })
  } finally {
    await server.stop()
  }
}

function assertStartupObjectShape(
  payload: unknown,
  requiredKeys: string[],
): asserts payload is Record<string, unknown> {
  assert(isRecord(payload), "Expected an object payload")
  assertEquals("success" in payload, false, "Unexpected success wrapper")
  assertEquals("data" in payload, false, "Unexpected data wrapper")

  for (const key of requiredKeys) {
    assert(key in payload, `Missing required top-level key: ${key}`)
  }
}

function assertStartupArrayShape(
  payload: unknown,
  requiredItemKeys: string[],
): asserts payload is Record<string, unknown>[] {
  assert(Array.isArray(payload), "Expected an array payload")
  assert(payload.length > 0, "Expected at least one array item")

  const [firstItem] = payload
  assert(isRecord(firstItem), "Expected array items to be objects")
  assertEquals("success" in firstItem, false, "Unexpected success wrapper")
  assertEquals("data" in firstItem, false, "Unexpected data wrapper")

  for (const key of requiredItemKeys) {
    assert(key in firstItem, `Missing required item key: ${key}`)
  }
}

Deno.test("startup-critical capabilities default shape stays v1-compatible", async () => {
  const payload = await runLinearJsonCommand(["capabilities", "--json"])

  assertStartupObjectShape(payload, [
    "schemaVersion",
    "cli",
    "contractVersions",
    "automationTier",
    "commands",
  ])
  assertEquals(payload.schemaVersion, "v1")
  assert(Array.isArray(payload.commands), "Expected commands to be an array")

  const issueUpdate = payload.commands.find((command) =>
    isRecord(command) && command.path === "linear issue update"
  )
  assert(isRecord(issueUpdate), "Expected linear issue update capability")
  assertEquals("schema" in issueUpdate, false)
  assertEquals("output" in issueUpdate, false)
})

Deno.test("startup-critical capabilities v2 shape keeps schema metadata opt-in", async () => {
  const payload = await runLinearJsonCommand([
    "capabilities",
    "--json",
    "--compat",
    "v2",
  ])

  assertStartupObjectShape(payload, [
    "schemaVersion",
    "cli",
    "contractVersions",
    "automationTier",
    "commands",
  ])
  assertEquals(payload.schemaVersion, "v2")
  assert(Array.isArray(payload.commands), "Expected commands to be an array")

  const issueUpdate = payload.commands.find((command) =>
    isRecord(command) && command.path === "linear issue update"
  )
  assert(isRecord(issueUpdate), "Expected linear issue update capability")
  assertEquals("schema" in issueUpdate, true)
  assertEquals("output" in issueUpdate, true)
})

Deno.test("startup-critical agent read entrypoints preserve top-level JSON shape", async (ctx) => {
  await ctx.step("issue view", async () => {
    const payload = await withMockServer(
      [{
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              identifier: "ENG-123",
              title: "Fix authentication expiry handling",
              description: "Users hit a session-expired loop after login.",
              url: "https://linear.app/test/issue/ENG-123/fix-auth",
              branchName: "eng-123-fix-auth",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              cycle: null,
              parent: null,
              children: { nodes: [] },
              comments: { nodes: [], pageInfo: { hasNextPage: false } },
              relations: { nodes: [] },
              inverseRelations: { nodes: [] },
              attachments: { nodes: [] },
            },
          },
        },
      }],
      (env) =>
        runLinearJsonCommand(["issue", "view", "ENG-123", "--json"], env),
    )

    assertStartupObjectShape(payload, [
      "identifier",
      "title",
      "url",
      "state",
    ])
  })

  await ctx.step("issue list", async () => {
    const payload = await withMockServer(
      [{
        queryName: "GetIssuesForState",
        response: {
          data: {
            issues: {
              nodes: [
                {
                  id: "issue-1",
                  identifier: "ENG-123",
                  title: "Fix authentication expiry handling",
                  url: "https://linear.app/test/issue/ENG-123/fix-auth",
                  dueDate: null,
                  priority: 1,
                  priorityLabel: "Urgent",
                  estimate: null,
                  assignee: null,
                  state: {
                    id: "state-1",
                    name: "In Progress",
                    color: "#f87462",
                  },
                  team: {
                    id: "team-1",
                    key: "ENG",
                    name: "Engineering",
                  },
                  project: null,
                  cycle: null,
                  parent: null,
                  labels: { nodes: [] },
                  updatedAt: "2025-08-16T15:30:00Z",
                },
              ],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      }],
      (env) =>
        runLinearJsonCommand(
          ["issue", "list", "--all-assignees", "--json"],
          {
            ...env,
            LINEAR_TEAM_ID: "ENG",
            LINEAR_ISSUE_SORT: "priority",
          },
        ),
    )

    assertStartupArrayShape(payload, [
      "id",
      "identifier",
      "title",
      "state",
      "stateName",
    ])
  })

  await ctx.step("project view", async () => {
    const payload = await withMockServer(
      [
        {
          queryName: "GetProjectBySlug",
          variables: { slugId: "auth-redesign-2024" },
          response: {
            data: {
              projects: {
                nodes: [{
                  id: "project-json-id",
                  slugId: "auth-redesign-2024",
                }],
              },
            },
          },
        },
        {
          queryName: "GetProjectDetails",
          variables: { id: "project-json-id" },
          response: {
            data: {
              project: {
                id: "project-json-id",
                slugId: "auth-redesign-2024",
                name: "Authentication System Redesign",
                description: "Complete overhaul of the authentication system.",
                icon: "🔐",
                color: "#3b82f6",
                url: "https://linear.app/acme/project/auth-redesign-2024",
                status: {
                  id: "status-started",
                  name: "In Progress",
                  color: "#f59e0b",
                  type: "started",
                },
                creator: null,
                lead: null,
                priority: 2,
                health: "onTrack",
                startDate: "2024-01-15",
                targetDate: "2024-04-30",
                startedAt: "2024-01-16T09:00:00Z",
                completedAt: null,
                canceledAt: null,
                createdAt: "2024-01-10T10:00:00Z",
                updatedAt: "2024-01-25T14:30:00Z",
                teams: {
                  nodes: [{
                    id: "team-1",
                    key: "BACKEND",
                    name: "Backend Team",
                  }],
                },
                issues: {
                  nodes: [
                    {
                      id: "issue-1",
                      identifier: "AUTH-101",
                      title: "Implement OAuth 2.0 flow",
                      state: { name: "In Progress", type: "started" },
                    },
                  ],
                },
                lastUpdate: null,
              },
            },
          },
        },
      ],
      (env) =>
        runLinearJsonCommand(
          ["project", "view", "auth-redesign-2024", "--json"],
          env,
        ),
    )

    assertStartupObjectShape(payload, [
      "id",
      "slugId",
      "name",
      "status",
    ])
  })

  await ctx.step("cycle current", async () => {
    const payload = await withMockServer(
      [
        {
          queryName: "GetTeamIdByKey",
          response: {
            data: {
              teams: {
                nodes: [{ id: "team-1", key: "ENG", name: "Engineering" }],
              },
            },
          },
        },
        {
          queryName: "GetActiveCycle",
          response: {
            data: {
              team: {
                id: "team-1",
                key: "ENG",
                name: "Engineering",
                activeCycle: {
                  id: "cycle-1",
                  number: 42,
                  name: "Sprint 42",
                  description: "Working on authentication improvements",
                  startsAt: "2026-01-13T00:00:00Z",
                  endsAt: "2026-01-27T00:00:00Z",
                  completedAt: null,
                  isActive: true,
                  isFuture: false,
                  isPast: false,
                  progress: 0.35,
                  createdAt: "2026-01-10T00:00:00Z",
                  updatedAt: "2026-01-20T00:00:00Z",
                  issues: {
                    nodes: [
                      {
                        id: "issue-1",
                        identifier: "ENG-123",
                        title: "Fix login bug",
                        state: {
                          name: "In Progress",
                          type: "started",
                          color: "#f59e0b",
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ],
      (env) =>
        runLinearJsonCommand(
          ["cycle", "current", "--team", "ENG", "--json"],
          env,
        ),
    )

    assertStartupObjectShape(payload, [
      "id",
      "number",
      "name",
      "team",
    ])
  })

  await ctx.step("document list", async () => {
    const payload = await withMockServer(
      [{
        queryName: "ListDocuments",
        variables: { first: 50 },
        response: {
          data: {
            documents: {
              nodes: [
                {
                  id: "doc-1",
                  title: "Delegation System Spec",
                  slugId: "d4b93e3b2695",
                  url:
                    "https://linear.app/test/document/delegation-system-spec-d4b93e3b2695",
                  createdAt: null,
                  updatedAt: "2026-01-18T10:30:00Z",
                  project: {
                    id: null,
                    name: "TinyCloud SDK",
                    slugId: "tinycloud-sdk",
                    url: null,
                  },
                  issue: null,
                  creator: {
                    name: "John Doe",
                    displayName: null,
                    email: null,
                  },
                },
              ],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        },
      }],
      (env) => runLinearJsonCommand(["document", "list", "--json"], env),
    )

    assertStartupArrayShape(payload, [
      "id",
      "title",
      "slugId",
      "updatedAt",
    ])
  })

  await ctx.step("webhook view", async () => {
    const payload = await withMockServer(
      [{
        queryName: "GetWebhook",
        variables: { id: "webhook-1" },
        response: {
          data: {
            webhook: {
              id: "webhook-1",
              label: "Issue events",
              url: "https://example.com/hooks/issues",
              enabled: true,
              archivedAt: null,
              allPublicTeams: false,
              resourceTypes: ["Issue", "Comment"],
              createdAt: "2026-03-13T10:00:00Z",
              updatedAt: "2026-03-13T10:05:00Z",
              team: {
                id: "team-1",
                key: "ENG",
                name: "Engineering",
              },
              creator: {
                id: "user-1",
                name: "jdoe",
                displayName: "John Doe",
              },
            },
          },
        },
      }],
      (env) =>
        runLinearJsonCommand(
          ["webhook", "view", "webhook-1", "--json"],
          env,
        ),
    )

    assertStartupObjectShape(payload, [
      "id",
      "label",
      "status",
      "team",
    ])
  })

  await ctx.step("notification list", async () => {
    const payload = await withMockServer(
      [{
        queryName: "GetNotifications",
        response: {
          data: {
            notifications: {
              nodes: [
                {
                  id: "notif-1",
                  type: "issueAssigned",
                  title: "ENG-123 was assigned to you",
                  subtitle: "Fix login bug",
                  url: "https://linear.app/issue/ENG-123",
                  inboxUrl: "https://linear.app/inbox/notif-1",
                  createdAt: "2026-03-12T10:00:00Z",
                  readAt: null,
                  archivedAt: null,
                  snoozedUntilAt: null,
                  actor: {
                    name: "jdoe",
                    displayName: "John Doe",
                  },
                },
              ],
            },
          },
        },
      }],
      (env) => runLinearJsonCommand(["notification", "list", "--json"], env),
    )

    assertStartupArrayShape(payload, [
      "id",
      "type",
      "title",
      "status",
    ])
  })
})
