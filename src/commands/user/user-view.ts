import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

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
  .action(async ({ json }, userId) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetUser, { id: userId }),
        { enabled: !json },
      )

      const user = result.user

      if (json) {
        console.log(JSON.stringify(
          {
            id: user.id,
            name: user.name,
            displayName: user.displayName,
            email: user.email,
            active: user.active,
            guest: user.guest,
            app: user.app,
            isAssignable: user.isAssignable,
            isMentionable: user.isMentionable,
            description: user.description,
            statusEmoji: user.statusEmoji,
            statusLabel: user.statusLabel,
            timezone: user.timezone,
            lastSeen: user.lastSeen,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            archivedAt: user.archivedAt,
            url: user.url,
            organization: {
              name: user.organization.name,
              urlKey: user.organization.urlKey,
            },
          },
          null,
          2,
        ))
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
      handleError(error, "Failed to view user")
    }
  })
