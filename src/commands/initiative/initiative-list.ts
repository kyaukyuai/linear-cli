import { Command } from "@cliffy/command"
import { unicodeWidth } from "@std/cli"
import { open } from "@opensrc/deno-open"
import { gql } from "../../__codegen__/gql.ts"
import type { InitiativeFilter } from "../../__codegen__/graphql.ts"
import { getOption } from "../../config.ts"
import { LINEAR_WEB_BASE_URL } from "../../const.ts"
import { padDisplay, truncateText } from "../../utils/display.ts"
import { NotFoundError, ValidationError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildInitiativeListJsonPayload } from "./initiative-json.ts"

const GetInitiativesForAutomationContractV5 = gql(`
  query GetInitiativesForAutomationContractV5(
    $filter: InitiativeFilter
    $includeArchived: Boolean
  ) {
    initiatives(filter: $filter, includeArchived: $includeArchived) {
      nodes {
        id
        slugId
        name
        description
        status
        targetDate
        health
        color
        icon
        url
        archivedAt
        owner {
          id
          name
          displayName
          initials
        }
        projects {
          nodes {
            id
            name
            status {
              name
            }
          }
        }
      }
    }
  }
`)

const GetViewerForInitiativesForAutomationContractV5 = gql(`
  query GetViewerForInitiativesForAutomationContractV5 {
    viewer {
      organization {
        urlKey
      }
    }
  }
`)

const INITIATIVE_STATUS_ORDER: Record<string, number> = {
  Active: 1,
  Planned: 2,
  Completed: 3,
}

const INITIATIVE_STATUS_DISPLAY: Record<string, string> = {
  Active: "Active",
  Planned: "Planned",
  Completed: "Completed",
}

const STATUS_INPUT_MAP: Record<string, string> = {
  active: "Active",
  planned: "Planned",
  completed: "Completed",
}

export const listCommand = new Command()
  .name("list")
  .description("List initiatives")
  .option(
    "-s, --status <status:string>",
    "Filter by status (active, planned, completed)",
  )
  .option("--all-statuses", "Show all statuses (default: active only)")
  .option("-o, --owner <owner:string>", "Filter by owner (username or email)")
  .option("-w, --web", "Open initiatives page in web browser")
  .option("-a, --app", "Open initiatives page in Linear.app")
  .option("-j, --json", "Output as JSON")
  .option("--archived", "Include archived initiatives")
  .option("--no-pager", "Disable automatic paging for long output")
  .example(
    "List initiatives as JSON",
    "linear initiative list --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to list initiatives",
    )
  )
  .action(async ({ status, allStatuses, owner, web, app, json, archived }) => {
    try {
      if (json && (web || app)) {
        throw new ValidationError(
          "Cannot combine --json with --web or --app",
          {
            suggestion:
              "Use either `linear initiative list --json` or `linear initiative list --web`.",
          },
        )
      }

      if (web || app) {
        let workspace = getOption("workspace")
        if (!workspace) {
          const client = getGraphQLClient()
          const result = await client.request(
            GetViewerForInitiativesForAutomationContractV5,
          )
          workspace = result.viewer.organization.urlKey
        }

        const url = `${LINEAR_WEB_BASE_URL}/${workspace}/initiatives`
        const destination = app ? "Linear.app" : "web browser"
        console.log(`Opening ${url} in ${destination}`)
        await open(
          url,
          app ? { app: { name: "Linear" } } : undefined,
        )
        return
      }

      const filter: InitiativeFilter = {}

      if (status) {
        const statusLower = status.toLowerCase()
        const apiStatus = STATUS_INPUT_MAP[statusLower]
        if (!apiStatus) {
          throw new ValidationError(
            `Invalid status: ${status}. Valid values: ${
              Object.keys(STATUS_INPUT_MAP).join(", ")
            }`,
            {
              suggestion:
                "Use `active`, `planned`, or `completed`, or omit `--status` and use `--all-statuses`.",
            },
          )
        }
        filter.status = { eq: apiStatus }
      } else if (!allStatuses) {
        filter.status = { eq: "Active" }
      }

      if (owner) {
        const { lookupUserId } = await import("../../utils/linear.ts")
        const ownerId = await lookupUserId(owner)
        if (!ownerId) {
          throw new NotFoundError("Owner", owner)
        }
        filter.owner = { id: { eq: ownerId } }
      }

      const client = getGraphQLClient()
      const result = await withSpinner(
        () =>
          client.request(GetInitiativesForAutomationContractV5, {
            filter: Object.keys(filter).length > 0 ? filter : undefined,
            includeArchived: archived || false,
          }),
        { enabled: !json && shouldShowSpinner() },
      )

      let initiatives = result.initiatives?.nodes ?? []

      if (initiatives.length === 0) {
        if (json) {
          console.log("[]")
        } else {
          console.log("No initiatives found.")
        }
        return
      }

      initiatives = initiatives.sort((a, b) => {
        const statusA = INITIATIVE_STATUS_ORDER[a.status] || 999
        const statusB = INITIATIVE_STATUS_ORDER[b.status] || 999

        if (statusA !== statusB) {
          return statusA - statusB
        }

        return a.name.localeCompare(b.name)
      })

      if (json) {
        console.log(JSON.stringify(
          initiatives.map(buildInitiativeListJsonPayload),
          null,
          2,
        ))
        return
      }

      const { columns } = Deno.stdout.isTerminal()
        ? Deno.consoleSize()
        : { columns: 120 }

      const slugWidth = Math.max(
        4,
        ...initiatives.map((initiative) => initiative.slugId.length),
      )
      const statusWidth = Math.max(
        6,
        ...initiatives.map((initiative) =>
          (INITIATIVE_STATUS_DISPLAY[initiative.status] || initiative.status)
            .length
        ),
      )
      const healthWidth = Math.max(
        6,
        ...initiatives.map((initiative) => (initiative.health || "-").length),
      )
      const ownerWidth = Math.max(
        5,
        ...initiatives.map((initiative) =>
          (initiative.owner?.initials || "-").length
        ),
      )
      const projectsWidth = Math.max(
        4,
        ...initiatives.map((initiative) =>
          String(initiative.projects?.nodes.length || 0).length
        ),
      )
      const targetWidth = Math.max(
        10,
        ...initiatives.map((initiative) =>
          (initiative.targetDate || "-").length
        ),
      )

      const spaceWidth = 6
      const fixed = slugWidth + statusWidth + healthWidth + ownerWidth +
        projectsWidth + targetWidth + spaceWidth
      const padding = 1
      const maxNameWidth = Math.max(
        ...initiatives.map((initiative) => unicodeWidth(initiative.name)),
      )
      const availableWidth = Math.max(columns - padding - fixed, 10)
      const nameWidth = Math.min(maxNameWidth, availableWidth)

      const headerCells = [
        padDisplay("SLUG", slugWidth),
        padDisplay("NAME", nameWidth),
        padDisplay("STATUS", statusWidth),
        padDisplay("HEALTH", healthWidth),
        padDisplay("OWNER", ownerWidth),
        padDisplay("PROJ", projectsWidth),
        padDisplay("TARGET", targetWidth),
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

      for (const initiative of initiatives) {
        const statusDisplay = INITIATIVE_STATUS_DISPLAY[initiative.status] ||
          initiative.status
        const health = initiative.health || "-"
        const ownerInitials = initiative.owner?.initials || "-"
        const projectCount = String(initiative.projects?.nodes.length || 0)
        const target = initiative.targetDate || "-"
        const truncatedName = truncateText(initiative.name, nameWidth)
        const paddedName = padDisplay(truncatedName, nameWidth)
        const statusColors: Record<string, string> = {
          Active: "#27AE60",
          Planned: "#5E6AD2",
          Completed: "#6B6F76",
        }
        const statusColor = statusColors[initiative.status] || "#6B6F76"

        console.log(
          `${padDisplay(initiative.slugId, slugWidth)} ${paddedName} %c${
            padDisplay(statusDisplay, statusWidth)
          }%c ${padDisplay(health, healthWidth)} ${
            padDisplay(ownerInitials, ownerWidth)
          } ${padDisplay(projectCount, projectsWidth)} %c${
            padDisplay(target, targetWidth)
          }%c`,
          `color: ${statusColor}`,
          "",
          "color: gray",
          "",
        )
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to list initiatives", json)
    }
  })
