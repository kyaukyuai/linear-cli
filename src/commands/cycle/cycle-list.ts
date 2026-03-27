import { Command } from "@cliffy/command"
import { unicodeWidth } from "@std/cli"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { buildCycleListJsonPayload, getCycleStatusLabel } from "./cycle-json.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { padDisplay } from "../../utils/display.ts"
import { getTeamIdByKey, requireTeamKey } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { header, muted } from "../../utils/styling.ts"
import { NotFoundError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { pipeToUserPager, shouldUsePager } from "../../utils/pager.ts"

const GetTeamCycles = gql(`
  query GetTeamCycles($teamId: String!) {
    team(id: $teamId) {
      id
      name
      cycles {
        nodes {
          id
          number
          name
          startsAt
          endsAt
          completedAt
          isActive
          isFuture
          isPast
        }
      }
    }
  }
`)

function formatDate(dateString: string): string {
  return dateString.slice(0, 10)
}

export const listCommand = new Command()
  .name("list")
  .description("List cycles for a team")
  .option("--team <team:string>", "Team key (defaults to current team)")
  .option("-j, --json", "Output as JSON")
  .option("--no-pager", "Disable automatic paging for long output")
  .example("List cycles as JSON", "linear cycle list --team ENG --json")
  .example(
    "List cycles without a pager",
    "linear cycle list --team ENG --no-pager",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(error, cmd, "Failed to list cycles")
  )
  .action(async ({ team, pager, json }) => {
    try {
      const usePager = pager !== false
      const teamKey = requireTeamKey(team)
      const teamId = await getTeamIdByKey(teamKey)
      if (!teamId) {
        throw new NotFoundError("Team", teamKey)
      }

      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetTeamCycles, { teamId }),
        { enabled: !json },
      )

      const cycles = result.team?.cycles?.nodes || []

      if (cycles.length === 0) {
        if (json) {
          console.log("[]")
        } else {
          console.log("No cycles found for this team.")
        }
        return
      }

      const sortedCycles = [...cycles].sort((a, b) =>
        b.startsAt.localeCompare(a.startsAt)
      )

      if (json) {
        console.log(JSON.stringify(
          sortedCycles.map(buildCycleListJsonPayload),
          null,
          2,
        ))
        return
      }

      const { columns } = Deno.stdout.isTerminal()
        ? Deno.consoleSize()
        : { columns: 120 }

      const NUMBER_WIDTH = Math.max(
        1,
        ...sortedCycles.map((c) => String(c.number).length),
      )
      const START_WIDTH = 10
      const END_WIDTH = 10
      const STATUS_WIDTH = 9
      const SPACE_WIDTH = 4

      const fixed = NUMBER_WIDTH + START_WIDTH + END_WIDTH + STATUS_WIDTH +
        SPACE_WIDTH
      const PADDING = 1
      const maxNameWidth = Math.max(
        4,
        ...sortedCycles.map((c) => unicodeWidth(c.name || `Cycle ${c.number}`)),
      )
      const availableWidth = Math.max(columns - PADDING - fixed, 0)
      const nameWidth = Math.min(maxNameWidth, availableWidth)

      const headerCells = [
        padDisplay("#", NUMBER_WIDTH),
        padDisplay("NAME", nameWidth),
        padDisplay("START", START_WIDTH),
        padDisplay("END", END_WIDTH),
        padDisplay("STATUS", STATUS_WIDTH),
      ]
      const outputLines: string[] = []

      outputLines.push(header(headerCells.join(" ")))

      for (const cycle of sortedCycles) {
        const cyclePayload = buildCycleListJsonPayload(cycle)
        const name = cycle.name || `Cycle ${cycle.number}`
        const truncName = name.length > nameWidth
          ? name.slice(0, nameWidth - 3) + "..."
          : padDisplay(name, nameWidth)

        const status = getCycleStatusLabel(cyclePayload.status)
        const statusStr = padDisplay(status, STATUS_WIDTH)
        let statusDisplay: string
        if (cycle.isActive) {
          statusDisplay = green(statusStr)
        } else if (cycle.isPast || cycle.completedAt != null) {
          statusDisplay = muted(statusStr)
        } else {
          statusDisplay = statusStr
        }

        const line = `${
          padDisplay(String(cycle.number), NUMBER_WIDTH)
        } ${truncName} ${padDisplay(formatDate(cycle.startsAt), START_WIDTH)} ${
          padDisplay(formatDate(cycle.endsAt), END_WIDTH)
        } ${statusDisplay}`
        outputLines.push(line)
      }

      const output = outputLines.join("\n")
      if (shouldUsePager(outputLines, usePager)) {
        await pipeToUserPager(output)
      } else {
        console.log(output)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to list cycles", json)
    }
  })
