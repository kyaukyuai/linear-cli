import { assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { snapshotTest } from "@cliffy/testing"
import { readCommand } from "../../../src/commands/notification/notification-read.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

const repoRoot = fromFileUrl(new URL("../../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../../src/main.ts", import.meta.url))

await snapshotTest({
  name: "Notification Read Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await readCommand.parse()
  },
})

Deno.test(
  "Notification Read Command - JSON Timeout Reconciles To Probably Succeeded",
  async () => {
    const server = new MockLinearServer([
      {
        queryName: "GetNotificationForRead",
        variables: { id: "notif-1" },
        consume: true,
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              readAt: null,
              archivedAt: null,
            },
          },
        },
      },
      {
        queryName: "ReadNotification",
        delayMs: 250,
        response: {
          data: {
            notificationUpdate: {
              success: true,
              notification: {
                id: "notif-1",
                title: "ENG-123 was assigned to you",
                readAt: "2026-03-30T12:20:00Z",
                archivedAt: null,
              },
            },
          },
        },
      },
      {
        queryName: "GetNotificationForRead",
        variables: { id: "notif-1" },
        consume: true,
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              readAt: "2026-03-30T12:20:00Z",
              archivedAt: null,
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runNotificationReadSubprocess([
        "notif-1",
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
      assertEquals(payload.error.details.appliedState, "applied")
      assertEquals(payload.error.details.callerGuidance, {
        nextAction: "treat_as_applied",
        readBeforeRetry: false,
      })
      assertEquals(
        payload.error.details.notification.readAt,
        "2026-03-30T12:20:00Z",
      )
    } finally {
      await server.stop()
    }
  },
)

async function runNotificationReadSubprocess(
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
      "notification",
      "read",
      ...args,
    ],
    cwd: repoRoot,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output()
}

await snapshotTest({
  name: "Notification Read Command - Marks As Read",
  meta: import.meta,
  colors: false,
  args: ["notif-1"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetNotificationForRead",
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              readAt: null,
              archivedAt: null,
            },
          },
        },
      },
      {
        queryName: "ReadNotification",
        response: {
          data: {
            notificationUpdate: {
              success: true,
              notification: {
                id: "notif-1",
                title: "ENG-123 was assigned to you",
                readAt: "2026-03-13T07:00:00Z",
                archivedAt: null,
              },
            },
          },
        },
      },
    ])

    try {
      await readCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Notification Read Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["notif-1", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetNotificationForRead",
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              readAt: null,
              archivedAt: null,
            },
          },
        },
      },
      {
        queryName: "ReadNotification",
        response: {
          data: {
            notificationUpdate: {
              success: true,
              notification: {
                id: "notif-1",
                title: "ENG-123 was assigned to you",
                readAt: "2026-03-13T07:00:00Z",
                archivedAt: null,
              },
            },
          },
        },
      },
    ])

    try {
      await readCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Notification Read Command - Already Read",
  meta: import.meta,
  colors: false,
  args: ["notif-1", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetNotificationForRead",
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              readAt: "2026-03-13T07:00:00Z",
              archivedAt: null,
            },
          },
        },
      },
    ])

    try {
      await readCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
