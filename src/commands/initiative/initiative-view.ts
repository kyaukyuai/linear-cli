import { Command } from "@cliffy/command"
import { renderMarkdown } from "@littletof/charmd"
import { open } from "@opensrc/deno-open"
import { gql } from "../../__codegen__/gql.ts"
import { formatRelativeTime } from "../../utils/display.ts"
import { NotFoundError, ValidationError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildInitiativeDetailJsonPayload } from "./initiative-json.ts"
import { resolveInitiativeId } from "./initiative-resolve.ts"

const GetInitiativeDetailsForAutomationContractV5 = gql(`
  query GetInitiativeDetailsForAutomationContractV5($id: String!) {
    initiative(id: $id) {
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
      createdAt
      updatedAt
      owner {
        id
        name
        displayName
        initials
      }
      projects {
        nodes {
          id
          slugId
          name
          status {
            name
            type
          }
        }
      }
    }
  }
`)

const INITIATIVE_STATUS_DISPLAY: Record<string, string> = {
  active: "Active",
  planned: "Planned",
  paused: "Paused",
  completed: "Completed",
  canceled: "Canceled",
}

const STATUS_COLORS: Record<string, string> = {
  active: "#27AE60",
  planned: "#5E6AD2",
  paused: "#F2994A",
  completed: "#6B6F76",
  canceled: "#EB5757",
}

export const viewCommand = new Command()
  .name("view")
  .description("View initiative details")
  .alias("v")
  .arguments("<initiativeId:string>")
  .option("-w, --web", "Open in web browser")
  .option("-a, --app", "Open in Linear.app")
  .option("-j, --json", "Output as JSON")
  .example(
    "View an initiative as JSON",
    "linear initiative view initiative-slug --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(error, cmd, "Failed to view initiative")
  )
  .action(async ({ web, app, json }, initiativeId) => {
    try {
      if (json && (web || app)) {
        throw new ValidationError(
          "Cannot combine --json with --web or --app",
          {
            suggestion:
              "Use either `linear initiative view <initiative> --json` or `linear initiative view <initiative> --web`.",
          },
        )
      }

      const client = getGraphQLClient()
      const resolvedId = await resolveInitiativeId(initiativeId, client)
      const result = await withSpinner(
        () =>
          client.request(GetInitiativeDetailsForAutomationContractV5, {
            id: resolvedId,
          }),
        { enabled: !json },
      )

      const initiative = result.initiative
      if (initiative == null) {
        throw new NotFoundError("Initiative", initiativeId)
      }

      if (web || app) {
        const destination = app ? "Linear.app" : "web browser"
        console.log(`Opening ${initiative.url} in ${destination}`)
        await open(
          initiative.url,
          app ? { app: { name: "Linear" } } : undefined,
        )
        return
      }

      if (json) {
        console.log(JSON.stringify(
          buildInitiativeDetailJsonPayload(initiative),
          null,
          2,
        ))
        return
      }

      const lines: string[] = []
      const icon = initiative.icon ? `${initiative.icon} ` : ""
      lines.push(`# ${icon}${initiative.name}`)
      lines.push("")
      lines.push(`**Slug:** ${initiative.slugId}`)
      lines.push(`**URL:** ${initiative.url}`)

      const statusDisplay = INITIATIVE_STATUS_DISPLAY[initiative.status] ||
        initiative.status
      const statusLine = `**Status:** ${statusDisplay}`
      if (Deno.stdout.isTerminal()) {
        const statusColor = STATUS_COLORS[initiative.status] || "#6B6F76"
        console.log(`%c${statusLine}%c`, `color: ${statusColor}`, "")
      } else {
        lines.push(statusLine)
      }

      if (initiative.health) {
        lines.push(`**Health:** ${initiative.health}`)
      }

      if (initiative.owner) {
        lines.push(
          `**Owner:** ${initiative.owner.displayName || initiative.owner.name}`,
        )
      }

      if (initiative.targetDate) {
        lines.push(`**Target Date:** ${initiative.targetDate}`)
      }

      if (initiative.archivedAt) {
        lines.push(`**Archived:** ${formatRelativeTime(initiative.archivedAt)}`)
      }

      lines.push("")
      lines.push(`**Created:** ${formatRelativeTime(initiative.createdAt)}`)
      lines.push(`**Updated:** ${formatRelativeTime(initiative.updatedAt)}`)

      if (initiative.description) {
        lines.push("")
        lines.push("## Description")
        lines.push("")
        lines.push(initiative.description)
      }

      const projects = initiative.projects?.nodes ?? []
      if (projects.length > 0) {
        lines.push("")
        lines.push(`## Projects (${projects.length})`)
        lines.push("")

        const projectsByStatus: Record<string, typeof projects> = {}
        for (const project of projects) {
          const statusType = project.status?.type || "unknown"
          if (!projectsByStatus[statusType]) {
            projectsByStatus[statusType] = []
          }
          projectsByStatus[statusType].push(project)
        }

        const statusOrder = [
          "started",
          "planned",
          "backlog",
          "paused",
          "completed",
          "canceled",
        ]

        for (const statusType of statusOrder) {
          const statusProjects = projectsByStatus[statusType]
          if (statusProjects && statusProjects.length > 0) {
            for (const project of statusProjects) {
              const statusName = project.status?.name || "Unknown"
              lines.push(`- **${project.name}** (${statusName})`)
            }
          }
        }

        for (
          const [statusType, statusProjects] of Object.entries(projectsByStatus)
        ) {
          if (!statusOrder.includes(statusType)) {
            for (const project of statusProjects) {
              const statusName = project.status?.name || "Unknown"
              lines.push(`- **${project.name}** (${statusName})`)
            }
          }
        }
      } else {
        lines.push("")
        lines.push("## Projects")
        lines.push("")
        lines.push("*No projects linked to this initiative.*")
      }

      const markdown = lines.join("\n")

      if (Deno.stdout.isTerminal()) {
        const terminalWidth = Deno.consoleSize().columns
        console.log(renderMarkdown(markdown, { lineWidth: terminalWidth }))
      } else {
        console.log(markdown)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to view initiative", json)
    }
  })
