import { Command } from "@cliffy/command"
import { Confirm } from "@cliffy/prompt"
import { gql } from "../../__codegen__/gql.ts"
import {
  shouldSkipConfirmation,
  USE_YES_SUGGESTION,
} from "../../utils/confirmation.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  type BulkOperationResult,
  collectBulkIds,
  executeBulkOperations,
  isBulkMode,
  printBulkSummary,
} from "../../utils/bulk.ts"
import {
  CliError,
  handleError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"

interface DocumentDeleteResult extends BulkOperationResult {
  title?: string
}

export const deleteCommand = new Command()
  .name("delete")
  .description("Delete a document (moves to trash)")
  .alias("d")
  .arguments("[documentId:string]")
  .option("-y, --yes", "Skip confirmation prompt")
  .option(
    "--bulk <ids...:string>",
    "Delete multiple documents by slug or ID",
  )
  .option(
    "--bulk-file <file:string>",
    "Read document slugs/IDs from a file (one per line)",
  )
  .option("--bulk-stdin", "Read document slugs/IDs from stdin")
  .option("--dry-run", "Preview the deletion without mutating documents")
  .action(
    async (
      { yes, bulk, bulkFile, bulkStdin, dryRun },
      documentId,
    ) => {
      try {
        const client = getGraphQLClient()

        // Check if bulk mode
        if (isBulkMode({ bulk, bulkFile, bulkStdin })) {
          await handleBulkDelete(client, {
            bulk,
            bulkFile,
            bulkStdin,
            yes,
            dryRun,
          })
          return
        }

        // Single mode requires documentId
        if (!documentId) {
          throw new ValidationError("Document ID required", {
            suggestion: "Use --bulk for multiple documents.",
          })
        }

        await handleSingleDelete(client, documentId, { yes, dryRun })
      } catch (error) {
        handleError(error, "Failed to delete document")
      }
    },
  )

async function handleSingleDelete(
  // deno-lint-ignore no-explicit-any
  client: any,
  documentId: string,
  options: { yes?: boolean; dryRun?: boolean },
): Promise<void> {
  const { yes, dryRun } = options

  // Get document details for confirmation message
  const detailsQuery = gql(`
    query GetDocumentForDelete($id: String!) {
      document(id: $id) {
        id
        slugId
        title
      }
    }
  `)

  const documentDetails = await client.request(detailsQuery, { id: documentId })

  if (!documentDetails?.document) {
    throw new NotFoundError("Document", documentId)
  }

  const document = documentDetails.document

  if (dryRun) {
    emitDryRunOutput({
      summary: `Would delete document ${document.title}`,
      data: buildWriteCommandPreview({
        command: "document.delete",
        operation: "delete",
        target: {
          resource: "document",
          id: document.id,
          slugId: document.slugId,
          title: document.title,
        },
      }),
      lines: [
        `Document: ${document.title}`,
        `ID: ${document.id}`,
      ],
    })
    return
  }

  // Confirm deletion
  if (!shouldSkipConfirmation({ yes })) {
    if (!Deno.stdin.isTerminal()) {
      throw new ValidationError("Interactive confirmation required", {
        suggestion: USE_YES_SUGGESTION,
      })
    }
    const confirmed = await Confirm.prompt({
      message: `Are you sure you want to delete "${document.title}"?`,
      default: false,
    })

    if (!confirmed) {
      console.log("Delete cancelled.")
      return
    }
  }

  // Delete the document (moves to trash)
  const deleteMutation = gql(`
    mutation DeleteDocument($id: String!) {
      documentDelete(id: $id) {
        success
      }
    }
  `)

  const result = await client.request(deleteMutation, { id: document.id })

  if (!result.documentDelete.success) {
    throw new CliError("Delete operation failed")
  }

  console.log(`✓ Deleted document: ${document.title}`)
}

async function handleBulkDelete(
  // deno-lint-ignore no-explicit-any
  client: any,
  options: {
    bulk?: string[]
    bulkFile?: string
    bulkStdin?: boolean
    yes?: boolean
    dryRun?: boolean
  },
): Promise<void> {
  const { yes, dryRun } = options

  // Collect all IDs
  const ids = await collectBulkIds({
    bulk: options.bulk,
    bulkFile: options.bulkFile,
    bulkStdin: options.bulkStdin,
  })

  if (ids.length === 0) {
    throw new ValidationError("No document IDs provided for bulk delete")
  }

  if (dryRun) {
    emitDryRunOutput({
      summary: `Would delete ${ids.length} document(s)`,
      data: buildWriteCommandPreview({
        command: "document.delete",
        operation: "delete",
        target: {
          resource: "document",
          ids,
          bulk: true,
        },
      }),
      lines: [
        `Documents: ${ids.length}`,
        ...ids.map((id) => `- ${id}`),
      ],
    })
    return
  }

  console.log(`Found ${ids.length} document(s) to delete.`)

  // Confirm bulk operation
  if (!shouldSkipConfirmation({ yes })) {
    if (!Deno.stdin.isTerminal()) {
      throw new ValidationError("Interactive confirmation required", {
        suggestion: USE_YES_SUGGESTION,
      })
    }
    const confirmed = await Confirm.prompt({
      message: `Delete ${ids.length} document(s)?`,
      default: false,
    })

    if (!confirmed) {
      console.log("Bulk delete cancelled.")
      return
    }
  }

  // Define the delete operation
  const deleteOperation = async (
    docId: string,
  ): Promise<DocumentDeleteResult> => {
    // Get document details for display
    const detailsQuery = gql(`
      query GetDocumentForBulkDelete($id: String!) {
        document(id: $id) {
          id
          slugId
          title
        }
      }
    `)

    let documentUuid = docId
    let title = docId

    try {
      const details = await client.request(detailsQuery, { id: docId })
      if (details?.document) {
        documentUuid = details.document.id
        title = details.document.title
      }
    } catch {
      return {
        id: docId,
        title: docId,
        success: false,
        error: "Document not found",
      }
    }

    // Delete the document
    const deleteMutation = gql(`
      mutation BulkDeleteDocument($id: String!) {
        documentDelete(id: $id) {
          success
        }
      }
    `)

    const result = await client.request(deleteMutation, { id: documentUuid })

    if (!result.documentDelete.success) {
      return {
        id: documentUuid,
        name: title,
        title,
        success: false,
        error: "Delete operation failed",
      }
    }

    return {
      id: documentUuid,
      name: title,
      title,
      success: true,
    }
  }

  // Execute bulk operation
  const summary = await executeBulkOperations(ids, deleteOperation, {
    showProgress: true,
  })

  // Print summary
  printBulkSummary(summary, {
    entityName: "document",
    operationName: "deleted",
    showDetails: true,
  })

  // Exit with error code if any failed
  if (summary.failed > 0) {
    Deno.exit(1)
  }
}
