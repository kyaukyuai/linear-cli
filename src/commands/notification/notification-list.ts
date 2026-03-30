import { Command } from "@cliffy/command"
import { bold, gray, yellow } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { truncateText } from "../../utils/display.ts"
import { ValidationError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  buildNotificationJsonPayload,
  getNotificationActorName,
  getNotificationStatus,
} from "./notification-json.ts"

const GetNotifications = gql(`
  query GetNotifications($first: Int!, $includeArchived: Boolean) {
    notifications(first: $first, includeArchived: $includeArchived) {
      nodes {
        id
        type
        title
        subtitle
        url
        inboxUrl
        createdAt
        readAt
        archivedAt
        snoozedUntilAt
        actor {
          name
          displayName
        }
      }
    }
  }
`)

export const listCommand = new Command()
  .name("list")
  .description("List notifications")
  .option("-n, --limit <limit:number>", "Maximum number of notifications", {
    default: 20,
  })
  .option("--include-archived", "Include archived notifications")
  .option("--unread", "Show only unread notifications")
  .option("-j, --json", "Output as JSON")
  .option("--no-pager", "Disable automatic paging for long output")
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to list notifications",
    )
  )
  .action(async ({ limit, includeArchived, unread, json }) => {
    try {
      if (limit < 1 || limit > 100) {
        throw new ValidationError("Limit must be between 1 and 100")
      }

      const client = getGraphQLClient()
      const result = await withSpinner(
        () =>
          client.request(GetNotifications, { first: limit, includeArchived }),
        { enabled: !json },
      )

      const notifications = result.notifications.nodes.filter((notification) =>
        unread ? notification.readAt == null : true
      )

      if (json) {
        console.log(JSON.stringify(
          notifications.map(buildNotificationJsonPayload),
          null,
          2,
        ))
        return
      }

      if (notifications.length === 0) {
        console.log("No notifications found.")
        return
      }

      const { columns } = Deno.stdout.isTerminal()
        ? Deno.consoleSize()
        : { columns: 120 }
      const titleWidth = Math.max(20, columns - 28)

      for (const notification of notifications) {
        const status = getNotificationStatus(notification)
        const actor = getNotificationActorName(notification)
        const title = truncateText(notification.title, titleWidth)

        const statusLabel = status === "unread"
          ? yellow(status.toUpperCase())
          : gray(status.toUpperCase())

        console.log(
          `${statusLabel} ${notification.createdAt} ${notification.id}`,
        )
        console.log(`  ${bold(title)}`)
        if (notification.subtitle) {
          console.log(`  ${truncateText(notification.subtitle, titleWidth)}`)
        }
        if (actor != null) {
          console.log(gray(`  actor: ${actor}`))
        }
        console.log("")
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to list notifications", json)
    }
  })
