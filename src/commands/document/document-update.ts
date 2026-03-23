import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { getEditor } from "../../utils/editor.ts"
import { readIdsFromStdin } from "../../utils/bulk.ts"
import {
  CliError,
  handleError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors.ts"
import { buildWriteCommandPreview } from "../../utils/write_preview.ts"

/**
 * Open editor with initial content and return the edited content
 */
async function openEditorWithContent(
  initialContent: string,
): Promise<string | undefined> {
  const editor = await getEditor()
  if (!editor) {
    throw new ValidationError("No editor found", {
      suggestion:
        "Set EDITOR environment variable or configure git editor with: git config --global core.editor <editor>",
    })
  }

  // Create a temporary file with initial content
  const tempFile = await Deno.makeTempFile({ suffix: ".md" })

  try {
    // Write initial content to temp file
    await Deno.writeTextFile(tempFile, initialContent)

    // Open the editor
    const process = new Deno.Command(editor, {
      args: [tempFile],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    })

    const { success } = await process.output()

    if (!success) {
      throw new CliError("Editor exited with an error")
    }

    // Read the content back
    const content = await Deno.readTextFile(tempFile)
    const cleaned = content.trim()

    return cleaned.length > 0 ? cleaned : undefined
  } catch (error) {
    if (error instanceof CliError || error instanceof ValidationError) {
      throw error
    }
    throw new CliError(
      `Failed to open editor: ${
        error instanceof Error ? error.message : String(error)
      }`,
      { cause: error },
    )
  } finally {
    // Clean up the temporary file
    try {
      await Deno.remove(tempFile)
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Read content from stdin if available (with timeout to avoid hanging)
 */
async function readContentFromStdin(): Promise<string | undefined> {
  // Check if stdin has data (not a TTY)
  if (Deno.stdin.isTerminal()) {
    return undefined
  }

  try {
    // Use timeout to avoid hanging when stdin is not a terminal but has no data
    // (e.g., in test subprocess environments)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("stdin timeout")), 100)
    })

    const ids = await Promise.race([readIdsFromStdin(), timeoutPromise])
    // Join back with newlines since it's content, not IDs
    const content = ids.join("\n")
    return content.length > 0 ? content : undefined
  } catch {
    return undefined
  }
}

export const updateCommand = new Command()
  .name("update")
  .description("Update an existing document")
  .alias("u")
  .arguments("<documentId:string>")
  .option("-t, --title <title:string>", "New title for the document")
  .option("-c, --content <content:string>", "New markdown content (inline)")
  .option(
    "-f, --content-file <path:string>",
    "Read new content from file",
  )
  .option("--icon <icon:string>", "New icon (emoji)")
  .option("-e, --edit", "Open current content in $EDITOR for editing")
  .option("--dry-run", "Preview the update without mutating the document")
  .action(
    async (
      { title, content, contentFile, icon, edit, dryRun },
      documentId,
    ) => {
      try {
        // Build the update input
        const input: Record<string, string> = {}

        // Add title if provided
        if (title) {
          input.title = title
        }

        // Add icon if provided
        if (icon) {
          input.icon = icon
        }

        // Resolve content from various sources
        let finalContent: string | undefined

        if (content) {
          // Content provided inline
          finalContent = content
        } else if (contentFile) {
          // Content from file
          try {
            finalContent = await Deno.readTextFile(contentFile)
          } catch (error) {
            if (error instanceof Deno.errors.NotFound) {
              throw new NotFoundError("File", contentFile)
            }
            throw new CliError(
              `Failed to read content file: ${
                error instanceof Error ? error.message : String(error)
              }`,
              { cause: error },
            )
          }
        } else if (edit) {
          const client = getGraphQLClient()
          // Edit mode: fetch current content and open in editor
          const getDocumentQuery = gql(`
          query GetDocumentForEdit($id: String!) {
            document(id: $id) {
              id
              title
              content
            }
          }
        `)

          const documentData = await client.request(getDocumentQuery, {
            id: documentId,
          })

          if (!documentData?.document) {
            throw new NotFoundError("Document", documentId)
          }

          const currentContent = documentData.document.content || ""
          console.log(`Opening ${documentData.document.title} in editor...`)

          finalContent = await openEditorWithContent(currentContent)

          if (finalContent === undefined) {
            console.log("No changes made, update cancelled.")
            return
          }

          // Check if content actually changed
          if (finalContent === currentContent) {
            console.log("No changes detected, update cancelled.")
            return
          }
        } else if (
          !Deno.stdin.isTerminal() && Object.keys(input).length === 0
        ) {
          // Only try reading from stdin if no other update fields were provided
          // This avoids hanging when stdin is piped but has no data (e.g., in test environments)
          const stdinContent = await readContentFromStdin()
          if (stdinContent) {
            finalContent = stdinContent
          }
        }

        // Add content to input if resolved
        if (finalContent !== undefined) {
          input.content = finalContent
        }

        // Validate that at least one field is being updated
        if (Object.keys(input).length === 0) {
          throw new ValidationError("No update fields provided", {
            suggestion:
              "Use --title, --content, --content-file, --icon, or --edit.",
          })
        }

        if (dryRun) {
          emitDryRunOutput({
            summary: `Would update document ${documentId}`,
            data: buildWriteCommandPreview({
              command: "document.update",
              operation: "update",
              target: {
                resource: "document",
                id: documentId,
              },
              changes: {
                title: input.title ?? null,
                icon: input.icon ?? null,
                hasContent: input.content != null,
                contentLength: input.content?.length ?? 0,
              },
            }),
            lines: [
              `Document: ${documentId}`,
              ...Object.entries(input).map(([key, value]) =>
                key === "content"
                  ? `content: ${(value as string).length} chars`
                  : `${key}: ${String(value)}`
              ),
            ],
          })
          return
        }

        const client = getGraphQLClient()
        // Execute the update
        const updateMutation = gql(`
        mutation UpdateDocument($id: String!, $input: DocumentUpdateInput!) {
          documentUpdate(id: $id, input: $input) {
            success
            document {
              id
              slugId
              title
              url
              updatedAt
            }
          }
        }
      `)

        const result = await client.request(updateMutation, {
          id: documentId,
          input,
        })

        if (!result.documentUpdate.success) {
          throw new CliError("Document update failed")
        }

        const document = result.documentUpdate.document
        if (!document) {
          throw new CliError("Document update failed - no document returned")
        }

        console.log(`✓ Updated document: ${document.title}`)
        console.log(document.url)
      } catch (error) {
        handleError(error, "Failed to update document")
      }
    },
  )
