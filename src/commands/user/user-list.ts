import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError, ValidationError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

const GetUsers = gql(`
  query GetUsers($first: Int!, $includeDisabled: Boolean) {
    users(first: $first, includeDisabled: $includeDisabled) {
      nodes {
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
      }
    }
  }
`)

export const listCommand = new Command()
  .name("list")
  .description("List users in the workspace")
  .option("-n, --limit <limit:number>", "Maximum number of users", {
    default: 50,
  })
  .option("-a, --all", "Include disabled users")
  .option("-j, --json", "Output as JSON")
  .action(async ({ limit, all, json }) => {
    try {
      if (limit < 1 || limit > 250) {
        throw new ValidationError("Limit must be between 1 and 250")
      }

      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetUsers, { first: limit, includeDisabled: all }),
        { enabled: !json },
      )

      const users = [...result.users.nodes].sort((a, b) =>
        a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
      )

      if (json) {
        console.log(JSON.stringify(
          users.map((user) => ({
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
          })),
          null,
          2,
        ))
        return
      }

      if (users.length === 0) {
        console.log("No users found.")
        return
      }

      for (const user of users) {
        const flags = [
          user.active ? null : "inactive",
          user.guest ? "guest" : null,
          user.app ? "app" : null,
          user.isAssignable ? null : "not assignable",
          user.isMentionable ? null : "not mentionable",
        ].filter((value) => value != null)

        console.log(
          `${bold(user.displayName)} ${gray(user.id)}`,
        )
        console.log(`  ${user.email}`)
        if (user.name !== user.displayName) {
          console.log(gray(`  username: ${user.name}`))
        }
        if (user.description != null) {
          console.log(gray(`  description: ${user.description}`))
        }
        if (user.statusEmoji != null && user.statusLabel != null) {
          console.log(gray(`  status: ${user.statusEmoji} ${user.statusLabel}`))
        }
        if (user.timezone != null) {
          console.log(gray(`  timezone: ${user.timezone}`))
        }
        if (flags.length > 0) {
          console.log(gray(`  flags: ${flags.join(", ")}`))
        }
        console.log("")
      }
    } catch (error) {
      handleError(error, "Failed to list users")
    }
  })
