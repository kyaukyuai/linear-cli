import { assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { snapshotTest } from "@cliffy/testing"
import { archiveCommand } from "../../../src/commands/notification/notification-archive.ts"
import { MockLinearServer } from "../../utils/mock_linear_server.ts"
import {
  commonDenoArgs,
  setupMockLinearServer,
} from "../../utils/test-helpers.ts"

const repoRoot = fromFileUrl(new URL("../../../", import.meta.url))
const denoJsonPath = fromFileUrl(new URL("../../../deno.json", import.meta.url))
const mainPath = fromFileUrl(new URL("../../../src/main.ts", import.meta.url))

await snapshotTest({
  name: "Notification Archive Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs: commonDenoArgs,
  async fn() {
    await archiveCommand.parse()
  },
})

Deno.test(
  "Notification Archive Command - JSON Timeout Reconciles To Probably Succeeded",
  async () => {
    const server = new MockLinearServer([
      {
        queryName: "GetNotificationForArchive",
        variables: { id: "notif-1" },
        consume: true,
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              archivedAt: null,
              readAt: "2026-03-13T07:00:00Z",
            },
          },
        },
      },
      {
        queryName: "ArchiveNotification",
        delayMs: 250,
        response: {
          data: {
            notificationArchive: {
              success: true,
              entity: {
                id: "notif-1",
                title: "ENG-123 was assigned to you",
                archivedAt: "2026-03-30T12:25:00Z",
                readAt: "2026-03-13T07:00:00Z",
              },
            },
          },
        },
      },
      {
        queryName: "GetNotificationForArchive",
        variables: { id: "notif-1" },
        consume: true,
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              archivedAt: "2026-03-30T12:25:00Z",
              readAt: "2026-03-13T07:00:00Z",
            },
          },
        },
      },
    ])

    try {
      await server.start()

      const output = await runNotificationArchiveSubprocess([
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
      assertEquals(
        payload.error.details.notification.archivedAt,
        "2026-03-30T12:25:00Z",
      )
    } finally {
      await server.stop()
    }
  },
)

async function runNotificationArchiveSubprocess(
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
      "archive",
      ...args,
    ],
    cwd: repoRoot,
    env,
    stdout: "piped",
    stderr: "piped",
  }).output()
}

await snapshotTest({
  name: "Notification Archive Command - Archives Notification",
  meta: import.meta,
  colors: false,
  args: ["notif-1"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetNotificationForArchive",
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              archivedAt: null,
              readAt: "2026-03-13T07:00:00Z",
            },
          },
        },
      },
      {
        queryName: "ArchiveNotification",
        response: {
          data: {
            notificationArchive: {
              success: true,
              entity: {
                id: "notif-1",
                title: "ENG-123 was assigned to you",
                archivedAt: "2026-03-13T07:05:00Z",
                readAt: "2026-03-13T07:00:00Z",
              },
            },
          },
        },
      },
    ])

    try {
      await archiveCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Notification Archive Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: ["notif-1", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetNotificationForArchive",
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              archivedAt: null,
              readAt: "2026-03-13T07:00:00Z",
            },
          },
        },
      },
      {
        queryName: "ArchiveNotification",
        response: {
          data: {
            notificationArchive: {
              success: true,
              entity: {
                id: "notif-1",
                title: "ENG-123 was assigned to you",
                archivedAt: "2026-03-13T07:05:00Z",
                readAt: "2026-03-13T07:00:00Z",
              },
            },
          },
        },
      },
    ])

    try {
      await archiveCommand.parse()
    } finally {
      await cleanup()
    }
  },
})

await snapshotTest({
  name: "Notification Archive Command - Already Archived",
  meta: import.meta,
  colors: false,
  args: ["notif-1", "--json"],
  denoArgs: commonDenoArgs,
  async fn() {
    const { cleanup } = await setupMockLinearServer([
      {
        queryName: "GetNotificationForArchive",
        response: {
          data: {
            notification: {
              id: "notif-1",
              title: "ENG-123 was assigned to you",
              archivedAt: "2026-03-13T07:05:00Z",
              readAt: "2026-03-13T07:00:00Z",
            },
          },
        },
      },
    ])

    try {
      await archiveCommand.parse()
    } finally {
      await cleanup()
    }
  },
})
