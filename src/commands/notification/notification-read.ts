import { Command } from "@cliffy/command"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

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
  .action(async ({ json }, notificationId) => {
    try {
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

          const mutation = await client.request(ReadNotification, {
            id: notificationId,
            readAt: new Date().toISOString(),
          })

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
      handleError(error, "Failed to mark notification as read")
    }
  })
