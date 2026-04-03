import { Command } from "@cliffy/command"
import { Input, Select } from "@cliffy/prompt"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import { ensureInteractiveInputAvailable } from "../../utils/interactive.ts"
import { CliError, handleError, ValidationError } from "../../utils/errors.ts"

export const createCommand = new Command()
  .name("create")
  .description("Create a linear team")
  .option("-n, --name <name:string>", "Name of the team")
  .option("-d, --description <description:string>", "Description of the team")
  .option("-i, --interactive", "Enable interactive prompts")
  .option(
    "-k, --key <key:string>",
    "Team key (if not provided, will be generated from name)",
  )
  .option("--private", "Make the team private")
  .option(
    "--no-interactive",
    "Accepted for compatibility; team create is non-interactive by default",
  )
  .action(
    async ({
      name,
      description,
      interactive,
      key,
      private: isPrivate,
    }) => {
      const useInteractive = interactive === true
      if (useInteractive) {
        ensureInteractiveInputAvailable(
          { interactive },
          "Interactive team creation requested",
        )
      }

      const { Spinner } = await import("@std/cli/unstable-spinner")
      const showSpinner = shouldShowSpinner() && useInteractive
      const spinner = showSpinner ? new Spinner() : null

      try {
        if (useInteractive) {
          console.log("Creating a new team...\n")

          // Prompt for name
          name = await Input.prompt({
            message: "Team name:",
            validate: (input: string) => {
              if (!input || input.trim().length === 0) {
                return "Team name is required"
              }
              return true
            },
          })

          // Prompt for description
          description = await Input.prompt({
            message: "Team description (optional):",
          }) || undefined

          // Prompt for key
          key = await Input.prompt({
            message:
              "Team key (optional, will be generated from name if not provided):",
          }) || undefined

          // Prompt for privacy
          const privacyChoice = await Select.prompt({
            message: "Team visibility:",
            options: [
              { name: "Public", value: "public" },
              { name: "Private", value: "private" },
            ],
            default: "public",
          })
          isPrivate = privacyChoice === "private" ? true : undefined

          console.log(`\nCreating team "${name}"...`)

          const createTeamMutation = gql(`
            mutation CreateTeam($input: TeamCreateInput!) {
              teamCreate(input: $input) {
                success
                team { id, name, key }
              }
            }
          `)

          const client = getGraphQLClient()
          const data = await client.request(createTeamMutation, {
            input: {
              name: name,
              description: description || undefined,
              key: key || undefined,
              private: isPrivate || undefined,
            },
          })

          if (!data.teamCreate.success) {
            throw new CliError("Team creation failed")
          }

          const team = data.teamCreate.team
          if (!team) {
            throw new CliError("Team creation failed - no team returned")
          }

          console.log(`✓ Created team ${team.key}: ${team.name}`)
          return
        }

        // Fallback to flag-based mode
        if (!name) {
          throw new ValidationError(
            "Team name is required unless --profile human-debug --interactive is used",
            {
              suggestion:
                "Use --name, or pass --profile human-debug --interactive.",
            },
          )
        }

        console.log(`Creating team "${name}"`)
        spinner?.start()

        const createTeamMutation = gql(`
          mutation CreateTeam($input: TeamCreateInput!) {
            teamCreate(input: $input) {
              success
              team { id, name, key }
            }
          }
        `)

        const client = getGraphQLClient()
        const data = await client.request(createTeamMutation, {
          input: {
            name,
            description: description || undefined,
            key: key || undefined,
            private: isPrivate || undefined,
          },
        })

        if (!data.teamCreate.success) {
          throw new CliError("Team creation failed")
        }

        const team = data.teamCreate.team
        if (!team) {
          throw new CliError("Team creation failed - no team returned")
        }

        spinner?.stop()
        console.log(`✓ Created team ${team.key}: ${team.name}`)
      } catch (error) {
        spinner?.stop()
        handleError(error, "Failed to create team")
      }
    },
  )
