import { Command } from "@cliffy/command"
import { renderMarkdown } from "@littletof/charmd"
import { gql } from "../../__codegen__/gql.ts"
import type { GetProjectDetailsQuery } from "../../__codegen__/graphql.ts"
import { openProjectPage } from "../../utils/actions.ts"
import { formatRelativeTime } from "../../utils/display.ts"
import { NotFoundError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { resolveJsonOutputMode } from "../../utils/output_mode.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"

const GetProjectDetails = gql(`
  query GetProjectDetails($id: String!) {
    project(id: $id) {
      id
      name
      description
      slugId
      icon
      color
      status {
        id
        name
        color
        type
      }
      creator {
        name
        displayName
      }
      lead {
        name
        displayName
      }
      priority
      health
      startDate
      targetDate
      startedAt
      completedAt
      canceledAt
      updatedAt
      createdAt
      url
      teams {
        nodes {
          id
          key
          name
        }
      }
      issues {
        nodes {
          id
          identifier
          title
          state {
            name
            type
          }
        }
      }
      lastUpdate {
        id
        body
        health
        createdAt
        user {
          name
          displayName
        }
      }
    }
  }
`)

type ProjectDetails = NonNullable<GetProjectDetailsQuery["project"]>

type ProjectIssueSummary = {
  total: number
  completed: number
  started: number
  unstarted: number
  backlog: number
  triage: number
  canceled: number
}

function getProjectIssueSummary(project: ProjectDetails): ProjectIssueSummary {
  const issuesByState = project.issues.nodes.reduce(
    (acc: Record<string, number>, issue) => {
      const stateType = issue.state.type
      if (!acc[stateType]) acc[stateType] = 0
      acc[stateType]++
      return acc
    },
    {} as Record<string, number>,
  )

  return {
    total: project.issues.nodes.length,
    completed: issuesByState.completed || 0,
    started: issuesByState.started || 0,
    unstarted: issuesByState.unstarted || 0,
    backlog: issuesByState.backlog || 0,
    triage: issuesByState.triage || 0,
    canceled: issuesByState.canceled || 0,
  }
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") {
    return null
  }
  return value
}

function buildProjectJsonPayload(project: ProjectDetails) {
  const issueSummary = getProjectIssueSummary(project)

  return {
    id: project.id,
    slugId: project.slugId,
    name: project.name,
    description: normalizeOptionalText(project.description),
    icon: project.icon,
    color: project.color,
    url: project.url,
    status: {
      id: project.status.id,
      name: project.status.name,
      color: project.status.color,
      type: project.status.type,
    },
    creator: project.creator
      ? {
        name: project.creator.name,
        displayName: project.creator.displayName,
      }
      : null,
    lead: project.lead
      ? {
        name: project.lead.name,
        displayName: project.lead.displayName,
      }
      : null,
    priority: project.priority,
    health: project.health,
    startDate: project.startDate,
    targetDate: project.targetDate,
    startedAt: project.startedAt,
    completedAt: project.completedAt,
    canceledAt: project.canceledAt,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    teams: project.teams.nodes.map((team) => ({
      id: team.id,
      key: team.key,
      name: team.name,
    })),
    issueSummary,
    lastUpdate: project.lastUpdate
      ? {
        id: project.lastUpdate.id,
        body: project.lastUpdate.body,
        health: project.lastUpdate.health,
        createdAt: project.lastUpdate.createdAt,
        user: project.lastUpdate.user
          ? {
            name: project.lastUpdate.user.name,
            displayName: project.lastUpdate.user.displayName,
          }
          : null,
      }
      : null,
  }
}

export const viewCommand = new Command()
  .name("view")
  .description("View project details")
  .alias("v")
  .arguments("<projectIdOrSlug:string>")
  .option("-w, --web", "Open in web browser")
  .option("-a, --app", "Open in Linear.app")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "View a project as JSON",
    "linear project view auth-refresh",
  )
  .example(
    "View a project in the terminal",
    "linear project view auth-refresh --text",
  )
  .example(
    "Open a project in the browser",
    "linear project view auth-refresh --web",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(error, cmd, "Failed to view project")
  )
  .action(async (options, projectIdOrSlug) => {
    const { web, app, json: jsonFlag, text } = options
    const json = resolveJsonOutputMode("linear project view", {
      json: jsonFlag,
      text,
    })

    if (web || app) {
      await openProjectPage(projectIdOrSlug, { app, web: !app })
      return
    }

    try {
      const resolvedProjectId = await resolveProjectId(projectIdOrSlug)
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetProjectDetails, { id: resolvedProjectId }),
        { enabled: !json },
      )

      const project = result.project
      if (!project) {
        throw new NotFoundError("Project", projectIdOrSlug)
      }

      if (json) {
        console.log(JSON.stringify(buildProjectJsonPayload(project), null, 2))
        return
      }

      const lines: string[] = []
      const icon = project.icon ? `${project.icon} ` : ""
      lines.push(`# ${icon}${project.name}`)
      lines.push("")
      lines.push(`**Slug:** ${project.slugId}`)
      lines.push(`**URL:** ${project.url}`)

      const statusLine = `**Status:** ${project.status.name}`
      if (Deno.stdout.isTerminal()) {
        console.log(`%c${statusLine}%c`, `color: ${project.status.color}`, "")
      } else {
        lines.push(statusLine)
      }

      const priorityMap = {
        0: "None",
        1: "Urgent",
        2: "High",
        3: "Medium",
        4: "Low",
      }
      const priority =
        priorityMap[project.priority as keyof typeof priorityMap] || "None"
      lines.push(`**Priority:** ${priority}`)

      if (project.health) {
        lines.push(`**Health:** ${project.health}`)
      }

      if (project.creator) {
        lines.push(
          `**Creator:** ${project.creator.displayName || project.creator.name}`,
        )
      }
      if (project.lead) {
        lines.push(`**Lead:** ${project.lead.displayName || project.lead.name}`)
      }

      if (project.startDate) {
        lines.push(`**Start Date:** ${project.startDate}`)
      }
      if (project.targetDate) {
        lines.push(`**Target Date:** ${project.targetDate}`)
      }
      if (project.startedAt) {
        lines.push(`**Started At:** ${formatRelativeTime(project.startedAt)}`)
      }
      if (project.completedAt) {
        lines.push(
          `**Completed At:** ${formatRelativeTime(project.completedAt)}`,
        )
      }
      if (project.canceledAt) {
        lines.push(`**Canceled At:** ${formatRelativeTime(project.canceledAt)}`)
      }

      if (project.teams.nodes.length > 0) {
        const teamList = project.teams.nodes
          .map((team) => `${team.name} (${team.key})`)
          .join(", ")
        lines.push(`**Teams:** ${teamList}`)
      }

      lines.push("")
      lines.push(`**Created:** ${formatRelativeTime(project.createdAt)}`)
      lines.push(`**Updated:** ${formatRelativeTime(project.updatedAt)}`)

      if (project.description) {
        lines.push("")
        lines.push("## Description")
        lines.push("")
        lines.push(project.description)
      }

      if (project.lastUpdate) {
        lines.push("")
        lines.push("## Latest Update")
        lines.push("")
        const update = project.lastUpdate
        const displayName = update.user?.displayName || update.user?.name ||
          "Unknown"
        lines.push(`**By:** ${displayName}`)
        lines.push(`**When:** ${formatRelativeTime(update.createdAt)}`)
        if (update.health) {
          lines.push(`**Health:** ${update.health}`)
        }
        lines.push("")
        lines.push(update.body)
      }

      if (project.issues.nodes.length > 0) {
        lines.push("")
        lines.push("## Issues Summary")
        lines.push("")

        const {
          total,
          completed,
          started,
          unstarted,
          backlog,
          triage,
          canceled,
        } = getProjectIssueSummary(project)

        lines.push(`**Total Issues:** ${total}`)
        if (completed > 0) lines.push(`**Completed:** ${completed}`)
        if (started > 0) lines.push(`**In Progress:** ${started}`)
        if (unstarted > 0) lines.push(`**To Do:** ${unstarted}`)
        if (backlog > 0) lines.push(`**Backlog:** ${backlog}`)
        if (triage > 0) lines.push(`**Triage:** ${triage}`)
        if (canceled > 0) lines.push(`**Canceled:** ${canceled}`)
      }

      const markdown = lines.join("\n")

      if (Deno.stdout.isTerminal()) {
        const terminalWidth = Deno.consoleSize().columns
        console.log(renderMarkdown(markdown, { lineWidth: terminalWidth }))
      } else {
        console.log(markdown)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to view project", json)
    }
  })
