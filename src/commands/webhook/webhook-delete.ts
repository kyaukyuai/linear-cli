import { Command } from "@cliffy/command"
import { Confirm } from "@cliffy/prompt"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import {
  shouldSkipConfirmation,
  USE_YES_SUGGESTION,
} from "../../utils/confirmation.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { CliError, handleError, ValidationError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"
import {
  buildWriteApplyOperation,
  buildWritePreviewOperationFromPayload,
  withWriteOperationContract,
} from "../../utils/write_operation.ts"
import { getWebhookDisplayLabel } from "./webhook-utils.ts"

const GetWebhookForDelete = gql(`
  query GetWebhookForDelete($id: String!) {
    webhook(id: $id) {
      id
      label
      url
    }
  }
`)

const DeleteWebhook = gql(`
  mutation DeleteWebhook($id: String!) {
    webhookDelete(id: $id) {
      success
      entityId
    }
  }
`)

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete a webhook")
  .arguments("<webhookId:string>")
  .option("-y, --yes", "Skip confirmation prompt")
  .option("-j, --json", "Output as JSON")
  .option("--dry-run", "Preview the deletion without mutating the webhook")
  .example(
    "Preview deleting a webhook",
    "linear webhook delete webhook_123 --dry-run",
  )
  .example(
    "Delete a webhook without prompting",
    "linear webhook delete webhook_123 --yes --json",
  )
  .action(async ({ yes, json, dryRun }, webhookId) => {
    try {
      const client = getGraphQLClient()
      const webhook = await withSpinner(
        () => client.request(GetWebhookForDelete, { id: webhookId }),
        { enabled: !json && yes && !dryRun },
      )

      if (dryRun) {
        const previewPayload = buildWriteCommandPreview({
          command: "webhook.delete",
          operation: "delete",
          target: {
            resource: "webhook",
            id: webhook.webhook.id,
            label: webhook.webhook.label,
            url: webhook.webhook.url,
          },
        })
        const summary = `Would delete webhook ${
          getWebhookDisplayLabel(webhook.webhook.label)
        }`
        emitDryRunOutput({
          json,
          summary,
          data: previewPayload,
          operation: buildWritePreviewOperationFromPayload(
            summary,
            previewPayload,
          ),
          lines: [
            `Webhook: ${getWebhookDisplayLabel(webhook.webhook.label)}`,
            `ID: ${webhook.webhook.id}`,
            `URL: ${webhook.webhook.url ?? "-"}`,
          ],
        })
        return
      }

      if (!shouldSkipConfirmation({ yes })) {
        if (!Deno.stdin.isTerminal()) {
          throw new ValidationError("Interactive confirmation required", {
            suggestion: USE_YES_SUGGESTION,
          })
        }

        const confirmed = await Confirm.prompt({
          message: `Are you sure you want to delete webhook "${
            getWebhookDisplayLabel(webhook.webhook.label)
          }"?`,
          default: false,
        })

        if (!confirmed) {
          console.log("Deletion canceled")
          return
        }
      }

      const result = await withSpinner(
        () => client.request(DeleteWebhook, { id: webhookId }),
        { enabled: !json },
      )

      if (!result.webhookDelete.success) {
        throw new CliError("Failed to delete webhook")
      }

      if (json) {
        const payload = {
          id: result.webhookDelete.entityId,
          label: webhook.webhook.label,
          url: webhook.webhook.url,
          success: true,
        }
        console.log(JSON.stringify(
          withWriteOperationContract(
            payload,
            buildWriteApplyOperation({
              command: "webhook.delete",
              resource: "webhook",
              action: "delete",
              summary: `Deleted webhook ${result.webhookDelete.entityId}`,
              refs: {
                webhookId: result.webhookDelete.entityId,
                webhookUrl: webhook.webhook.url,
              },
              changes: ["deletion"],
              nextSafeAction: "read_before_retry",
            }),
          ),
          null,
          2,
        ))
        return
      }

      console.log(
        green("✓") +
          ` Deleted webhook: ${getWebhookDisplayLabel(webhook.webhook.label)}`,
      )
    } catch (error) {
      handleError(error, "Failed to delete webhook")
    }
  })
