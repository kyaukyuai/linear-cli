import { Command } from "@cliffy/command"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

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
  .action(async ({ json }, notificationId) => {
    try {
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

          const mutation = await client.request(ArchiveNotification, {
            id: notificationId,
          })

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
        console.log(JSON.stringify(
          {
            id: notification.id,
            title: notification.title,
            archivedAt: notification.archivedAt,
            readAt: notification.readAt,
            noOp: result.noOp,
          },
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
      handleError(error, "Failed to archive notification")
    }
  })
