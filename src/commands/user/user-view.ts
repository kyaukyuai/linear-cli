import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { NotFoundError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildUserDetailJsonPayload } from "./user-json.ts"

const GetUser = gql(`
  query GetUser($id: String!) {
    user(id: $id) {
      id
      name
      displayName
      email
      active
      guest
      app
      isAssignable
      isMentionable
      description
      statusEmoji
      statusLabel
      timezone
      lastSeen
      createdAt
      updatedAt
      archivedAt
      url
      organization {
        name
        urlKey
      }
    }
  }
`)

export const viewCommand = new Command()
  .name("view")
  .description("View a user")
  .arguments("<userId:string>")
  .option("-j, --json", "Output as JSON")
  .example(
    "View a user as JSON",
    "linear user view user-123 --json",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(error, cmd, "Failed to view user")
  })
  .action(async ({ json }, userId) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetUser, { id: userId }),
        { enabled: !json },
      )

      const user = result.user
      if (user == null) {
        throw new NotFoundError("User", userId)
      }

      if (json) {
        console.log(JSON.stringify(buildUserDetailJsonPayload(user), null, 2))
        return
      }

      console.log(bold(user.displayName))
      console.log(`${gray("ID:")} ${user.id}`)
      console.log(`${gray("Email:")} ${user.email}`)
      console.log(`${gray("Username:")} ${user.name}`)
      console.log(`${gray("Workspace:")} ${user.organization.name}`)
      console.log(`${gray("Profile:")} ${user.url}`)
      console.log(`${gray("Active:")} ${user.active ? "yes" : "no"}`)
      console.log(`${gray("Guest:")} ${user.guest ? "yes" : "no"}`)
      console.log(`${gray("App:")} ${user.app ? "yes" : "no"}`)
      console.log(
        `${gray("Assignable:")} ${user.isAssignable ? "yes" : "no"}`,
      )
      console.log(
        `${gray("Mentionable:")} ${user.isMentionable ? "yes" : "no"}`,
      )
      if (user.description != null) {
        console.log(`${gray("Description:")} ${user.description}`)
      }
      if (user.statusEmoji != null && user.statusLabel != null) {
        console.log(
          `${gray("Status:")} ${user.statusEmoji} ${user.statusLabel}`,
        )
      }
      if (user.timezone != null) {
        console.log(`${gray("Timezone:")} ${user.timezone}`)
      }
      if (user.lastSeen != null) {
        console.log(`${gray("Last seen:")} ${user.lastSeen}`)
      }
      console.log(`${gray("Created:")} ${user.createdAt}`)
      console.log(`${gray("Updated:")} ${user.updatedAt}`)
      if (user.archivedAt != null) {
        console.log(`${gray("Archived:")} ${user.archivedAt}`)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to view user", json)
    }
  })
