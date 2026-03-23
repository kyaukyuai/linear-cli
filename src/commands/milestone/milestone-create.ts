import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import { CliError, handleError } from "../../utils/errors.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"

const CreateProjectMilestone = gql(`
  mutation CreateProjectMilestone($input: ProjectMilestoneCreateInput!) {
    projectMilestoneCreate(input: $input) {
      success
      projectMilestone {
        id
        name
        targetDate
        project {
          id
          name
        }
      }
    }
  }
`)

export const createCommand = new Command()
  .name("create")
  .description("Create a new project milestone")
  .option("--project <projectId:string>", "Project ID", { required: true })
  .option("--name <name:string>", "Milestone name", { required: true })
  .option("--description <description:string>", "Milestone description")
  .option("--target-date <date:string>", "Target date (YYYY-MM-DD)")
  .option("--dry-run", "Preview the milestone without creating it")
  .action(
    async (
      { project: projectIdOrSlug, name, description, targetDate, dryRun },
    ) => {
      const { Spinner } = await import("@std/cli/unstable-spinner")
      const showSpinner = shouldShowSpinner()
      const spinner = showSpinner ? new Spinner() : null

      try {
        // Resolve project slug to full UUID
        const projectId = await resolveProjectId(projectIdOrSlug)

        if (dryRun) {
          emitDryRunOutput({
            summary: `Would create milestone ${name}`,
            data: buildWriteCommandPreview({
              command: "milestone.create",
              operation: "create",
              target: {
                resource: "milestone",
                name,
                projectInput: projectIdOrSlug,
                projectId,
              },
              changes: {
                input: {
                  name,
                  description: description ?? null,
                  targetDate: targetDate ?? null,
                },
              },
            }),
            lines: [
              `Milestone: ${name}`,
              `Project: ${projectIdOrSlug}`,
              ...(targetDate != null ? [`Target date: ${targetDate}`] : []),
            ],
          })
          return
        }

        spinner?.start()

        const client = getGraphQLClient()
        const result = await client.request(CreateProjectMilestone, {
          input: {
            projectId,
            name,
            description,
            targetDate,
          },
        })
        spinner?.stop()

        if (result.projectMilestoneCreate.success) {
          const milestone = result.projectMilestoneCreate.projectMilestone
          if (milestone) {
            console.log(`✓ Created milestone: ${milestone.name}`)
            console.log(`  ID: ${milestone.id}`)
            if (milestone.targetDate) {
              console.log(`  Target Date: ${milestone.targetDate}`)
            }
            console.log(`  Project: ${milestone.project.name}`)
          }
        } else {
          throw new CliError("Failed to create milestone")
        }
      } catch (error) {
        spinner?.stop()
        handleError(error, "Failed to create milestone")
      }
    },
  )
