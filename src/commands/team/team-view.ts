import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { NotFoundError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { requireTeamKey } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildTeamJsonPayload } from "./team-json.ts"

const GetTeam = gql(`
  query GetTeam($id: String!) {
    team(id: $id) {
      id
      name
      key
      description
      icon
      color
      cyclesEnabled
      createdAt
      updatedAt
      archivedAt
      organization {
        id
        name
      }
    }
  }
`)

export const viewCommand = new Command()
  .name("view")
  .description("View a team")
  .arguments("[teamKey:string]")
  .option("-j, --json", "Output as JSON")
  .example(
    "View a team as JSON",
    "linear team view ENG --json",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(error, cmd, "Failed to view team")
  })
  .action(async ({ json }, teamKey?: string) => {
    try {
      const resolvedTeamKey = requireTeamKey(teamKey)
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetTeam, { id: resolvedTeamKey }),
        { enabled: !json },
      )

      const team = result.team
      if (team == null) {
        throw new NotFoundError("Team", resolvedTeamKey)
      }

      if (json) {
        console.log(JSON.stringify(buildTeamJsonPayload(team), null, 2))
        return
      }

      console.log(bold(team.name))
      console.log(`${gray("ID:")} ${team.id}`)
      console.log(`${gray("Key:")} ${team.key}`)
      if (team.description != null) {
        console.log(`${gray("Description:")} ${team.description}`)
      }
      if (team.icon != null) {
        console.log(`${gray("Icon:")} ${team.icon}`)
      }
      if (team.color != null) {
        console.log(`${gray("Color:")} ${team.color}`)
      }
      console.log(
        `${gray("Cycles enabled:")} ${team.cyclesEnabled ? "yes" : "no"}`,
      )
      if (team.organization != null) {
        console.log(`${gray("Organization:")} ${team.organization.name}`)
      }
      console.log(`${gray("Created:")} ${team.createdAt}`)
      console.log(`${gray("Updated:")} ${team.updatedAt}`)
      if (team.archivedAt != null) {
        console.log(`${gray("Archived:")} ${team.archivedAt}`)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to view team", json)
    }
  })
