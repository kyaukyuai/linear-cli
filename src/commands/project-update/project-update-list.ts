import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { getTimeAgo, padDisplay, truncateText } from "../../utils/display.ts"
import { NotFoundError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildProjectUpdateListJsonPayload } from "./project-update-json.ts"

const ListProjectUpdatesForAutomationContractV5 = gql(`
  query ListProjectUpdatesForAutomationContractV5($id: String!, $first: Int) {
    project(id: $id) {
      id
      name
      slugId
      projectUpdates(first: $first) {
        nodes {
          id
          body
          health
          url
          createdAt
          user {
            name
            displayName
          }
        }
      }
    }
  }
`)

export const listCommand = new Command()
  .name("list")
  .description("List status updates for a project")
  .alias("l")
  .arguments("<projectId:string>")
  .option("--json", "Output as JSON")
  .option("--limit <limit:number>", "Limit results", { default: 10 })
  .option("--no-pager", "Disable automatic paging for long output")
  .example(
    "List project updates as JSON",
    "linear project-update list project-slug --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to fetch project updates",
    )
  )
  .action(async ({ json, limit }, projectId) => {
    try {
      const resolvedProjectId = await resolveProjectId(projectId)
      const client = getGraphQLClient()
      const result = await withSpinner(
        () =>
          client.request(ListProjectUpdatesForAutomationContractV5, {
            id: resolvedProjectId,
            first: limit,
          }),
        { enabled: !json },
      )

      const project = result.project
      if (project == null) {
        throw new NotFoundError("Project", projectId)
      }

      const updates = project.projectUpdates?.nodes ?? []

      if (json) {
        console.log(JSON.stringify(
          buildProjectUpdateListJsonPayload(project, updates),
          null,
          2,
        ))
        return
      }

      if (updates.length === 0) {
        console.log(`No status updates found for project: ${project.name}`)
        return
      }

      console.log(`Status updates for: ${project.name}`)
      console.log("")

      const { columns } = Deno.stdout.isTerminal()
        ? Deno.consoleSize()
        : { columns: 120 }

      const idWidth = 8
      const healthWidth = Math.max(
        6,
        ...updates.map((update) => (update.health || "-").length),
      )
      const dateWidth = Math.max(
        4,
        ...updates.map((update) =>
          getTimeAgo(new Date(update.createdAt)).length
        ),
      )

      const getAuthor = (update: typeof updates[number]) => {
        if (update.user?.displayName) return update.user.displayName
        if (update.user?.name) return update.user.name
        return "-"
      }

      const authorWidth = Math.max(
        6,
        ...updates.map((update) => getAuthor(update).length),
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
        const health = update.health || "-"
        const date = getTimeAgo(new Date(update.createdAt))
        const author = getAuthor(update)

        let healthColor = ""
        if (update.health === "onTrack") {
          healthColor = "color: green"
        } else if (update.health === "atRisk") {
          healthColor = "color: yellow"
        } else if (update.health === "offTrack") {
          healthColor = "color: red"
        }

        if (healthColor) {
          console.log(
            `${padDisplay(shortId, idWidth)} %c${
              padDisplay(health, healthWidth)
            }%c ${padDisplay(date, dateWidth)} ${
              padDisplay(author, authorWidth)
            }`,
            healthColor,
            "",
          )
        } else {
          console.log(
            `${padDisplay(shortId, idWidth)} ${
              padDisplay(health, healthWidth)
            } ${padDisplay(date, dateWidth)} ${
              padDisplay(author, authorWidth)
            }`,
          )
        }

        if (update.body) {
          const bodyPreview = update.body.replace(/\n/g, " ").trim()
          const truncatedBody = truncateText(bodyPreview, availableWidth)
          console.log(`%c   ${truncatedBody}%c`, "color: gray", "")
        }
      }
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to fetch project updates",
        json,
      )
    }
  })
