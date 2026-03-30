import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import {
  formatRelativeTime,
  padDisplay,
  truncateText,
} from "../../utils/display.ts"
import { NotFoundError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { resolveInitiativeId } from "../initiative/initiative-resolve.ts"
import { buildInitiativeUpdateListJsonPayload } from "./initiative-update-json.ts"

const ListInitiativeUpdatesForAutomationContractV5 = gql(`
  query ListInitiativeUpdatesForAutomationContractV5(
    $id: String!
    $first: Int
  ) {
    initiative(id: $id) {
      id
      name
      slugId
      initiativeUpdates(first: $first) {
        nodes {
          id
          body
          health
          url
          createdAt
          user {
            name
          }
        }
      }
    }
  }
`)

const HEALTH_COLORS: Record<string, string> = {
  onTrack: "#27AE60",
  atRisk: "#F2994A",
  offTrack: "#EB5757",
}

const HEALTH_DISPLAY: Record<string, string> = {
  onTrack: "On Track",
  atRisk: "At Risk",
  offTrack: "Off Track",
}

export const listCommand = new Command()
  .name("list")
  .description("List status updates for an initiative")
  .alias("l")
  .arguments("<initiativeId:string>")
  .option("-j, --json", "Output as JSON")
  .option("--limit <limit:number>", "Limit results", { default: 10 })
  .option("--no-pager", "Disable automatic paging for long output")
  .example(
    "List initiative updates as JSON",
    "linear initiative-update list initiative-slug --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to list initiative updates",
    )
  )
  .action(async ({ json, limit }, initiativeId) => {
    try {
      const client = getGraphQLClient()
      const resolvedId = await resolveInitiativeId(initiativeId, client)
      const result = await withSpinner(
        () =>
          client.request(ListInitiativeUpdatesForAutomationContractV5, {
            id: resolvedId,
            first: limit,
          }),
        { enabled: !json },
      )

      const initiative = result.initiative
      if (initiative == null) {
        throw new NotFoundError("Initiative", initiativeId)
      }

      const updates = initiative.initiativeUpdates?.nodes ?? []

      if (json) {
        console.log(JSON.stringify(
          buildInitiativeUpdateListJsonPayload(initiative, updates),
          null,
          2,
        ))
        return
      }

      if (updates.length === 0) {
        console.log(`No status updates found for: ${initiative.name}`)
        return
      }

      console.log(`Status updates for: ${initiative.name}\n`)

      const { columns } = Deno.stdout.isTerminal()
        ? Deno.consoleSize()
        : { columns: 120 }
      const idWidth = 8
      const healthWidth = Math.max(
        6,
        ...updates.map((update) =>
          update.health
            ? (HEALTH_DISPLAY[update.health] || update.health).length
            : 1
        ),
      )
      const dateWidth = Math.max(
        4,
        ...updates.map((update) => formatRelativeTime(update.createdAt).length),
      )
      const authorWidth = Math.max(
        6,
        ...updates.map((update) => (update.user?.name || "-").length),
      )
      const spaceWidth = 4
      const fixed = idWidth + healthWidth + dateWidth + authorWidth + spaceWidth
      const padding = 1
      const availableWidth = Math.max(columns - padding - fixed, 10)

      const headerCells = [
        padDisplay("ID", idWidth),
        padDisplay("HEALTH", healthWidth),
        padDisplay("DATE", dateWidth),
        padDisplay("AUTHOR", authorWidth),
      ]

      let headerMessage = ""
      const headerStyles: string[] = []
      headerCells.forEach((cell, index) => {
        headerMessage += `%c${cell}`
        headerStyles.push("text-decoration: underline")
        if (index < headerCells.length - 1) {
          headerMessage += "%c %c"
          headerStyles.push("text-decoration: none")
          headerStyles.push("text-decoration: underline")
        }
      })
      console.log(headerMessage, ...headerStyles)

      for (const update of updates) {
        const shortId = update.id.slice(0, 8)
        const healthDisplay = update.health
          ? (HEALTH_DISPLAY[update.health] || update.health)
          : "-"
        const healthColor = update.health
          ? (HEALTH_COLORS[update.health] || "#6B6F76")
          : "#6B6F76"
        const date = formatRelativeTime(update.createdAt)
        const author = update.user?.name || "-"

        console.log(
          `${padDisplay(shortId, idWidth)} %c${
            padDisplay(healthDisplay, healthWidth)
          }%c %c${padDisplay(date, dateWidth)}%c ${
            padDisplay(author, authorWidth)
          }`,
          `color: ${healthColor}`,
          "",
          "color: gray",
          "",
        )

        if (update.body) {
          const bodyPreview = truncateText(
            update.body.replace(/\n/g, " ").trim(),
            availableWidth,
          )
          console.log(`  %c${bodyPreview}%c`, "color: gray", "")
        }
      }
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to list initiative updates",
        json,
      )
    }
  })
