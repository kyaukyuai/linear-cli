import { Command } from "@cliffy/command"
import { Confirm } from "@cliffy/prompt"
import { gql } from "../../__codegen__/gql.ts"
import {
  shouldSkipConfirmation,
  USE_YES_SUGGESTION,
} from "../../utils/confirmation.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import { CliError, handleError, ValidationError } from "../../utils/errors.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"

const DeleteProjectMilestone = gql(`
  mutation DeleteProjectMilestone($id: String!) {
    projectMilestoneDelete(id: $id) {
      success
    }
  }
`)

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete a project milestone")
  .arguments("<id:string>")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("-f, --force", "Deprecated alias for --yes")
  .option("--dry-run", "Preview the deletion without mutating the milestone")
  .example(
    "Preview deleting a milestone",
    "linear milestone delete milestone-123 --dry-run",
  )
  .example(
    "Delete a milestone without prompting",
    "linear milestone delete milestone-123 --yes",
  )
  .action(async ({ yes, force, dryRun }, id) => {
    if (!shouldSkipConfirmation({ yes, force }) && !dryRun) {
      if (!Deno.stdin.isTerminal()) {
        throw new ValidationError("Interactive confirmation required", {
          suggestion: USE_YES_SUGGESTION,
        })
      }
      const confirmed = await Confirm.prompt({
        message: `Are you sure you want to delete milestone ${id}?`,
        default: false,
      })

      if (!confirmed) {
        console.log("Deletion canceled")
        return
      }
    }

    let spinner: { start: () => void; stop: () => void } | null = null

    try {
      if (dryRun) {
        emitDryRunOutput({
          summary: `Would delete milestone ${id}`,
          data: buildWriteCommandPreview({
            command: "milestone.delete",
            operation: "delete",
            target: {
              resource: "milestone",
              id,
            },
          }),
          lines: [`Milestone: ${id}`],
        })
        return
      }

      const { Spinner } = await import("@std/cli/unstable-spinner")
      const showSpinner = shouldShowSpinner()
      spinner = showSpinner ? new Spinner() : null
      spinner?.start()
      const client = getGraphQLClient()
      const result = await client.request(DeleteProjectMilestone, {
        id,
      })
      spinner?.stop()

      if (result.projectMilestoneDelete.success) {
        console.log(`✓ Deleted milestone ${id}`)
      } else {
        throw new CliError("Failed to delete milestone")
      }
    } catch (error) {
      spinner?.stop()
      handleError(error, "Failed to delete milestone")
    }
  })
