import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import { CliError, handleError, ValidationError } from "../../utils/errors.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"

const UpdateProjectMilestone = gql(`
  mutation UpdateProjectMilestone($id: String!, $input: ProjectMilestoneUpdateInput!) {
    projectMilestoneUpdate(id: $id, input: $input) {
      success
      projectMilestone {
        id
        name
        targetDate
        sortOrder
        project {
          id
          name
        }
      }
    }
  }
`)

export const updateCommand = new Command()
  .name("update")
  .description("Update an existing project milestone")
  .arguments("<id:string>")
  .option("--name <name:string>", "Milestone name")
  .option("--description <description:string>", "Milestone description")
  .option("--target-date <date:string>", "Target date (YYYY-MM-DD)")
  .option(
    "--sort-order <value:number>",
    "Sort order relative to other milestones",
  )
  .option("--project <projectId:string>", "Move to a different project")
  .option("--dry-run", "Preview the update without mutating the milestone")
  .action(
    async (
      {
        name,
        description,
        targetDate,
        sortOrder,
        project: projectIdOrSlug,
        dryRun,
      },
      id,
    ) => {
      if (
        !name && !description && !targetDate && sortOrder == null &&
        !projectIdOrSlug
      ) {
        throw new ValidationError(
          "At least one update option must be provided",
          {
            suggestion:
              "Use --name, --description, --target-date, --sort-order, or --project",
          },
        )
      }

      const { Spinner } = await import("@std/cli/unstable-spinner")
      const showSpinner = shouldShowSpinner()
      const spinner = showSpinner ? new Spinner() : null

      try {
        const input: Record<string, unknown> = {}

        if (name) input.name = name
        if (description) input.description = description
        if (targetDate) input.targetDate = targetDate
        if (sortOrder != null) input.sortOrder = sortOrder
        if (projectIdOrSlug) {
          // Resolve project slug to full UUID
          input.projectId = await resolveProjectId(projectIdOrSlug)
        }

        if (dryRun) {
          emitDryRunOutput({
            summary: `Would update milestone ${id}`,
            data: buildWriteCommandPreview({
              command: "milestone.update",
              operation: "update",
              target: {
                resource: "milestone",
                id,
              },
              changes: {
                name: name ?? null,
                description: description ?? null,
                targetDate: targetDate ?? null,
                sortOrder: sortOrder ?? null,
                projectInput: projectIdOrSlug ?? null,
                input,
              },
            }),
            lines: [
              `Milestone: ${id}`,
              ...Object.entries(input).map(([key, value]) =>
                `${key}: ${String(value)}`
              ),
            ],
          })
          return
        }

        spinner?.start()
        const client = getGraphQLClient()
        const result = await client.request(UpdateProjectMilestone, {
          id,
          input,
        })
        spinner?.stop()

        if (result.projectMilestoneUpdate.success) {
          const milestone = result.projectMilestoneUpdate.projectMilestone
          if (milestone) {
            console.log(`✓ Updated milestone: ${milestone.name}`)
            console.log(`  ID: ${milestone.id}`)
            if (milestone.targetDate) {
              console.log(`  Target Date: ${milestone.targetDate}`)
            }
            console.log(`  Sort Order: ${milestone.sortOrder}`)
            console.log(`  Project: ${milestone.project.name}`)
          }
        } else {
          throw new CliError("Failed to update milestone")
        }
      } catch (error) {
        spinner?.stop()
        handleError(error, "Failed to update milestone")
      }
    },
  )
