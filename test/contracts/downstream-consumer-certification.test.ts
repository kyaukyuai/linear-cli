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

async function runLinearCommand(
  args: string[],
  env: Record<string, string> = {},
): Promise<Deno.CommandOutput> {
  const child = new Deno.Command("deno", {
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
  }).spawn()

  let timeoutId: ReturnType<typeof setTimeout> | null = null

  try {
    return await Promise.race([
      child.output(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          child.kill()
          reject(
            new Error(
              `linear ${args.join(" ")} did not exit within 5000ms`,
            ),
          )
        }, 5000)
      }),
    ])
  } finally {
    if (timeoutId != null) {
      clearTimeout(timeoutId)
    }
  }
}

async function runLinearJsonCommand(
  args: string[],
  env: Record<string, string> = {},
): Promise<unknown> {
  const output = await runLinearCommand(args, env)
  const stderr = new TextDecoder().decode(output.stderr)
  const stdout = new TextDecoder().decode(output.stdout)

  assertEquals(stderr, "", `Expected no stderr for: linear ${args.join(" ")}`)
  assert(
    output.success,
    `Expected success for: linear ${args.join(" ")}\n${stdout}`,
  )

  return JSON.parse(stdout)
}

async function runLinearTextCommand(
  args: string[],
  env: Record<string, string> = {},
): Promise<string> {
  const output = await runLinearCommand(args, env)
  const stderr = new TextDecoder().decode(output.stderr)
  const stdout = new TextDecoder().decode(output.stdout)

  assertEquals(stderr, "", `Expected no stderr for: linear ${args.join(" ")}`)
  assert(
    output.success,
    `Expected success for: linear ${args.join(" ")}\n${stdout}`,
  )

  return stdout
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

function findCapabilityCommand(
  payload: unknown,
  path: string,
): Record<string, unknown> {
  assert(isRecord(payload), "Expected capabilities payload to be an object")
  assert(Array.isArray(payload.commands), "Expected commands to be an array")

  const command = payload.commands.find((value) =>
    isRecord(value) && value.path === path
  )
  assert(isRecord(command), `Expected capability command: ${path}`)
  return command
}

function assertObjectArrayPayload(
  payload: unknown,
  requiredKeys: string[],
): asserts payload is Record<string, unknown>[] {
  assert(Array.isArray(payload), "Expected an array payload")
  assert(payload.length > 0, "Expected at least one array item")

  const [firstItem] = payload
  assert(isRecord(firstItem), "Expected array items to be objects")

  for (const key of requiredKeys) {
    assert(key in firstItem, `Missing required item key: ${key}`)
  }
}

Deno.test("downstream consumer certification certifies the startup-monitor consumer suite", async () => {
  const defaultPayload = await runLinearJsonCommand(["capabilities", "--json"])
  const compatV1Payload = await runLinearJsonCommand([
    "capabilities",
    "--json",
    "--compat",
    "v1",
  ])

  assert(isRecord(defaultPayload), "Expected default capabilities payload")
  assert(isRecord(compatV1Payload), "Expected compat v1 capabilities payload")
  assertEquals(defaultPayload.schemaVersion, "v2")
  assertEquals(compatV1Payload.schemaVersion, "v1")

  const defaultIssueUpdate = findCapabilityCommand(
    defaultPayload,
    "linear issue update",
  )
  const compatV1IssueUpdate = findCapabilityCommand(
    compatV1Payload,
    "linear issue update",
  )

  assertEquals("schema" in defaultIssueUpdate, true)
  assertEquals("output" in defaultIssueUpdate, true)

  assertEquals("schema" in compatV1IssueUpdate, false)
  assertEquals("output" in compatV1IssueUpdate, false)
  assertEquals("writeSemantics" in compatV1IssueUpdate, false)

  const schema = defaultIssueUpdate.schema
  const output = defaultIssueUpdate.output
  const writeSemantics = defaultIssueUpdate.writeSemantics

  assert(isRecord(schema), "Expected schema metadata in the default v2 shape")
  assert(isRecord(output), "Expected output metadata in the default v2 shape")
  assert(
    isRecord(writeSemantics),
    "Expected write semantics in the default v2 shape",
  )

  assert(Array.isArray(schema.constraints), "Expected schema constraints")
  assert(Array.isArray(schema.examples), "Expected canonical argv examples")
  assert(Array.isArray(schema.defaults), "Expected schema defaults")
  assert(Array.isArray(schema.resolutions), "Expected schema resolutions")

  assert(isRecord(output.preview), "Expected preview output contract")
  assert(isRecord(output.success), "Expected success output contract")

  assert(Array.isArray(output.preview.topLevelFields))
  assert(output.preview.topLevelFields.includes("operation"))
  assert(Array.isArray(output.success.topLevelFields))
  assert(output.success.topLevelFields.includes("receipt"))
  assert(output.success.topLevelFields.includes("operation"))

  assertEquals(writeSemantics.timeoutAware, true)
  assertEquals(writeSemantics.timeoutReconciliation, true)

  await withMockServer(
    [{
      queryName: "GetIssuesForState",
      response: {
        data: {
          issues: {
            nodes: [
              {
                id: "issue-123",
                identifier: "ENG-123",
                title: "Stabilize auth expiry handling",
                url:
                  "https://linear.app/test/issue/ENG-123/stabilize-auth-expiry-handling",
                dueDate: null,
                priority: 2,
                priorityLabel: "High",
                estimate: 3,
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
                updatedAt: "2026-04-05T00:00:00Z",
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
    async (env) => {
      const issueListPayload = await runLinearJsonCommand(["issue", "list"], {
        LINEAR_TEAM_ID: "ENG",
        LINEAR_ISSUE_SORT: "priority",
        ...env,
      })

      assertObjectArrayPayload(issueListPayload, [
        "id",
        "identifier",
        "title",
        "stateName",
        "state",
        "team",
      ])
    },
  )
})

Deno.test("downstream consumer certification certifies the control-plane consumer suite", async () => {
  await withMockServer(
    [
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
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-1" }],
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
              states: {
                nodes: [{
                  id: "state-done-id",
                  name: "Done",
                  type: "completed",
                }],
              },
            },
          },
        },
      },
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-123",
                identifier: "ENG-123",
                title: "Stabilize auth expiry handling",
                url: "https://linear.app/test/issue/ENG-123/auth-expiry",
                dueDate: null,
                assignee: null,
                parent: null,
                state: {
                  name: "Done",
                  color: "#22c55e",
                },
              },
            },
          },
        },
      },
    ],
    async (env) => {
      const resolved = await runLinearJsonCommand(
        ["resolve", "issue", "ENG-123", "--json"],
        env,
      )

      assert(isRecord(resolved), "Expected resolve payload to be an object")
      assertEquals(resolved.status, "resolved")
      assert(isRecord(resolved.resolved), "Expected resolved issue object")
      assertEquals(resolved.resolved.identifier, "ENG-123")

      const preview = await runLinearJsonCommand(
        [
          "issue",
          "update",
          "ENG-123",
          "--state",
          "done",
          "--json",
          "--dry-run",
        ],
        env,
      )

      assert(isRecord(preview), "Expected preview payload to be an object")
      assertEquals(preview.success, true)
      assertEquals(preview.dryRun, true)
      assert(isRecord(preview.operation), "Expected preview operation contract")
      assertEquals(preview.operation.family, "write_operation")
      assertEquals(preview.operation.phase, "preview")
      assertEquals(preview.operation.nextSafeAction, "apply")
      assert(Array.isArray(preview.operation.changes))
      assert(preview.operation.changes.includes("state"))

      const applied = await runLinearJsonCommand(
        [
          "issue",
          "update",
          "ENG-123",
          "--state",
          "done",
          "--json",
        ],
        env,
      )

      assert(isRecord(applied), "Expected apply payload to be an object")
      assertEquals(applied.identifier, "ENG-123")
      assert(isRecord(applied.receipt), "Expected operation receipt")
      assertEquals(applied.receipt.operationId, "issue.update")
      assertEquals(applied.receipt.resource, "issue")
      assertEquals(applied.receipt.action, "update")
      assert(Array.isArray(applied.receipt.appliedChanges))
      assert(applied.receipt.appliedChanges.includes("state"))
      assert(isRecord(applied.operation), "Expected apply operation contract")
      assertEquals(applied.operation.family, "write_operation")
      assertEquals(applied.operation.phase, "apply")
      assert(isRecord(applied.operation.refs), "Expected resolved refs object")
      assertEquals(applied.operation.refs.issueIdentifier, "ENG-123")
      assertEquals(
        applied.operation.nextSafeAction,
        applied.receipt.nextSafeAction,
      )
    },
  )
})

Deno.test("downstream consumer certification certifies the diagnostics consumer suite", async () => {
  await withMockServer(
    [{
      queryName: "GetTeams",
      variables: { filter: undefined, first: 100, after: undefined },
      response: {
        data: {
          teams: {
            nodes: [{
              id: "team-1",
              name: "Engineering",
              key: "ENG",
              description: "Core engineering team",
              icon: "⚙️",
              color: "#22c55e",
              cyclesEnabled: true,
              createdAt: "2026-04-01T00:00:00Z",
              updatedAt: "2026-04-03T00:00:00Z",
              archivedAt: null,
              organization: {
                id: "org-1",
                name: "Acme Corp",
              },
            }],
            pageInfo: {
              hasNextPage: false,
              endCursor: null,
            },
          },
        },
      },
    }],
    async (env) => {
      const diagnosticsPayload = await runLinearJsonCommand(
        ["team", "list", "--json"],
        env,
      )
      assertObjectArrayPayload(diagnosticsPayload, [
        "id",
        "name",
        "key",
        "cyclesEnabled",
        "organization",
      ])

      const humanOutput = await runLinearTextCommand(["team", "list"], env)
      assert(
        humanOutput.includes("KEY"),
        "Expected text output to include KEY header",
      )
      assert(
        humanOutput.includes("NAME"),
        "Expected text output to include NAME header",
      )
      assertEquals(
        humanOutput.trimStart().startsWith("["),
        false,
        "Expected bare team list diagnostics output to remain human-readable text",
      )
    },
  )
})

Deno.test("downstream consumer certification certifies the compatibility-bridge consumer suite", async () => {
  const defaultCapabilities = await runLinearJsonCommand([
    "capabilities",
    "--json",
  ])
  const compatCapabilities = await runLinearJsonCommand([
    "capabilities",
    "--json",
    "--compat",
    "v1",
  ])

  assert(isRecord(defaultCapabilities), "Expected default capabilities payload")
  assert(isRecord(compatCapabilities), "Expected compat capabilities payload")
  assertEquals(defaultCapabilities.schemaVersion, "v2")
  assertEquals(compatCapabilities.schemaVersion, "v1")

  const defaultIssueView = findCapabilityCommand(
    defaultCapabilities,
    "linear issue view",
  )
  const compatIssueView = findCapabilityCommand(
    compatCapabilities,
    "linear issue view",
  )

  assertEquals("schema" in defaultIssueView, true)
  assertEquals("output" in defaultIssueView, true)
  assertEquals("schema" in compatIssueView, false)
  assertEquals("output" in compatIssueView, false)

  await withMockServer(
    [
      {
        queryName: "GetTeams",
        variables: { filter: undefined, first: 100, after: undefined },
        response: {
          data: {
            teams: {
              nodes: [{
                id: "team-1",
                name: "Engineering",
                key: "ENG",
                description: "Core engineering team",
                icon: "⚙️",
                color: "#22c55e",
                cyclesEnabled: true,
                createdAt: "2026-04-01T00:00:00Z",
                updatedAt: "2026-04-03T00:00:00Z",
                archivedAt: null,
                organization: {
                  id: "org-1",
                  name: "Acme Corp",
                },
              }],
              pageInfo: {
                hasNextPage: false,
                endCursor: null,
              },
            },
          },
        },
      },
      {
        queryName: "GetIssueDetailsWithComments",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              identifier: "ENG-123",
              title: "Fix authentication expiry handling",
              description: "Investigate the auth timeout edge case.",
              url:
                "https://linear.app/test-team/issue/ENG-123/fix-authentication-expiry-handling",
              branchName: "eng-123-fix-authentication-expiry-handling",
              state: {
                name: "In Progress",
                color: "#f87462",
              },
              project: null,
              projectMilestone: null,
              parent: null,
              children: {
                nodes: [],
              },
              comments: {
                nodes: [],
                pageInfo: {
                  hasNextPage: false,
                },
              },
              attachments: {
                nodes: [],
              },
            },
          },
        },
      },
    ],
    async (env) => {
      const diagnosticsPayload = await runLinearJsonCommand(
        ["team", "list", "--json"],
        env,
      )

      assertObjectArrayPayload(diagnosticsPayload, [
        "id",
        "name",
        "key",
        "cyclesEnabled",
        "organization",
      ])

      const humanIssueOutput = await runLinearTextCommand(
        ["issue", "view", "ENG-123", "--text"],
        env,
      )

      assert(
        humanIssueOutput.includes(
          "# ENG-123: Fix authentication expiry handling",
        ),
        "Expected human issue output to include the issue heading",
      )
      assertEquals(
        humanIssueOutput.trimStart().startsWith("{"),
        false,
        "Expected --text issue diagnostics output to remain human-readable",
      )
    },
  )
})

Deno.test("downstream consumer certification certifies the timeout-recovery consumer suite", async () => {
  const output = await withMockServer(
    [
      {
        queryName: "GetTeamIdByKey",
        variables: { team: "ENG" },
        response: {
          data: {
            teams: {
              nodes: [{ id: "team-eng-id" }],
            },
          },
        },
      },
      {
        queryName: "UpdateIssue",
        response: {
          data: {
            issueUpdate: {
              success: true,
              issue: {
                id: "issue-existing-123",
                identifier: "ENG-123",
                title: "Updated with timeout reconciliation",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation",
                dueDate: null,
                assignee: null,
                parent: null,
                state: {
                  name: "Todo",
                  color: "#bec2c8",
                },
              },
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
                id: "comment-json-timeout-123",
                body: "Investigating now",
                createdAt: "2026-03-30T12:00:00Z",
                url:
                  "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation#comment-json-timeout-123",
                parent: null,
                issue: {
                  id: "issue-existing-123",
                  identifier: "ENG-123",
                  title: "Updated with timeout reconciliation",
                  url:
                    "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation",
                },
                user: {
                  name: "alice.bot",
                  displayName: "Alice Bot",
                },
              },
            },
          },
        },
      },
      {
        queryName: "GetIssueCommentsForTimeoutReconciliation",
        variables: { id: "ENG-123" },
        response: {
          data: {
            issue: {
              id: "issue-existing-123",
              identifier: "ENG-123",
              title: "Updated with timeout reconciliation",
              url:
                "https://linear.app/test-team/issue/ENG-123/updated-with-timeout-reconciliation",
              comments: {
                nodes: [],
              },
            },
          },
        },
      },
    ],
    (env) =>
      runLinearCommand([
        "issue",
        "update",
        "ENG-123",
        "--title",
        "Updated with timeout reconciliation",
        "--comment",
        "Investigating now",
        "--json",
        "--timeout-ms",
        "50",
      ], env),
  )

  const stderr = new TextDecoder().decode(output.stderr)
  const stdout = new TextDecoder().decode(output.stdout)

  assertEquals(stderr, "", "Expected timeout contract to stay JSON-only")
  assertEquals(output.success, false)
  assertEquals(output.code, 6)

  const payload = JSON.parse(stdout)
  assert(isRecord(payload), "Expected timeout payload to be an object")
  assertEquals(payload.success, false)
  assert(isRecord(payload.error), "Expected error envelope")
  assertEquals(payload.error.type, "timeout_error")
  assert(isRecord(payload.error.details), "Expected timeout details")
  assertEquals(payload.error.details.outcome, "partial_success")
  assertEquals(payload.error.details.appliedState, "partially_applied")
  assertEquals(payload.error.details.failureStage, "comment_create")
  assert(isRecord(payload.error.details.callerGuidance))
  assertEquals(
    payload.error.details.callerGuidance.nextAction,
    "resume_partial_write",
  )
  assertEquals(payload.error.details.callerGuidance.readBeforeRetry, false)
  assert(isRecord(payload.error.details.partialSuccess))
  assertEquals(payload.error.details.partialSuccess.issueUpdated, true)
  assertEquals(payload.error.details.partialSuccess.commentAttempted, true)
})
