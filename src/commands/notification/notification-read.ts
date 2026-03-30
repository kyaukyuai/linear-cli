import { Command } from "@cliffy/command"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  buildWriteTimeoutSuggestion,
  resolveWriteTimeoutMs,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"
import { isWriteTimeoutError } from "../../utils/errors.ts"
import { reconcileWriteTimeoutError } from "../../utils/write_reconciliation.ts"

const GetNotificationForRead = gql(`
  query GetNotificationForRead($id: String!) {
    notification(id: $id) {
      id
      title
      readAt
      archivedAt
    }
  }
`)

const ReadNotification = gql(`
  mutation ReadNotification($id: String!, $readAt: DateTime!) {
    notificationUpdate(id: $id, input: { readAt: $readAt }) {
      success
      notification {
        id
        title
        readAt
        archivedAt
      }
    }
  }
`)

export const readCommand = new Command()
  .name("read")
  .description("Mark a notification as read")
  .arguments("<notificationId:string>")
  .option("-j, --json", "Output as JSON")
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to mark notification as read",
    )
  )
  .action(async ({ json, timeoutMs }, notificationId) => {
    try {
      const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
      const client = getGraphQLClient()
      const result = await withSpinner(
        async () => {
          const current = await client.request(GetNotificationForRead, {
            id: notificationId,
          })

          if (current.notification.readAt != null) {
            return {
              noOp: true,
              notification: current.notification,
            }
          }

          let mutation
          try {
            mutation = await withWriteTimeout(
              (signal) =>
                client.request({
                  document: ReadNotification,
                  variables: {
                    id: notificationId,
                    readAt: new Date().toISOString(),
                  },
                  signal,
                }),
              {
                operation: "notification read",
                timeoutMs: writeTimeoutMs,
                suggestion: buildWriteTimeoutSuggestion(),
              },
            )
          } catch (error) {
            if (isWriteTimeoutError(error)) {
              await reconcileWriteTimeoutError(error, async () => {
                const reconciled = await client.request(
                  GetNotificationForRead,
                  {
                    id: notificationId,
                  },
                )

                if (reconciled.notification?.readAt != null) {
                  return {
                    outcome: "probably_succeeded",
                    suggestion:
                      "Linear now shows the notification as read. Treat this write as succeeded; retrying it would be a no-op.",
                    details: {
                      notification: {
                        id: reconciled.notification.id,
                        title: reconciled.notification.title,
                        readAt: reconciled.notification.readAt,
                        archivedAt: reconciled.notification.archivedAt,
                      },
                      noOp: false,
                    },
                  }
                }

                return {
                  outcome: "definitely_failed",
                  suggestion:
                    "Linear does not yet show the notification as read. Re-check it before retrying this write.",
                  details: {
                    notification: {
                      id: reconciled.notification?.id ?? notificationId,
                      title: reconciled.notification?.title ?? null,
                      readAt: reconciled.notification?.readAt ?? null,
                      archivedAt: reconciled.notification?.archivedAt ?? null,
                    },
                    noOp: false,
                  },
                }
              })
            }
            throw error
          }

          if (
            !mutation.notificationUpdate.success ||
            !mutation.notificationUpdate.notification
          ) {
            throw new Error("Failed to mark notification as read")
          }

          return {
            noOp: false,
            notification: mutation.notificationUpdate.notification,
          }
        },
        { enabled: !json },
      )
      const notification = result.notification

      if (json) {
        console.log(JSON.stringify(
          {
            id: notification.id,
            title: notification.title,
            readAt: notification.readAt,
            archivedAt: notification.archivedAt,
            noOp: result.noOp,
          },
          null,
          2,
        ))
        return
      }

      if (result.noOp) {
        console.log(
          green("✓") +
            ` Notification already marked as read: ${notification.id}`,
        )
        return
      }

      console.log(
        green("✓") + ` Marked notification as read: ${notification.id}`,
      )
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to mark notification as read",
        json,
      )
    }
  })
