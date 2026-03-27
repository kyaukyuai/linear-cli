import { Command } from "@cliffy/command"
import { renderMarkdown } from "@littletof/charmd"
import { gql } from "../../__codegen__/gql.ts"
import { buildCycleDetailJsonPayload } from "./cycle-json.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { getTeamIdByKey, requireTeamKey } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { NotFoundError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"

const GetUpcomingCycles = gql(`
  query GetUpcomingCycles($teamId: String!) {
    team(id: $teamId) {
      id
      key
      name
      cycles(filter: { startsAt: { gt: "now" } }, first: 10) {
        nodes {
          id
          number
          name
          description
          startsAt
          endsAt
          completedAt
          isActive
          isFuture
          isPast
          progress
          createdAt
          updatedAt
          issues {
            nodes {
              id
              identifier
              title
              state {
                name
                type
                color
              }
            }
          }
        }
      }
    }
  }
`)

export const nextCommand = new Command()
  .name("next")
  .description("Show the next upcoming cycle for a team")
  .option("--team <team:string>", "Team key (defaults to current team)")
  .option("-j, --json", "Output as JSON")
  .example(
    "Show the next cycle as JSON",
    "linear cycle next --team ENG --json",
  )
  .example(
    "Show the next cycle for the default team",
    "linear cycle next",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(error, cmd, "Failed to get next cycle")
  )
  .action(async ({ team, json }) => {
    try {
      const teamKey = requireTeamKey(team)
      const teamId = await getTeamIdByKey(teamKey)
      if (!teamId) {
        throw new NotFoundError("Team", teamKey)
      }

      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetUpcomingCycles, { teamId }),
        { enabled: !json },
      )

      const cycles = (result.team?.cycles?.nodes || [])
        .sort((a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
        )
      const cycle = cycles[0]

      if (!cycle) {
        if (json) {
          console.log("null")
        } else {
          console.log(`No upcoming cycle found for team ${teamKey}`)
        }
        return
      }

      if (json) {
        const teamRef = result.team == null
          ? { id: teamId, key: teamKey, name: teamKey }
          : {
            id: result.team.id,
            key: result.team.key,
            name: result.team.name,
          }
        console.log(JSON.stringify(
          buildCycleDetailJsonPayload(cycle, teamRef),
          null,
          2,
        ))
        return
      }

      // Print cycle header
      const cycleName = cycle.name || `Cycle ${cycle.number}`
      console.log(`# ${cycleName}`)
      console.log("")

      // Print cycle details
      console.log(`Number: ${cycle.number}`)
      console.log(`Starts: ${new Date(cycle.startsAt).toLocaleDateString()}`)
      console.log(`Ends: ${new Date(cycle.endsAt).toLocaleDateString()}`)

      // Print description if available
      if (cycle.description) {
        console.log("")
        console.log("## Description")
        console.log("")
        const md = renderMarkdown(cycle.description)
        console.log(md)
      }

      // Print issues in cycle
      const issues = cycle.issues?.nodes || []
      if (issues.length > 0) {
        console.log("")
        console.log(`## Issues (${issues.length})`)
        console.log("")
        for (const issue of issues) {
          console.log(
            `- ${issue.identifier}: ${issue.title} [${issue.state.name}]`,
          )
        }
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to get next cycle", json)
    }
  })
