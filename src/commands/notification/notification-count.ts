import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"

const GetNotificationUnreadCount = gql(`
  query GetNotificationUnreadCount {
    notificationsUnreadCount
  }
`)

export const countCommand = new Command()
  .name("count")
  .description("Show unread notification count")
  .option("-j, --json", "Output as JSON")
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to count notifications",
    )
  )
  .action(async ({ json }) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetNotificationUnreadCount),
        { enabled: !json },
      )

      const unread = result.notificationsUnreadCount

      if (json) {
        console.log(JSON.stringify({ unread }, null, 2))
        return
      }

      const suffix = unread === 1 ? "" : "s"
      console.log(`${unread} unread notification${suffix}`)
    } catch (error) {
      handleAutomationCommandError(error, "Failed to count notifications", json)
    }
  })
