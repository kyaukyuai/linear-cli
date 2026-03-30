import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { getWorkflowStates, requireTeamKey } from "../../utils/linear.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildWorkflowStateJsonPayload } from "./workflow-state-json.ts"

export const listCommand = new Command()
  .name("list")
  .description("List workflow states for a team")
  .option(
    "--team <teamKey:string>",
    "Team key (defaults to current team)",
  )
  .option("-j, --json", "Output as JSON")
  .option("--no-pager", "Disable automatic paging for long output")
  .example(
    "List workflow states as JSON",
    "linear workflow-state list --team ENG --json",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to list workflow states",
    )
  })
  .action(async ({ team, json }) => {
    try {
      const teamKey = requireTeamKey(team)
      const states = await withSpinner(
        () => getWorkflowStates(teamKey),
        { enabled: !json },
      )

      if (json) {
        console.log(JSON.stringify(
          states.map(buildWorkflowStateJsonPayload),
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
      handleAutomationCommandError(
        error,
        "Failed to list workflow states",
        json,
      )
    }
  })
