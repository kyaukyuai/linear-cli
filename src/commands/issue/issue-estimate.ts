import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { resolveIssueInternalId } from "../../utils/linear.ts"
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../utils/operation_receipt.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  buildWriteApplyOperationFromReceipt,
  withWriteOperationContract,
} from "../../utils/write_operation.ts"
import { green } from "@std/fmt/colors"
import { handleAutomationCommandError } from "../../utils/json_output.ts"
import { handleError, ValidationError } from "../../utils/errors.ts"

const UpdateIssueEstimate = gql(`
  mutation UpdateIssueEstimate($issueId: String!, $estimate: Int) {
    issueUpdate(id: $issueId, input: { estimate: $estimate }) {
      success
      issue {
        id
        identifier
        title
        estimate
      }
    }
  }
`)

export const estimateCommand = new Command()
  .name("estimate")
  .description("Set the estimate (points) of an issue")
  .arguments("<issueId:string> [points:number]")
  .option("-j, --json", "Output as JSON")
  .option("--clear", "Clear the estimate")
  .example("Set 3 points", "linear issue estimate ENG-123 3")
  .example("Set 5 points", "linear issue estimate ENG-123 5")
  .example("Clear estimate", "linear issue estimate ENG-123 --clear")
  .action(async ({ clear, json }, issueId, points) => {
    try {
      // Validate arguments
      if (!clear && points === undefined) {
        throw new ValidationError(
          "Please provide points or use --clear",
          {
            suggestion: "Example: linear issue estimate ENG-123 3",
          },
        )
      }

      // Validate points
      if (points !== undefined && points < 0) {
        throw new ValidationError(
          `Invalid estimate: ${points}`,
          {
            suggestion: "Estimate must be a positive number",
          },
        )
      }

      const issueInternalId = await resolveIssueInternalId(issueId, {
        suggestion: "Use a full issue identifier like 'ENG-123'",
      })

      const client = getGraphQLClient()
      const result = await withSpinner(
        () =>
          client.request(UpdateIssueEstimate, {
            issueId: issueInternalId,
            estimate: clear ? null : points,
          }),
        { enabled: !json },
      )

      if (!result.issueUpdate.success) {
        throw new Error("Failed to update estimate")
      }

      const issue = result.issueUpdate.issue
      if (json) {
        const receipt = buildOperationReceipt({
          operationId: "issue.estimate",
          resource: "issue",
          action: "update",
          resolvedRefs: {
            issueIdentifier: issue?.identifier ?? null,
          },
          appliedChanges: ["estimate"],
          nextSafeAction: "read_before_retry",
        })
        console.log(JSON.stringify(
          withWriteOperationContract(
            withOperationReceipt(
              {
                identifier: issue?.identifier,
                estimate: issue?.estimate ?? null,
              },
              receipt,
            ),
            buildWriteApplyOperationFromReceipt(
              `Updated estimate for ${issue?.identifier ?? issueId}`,
              receipt,
            ),
          ),
          null,
          2,
        ))
        return
      }
      if (issue?.estimate !== null && issue?.estimate !== undefined) {
        console.log(
          green("✓") +
            ` Set ${issue.identifier} estimate to ${issue.estimate} points`,
        )
      } else {
        console.log(
          green("✓") +
            ` Cleared estimate for ${issue?.identifier}`,
        )
      }
    } catch (error) {
      if (json) {
        handleAutomationCommandError(error, "Failed to set estimate", true)
      }
      handleError(error, "Failed to set estimate")
    }
  })
