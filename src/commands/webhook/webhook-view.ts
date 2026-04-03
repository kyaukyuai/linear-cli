import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { NotFoundError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { resolveJsonOutputMode } from "../../utils/output_mode.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  getWebhookDisplayLabel,
  getWebhookScope,
  getWebhookStatus,
} from "./webhook-utils.ts"
import { buildWebhookJsonPayload } from "./webhook-json.ts"

const GetWebhook = gql(`
  query GetWebhook($id: String!) {
    webhook(id: $id) {
      id
      label
      url
      enabled
      archivedAt
      allPublicTeams
      resourceTypes
      createdAt
      updatedAt
      team {
        id
        key
        name
      }
      creator {
        id
        name
        displayName
      }
    }
  }
`)

export const viewCommand = new Command()
  .name("view")
  .description("View a webhook")
  .arguments("<webhookId:string>")
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .example(
    "View a webhook as JSON",
    "linear webhook view webhook_123",
  )
  .example(
    "View a webhook in the terminal",
    "linear webhook view webhook_123 --text",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(error, cmd, "Failed to view webhook")
  )
  .action(async ({ json: jsonFlag, text }, webhookId) => {
    const json = resolveJsonOutputMode("linear webhook view", {
      json: jsonFlag,
      text,
    })
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetWebhook, { id: webhookId }),
        { enabled: !json },
      )

      const webhook = result.webhook
      if (webhook == null) {
        throw new NotFoundError("Webhook", webhookId)
      }

      if (json) {
        console.log(JSON.stringify(
          buildWebhookJsonPayload(webhook),
          null,
          2,
        ))
        return
      }

      const creatorName = webhook.creator?.displayName || webhook.creator?.name

      console.log(bold(getWebhookDisplayLabel(webhook.label)))
      console.log(`${gray("ID:")} ${webhook.id}`)
      console.log(`${gray("Status:")} ${getWebhookStatus(webhook)}`)
      console.log(`${gray("Scope:")} ${getWebhookScope(webhook)}`)
      console.log(`${gray("URL:")} ${webhook.url ?? "-"}`)
      console.log(
        `${gray("Resources:")} ${webhook.resourceTypes.join(", ")}`,
      )
      if (creatorName != null) {
        console.log(`${gray("Creator:")} ${creatorName}`)
      }
      console.log(`${gray("Created:")} ${webhook.createdAt}`)
      console.log(`${gray("Updated:")} ${webhook.updatedAt}`)
      if (webhook.archivedAt != null) {
        console.log(`${gray("Archived:")} ${webhook.archivedAt}`)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to view webhook", json)
    }
  })
