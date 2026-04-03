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
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../utils/operation_receipt.ts"

const GetNotificationForArchive = gql(`
  query GetNotificationForArchive($id: String!) {
    notification(id: $id) {
      id
      title
      archivedAt
      readAt
    }
  }
`)

const ArchiveNotification = gql(`
  mutation ArchiveNotification($id: String!) {
    notificationArchive(id: $id) {
      success
      entity {
        id
        title
        archivedAt
        readAt
      }
    }
  }
`)

export const archiveCommand = new Command()
  .name("archive")
  .description("Archive a notification")
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
      "Failed to archive notification",
    )
  )
  .action(async ({ json, timeoutMs }, notificationId) => {
    try {
      const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
      const client = getGraphQLClient()
      const result = await withSpinner(
        async () => {
          const current = await client.request(GetNotificationForArchive, {
            id: notificationId,
          })

          if (current.notification.archivedAt != null) {
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
                  document: ArchiveNotification,
                  variables: { id: notificationId },
                  signal,
                }),
              {
                operation: "notification archive",
                timeoutMs: writeTimeoutMs,
                suggestion: buildWriteTimeoutSuggestion(),
              },
            )
          } catch (error) {
            if (isWriteTimeoutError(error)) {
              await reconcileWriteTimeoutError(error, async () => {
                const reconciled = await client.request(
                  GetNotificationForArchive,
                  {
                    id: notificationId,
                  },
                )

                if (reconciled.notification?.archivedAt != null) {
                  return {
                    outcome: "probably_succeeded",
                    suggestion:
                      "Linear now shows the notification as archived. Treat this write as succeeded; retrying it would be a no-op.",
                    details: {
                      notification: {
                        id: reconciled.notification.id,
                        title: reconciled.notification.title,
                        archivedAt: reconciled.notification.archivedAt,
                        readAt: reconciled.notification.readAt,
                      },
                      noOp: false,
                    },
                  }
                }

                return {
                  outcome: "definitely_failed",
                  suggestion:
                    "Linear does not yet show the notification as archived. Re-check it before retrying this write.",
                  details: {
                    notification: {
                      id: reconciled.notification?.id ?? notificationId,
                      title: reconciled.notification?.title ?? null,
                      archivedAt: reconciled.notification?.archivedAt ?? null,
                      readAt: reconciled.notification?.readAt ?? null,
                    },
                    noOp: false,
                  },
                }
              })
            }
            throw error
          }

          if (
            !mutation.notificationArchive.success ||
            !mutation.notificationArchive.entity
          ) {
            throw new Error("Failed to archive notification")
          }

          return {
            noOp: false,
            notification: mutation.notificationArchive.entity,
          }
        },
        { enabled: !json },
      )
      const notification = result.notification

      if (json) {
        const notificationPayload = {
          id: notification.id,
          title: notification.title,
          archivedAt: notification.archivedAt,
          readAt: notification.readAt,
          noOp: result.noOp,
        }
        const receipt = buildOperationReceipt({
          operationId: "notification.archive",
          resource: "notification",
          action: "archive",
          resolvedRefs: {
            notificationId: notification.id,
          },
          appliedChanges: result.noOp ? [] : ["archivedAt"],
          noOp: result.noOp,
          nextSafeAction: "continue",
        })
        console.log(JSON.stringify(
          withOperationReceipt(notificationPayload, receipt),
          null,
          2,
        ))
        return
      }

      if (result.noOp) {
        console.log(
          green("✓") + ` Notification already archived: ${notification.id}`,
        )
        return
      }

      console.log(
        green("✓") + ` Archived notification: ${notification.id}`,
      )
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to archive notification",
        json,
      )
    }
  })
