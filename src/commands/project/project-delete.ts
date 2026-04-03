import { Command } from "@cliffy/command"
import { Confirm } from "@cliffy/prompt"
import { gql } from "../../__codegen__/gql.ts"
import {
  ensureInteractiveConfirmationAvailable,
  shouldSkipConfirmation,
} from "../../utils/confirmation.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import { CliError, handleError } from "../../utils/errors.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"

const DeleteProject = gql(`
  mutation DeleteProject($id: String!) {
    projectDelete(id: $id) {
      success
      entity {
        id
        name
      }
    }
  }
`)

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete (trash) a Linear project")
  .arguments("<projectId:string>")
  .option("-i, --interactive", "Enable interactive confirmation")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("-f, --force", "Deprecated alias for --yes")
  .option("--dry-run", "Preview the deletion without mutating the project")
  .example(
    "Preview deleting a project",
    "linear project delete auth-refresh --dry-run",
  )
  .example(
    "Delete a project without prompting",
    "linear project delete auth-refresh --yes",
  )
  .action(async ({ interactive, yes, force, dryRun }, projectId) => {
    let spinner: { start: () => void; stop: () => void } | null = null

    try {
      if (!shouldSkipConfirmation({ yes, force }) && !dryRun) {
        ensureInteractiveConfirmationAvailable({ interactive, yes, force })
        const confirmed = await Confirm.prompt({
          message: `Are you sure you want to delete project ${projectId}?`,
          default: false,
        })

        if (!confirmed) {
          console.log("Deletion canceled")
          return
        }
      }

      const resolvedId = await resolveProjectId(projectId)

      if (dryRun) {
        emitDryRunOutput({
          summary: `Would delete project ${projectId}`,
          data: buildWriteCommandPreview({
            command: "project.delete",
            operation: "delete",
            target: {
              resource: "project",
              input: projectId,
              id: resolvedId,
            },
          }),
          lines: [
            `Project: ${projectId}`,
            `Resolved ID: ${resolvedId}`,
          ],
        })
        return
      }

      const { Spinner } = await import("@std/cli/unstable-spinner")
      const showSpinner = shouldShowSpinner()
      spinner = showSpinner ? new Spinner() : null
      spinner?.start()
      const client = getGraphQLClient()

      const result = await client.request(DeleteProject, {
        id: resolvedId,
      })
      spinner?.stop()

      if (!result.projectDelete.success) {
        throw new CliError("Failed to delete project")
      }

      const entity = result.projectDelete.entity
      const displayName = entity?.name ?? projectId
      console.log(`✓ Deleted project: ${displayName}`)
    } catch (error) {
      spinner?.stop()
      handleError(error, "Failed to delete project")
    }
  })
