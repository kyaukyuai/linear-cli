import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { getWorkflowStates, requireTeamKey } from "../../utils/linear.ts"
import { handleError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

export const listCommand = new Command()
  .name("list")
  .description("List workflow states for a team")
  .option(
    "--team <teamKey:string>",
    "Team key (defaults to current team)",
  )
  .option("-j, --json", "Output as JSON")
  .action(async ({ team, json }) => {
    try {
      const teamKey = requireTeamKey(team)
      const states = await withSpinner(
        () => getWorkflowStates(teamKey),
        { enabled: !json },
      )

      if (json) {
        console.log(JSON.stringify(
          states.map((state) => ({
            id: state.id,
            name: state.name,
            type: state.type,
            position: state.position,
            color: state.color,
            description: state.description,
            createdAt: state.createdAt,
            updatedAt: state.updatedAt,
            archivedAt: state.archivedAt,
            team: state.team
              ? {
                id: state.team.id,
                key: state.team.key,
                name: state.team.name,
              }
              : null,
            inheritedFrom: state.inheritedFrom
              ? {
                id: state.inheritedFrom.id,
                name: state.inheritedFrom.name,
                type: state.inheritedFrom.type,
              }
              : null,
          })),
          null,
          2,
        ))
        return
      }

      if (states.length === 0) {
        console.log(`No workflow states found for team ${teamKey}.`)
        return
      }

      const teamName = states[0].team?.name ?? teamKey
      console.log(bold(`${teamName} (${teamKey})`))

      for (const state of states) {
        console.log(
          `${gray(`${state.position}.`)} ${bold(state.name)} ${
            gray(`[${state.type}]`)
          } ${state.id}`,
        )
        if (state.description != null && state.description.length > 0) {
          console.log(gray(`  ${state.description}`))
        }
      }
    } catch (error) {
      handleError(error, "Failed to list workflow states")
    }
  })
