import { Command } from "@cliffy/command"
import { Input } from "@cliffy/prompt"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { ensureInteractiveInputAvailable } from "../../utils/interactive.ts"
import { CliError, handleError, ValidationError } from "../../utils/errors.ts"
import { readTextFromStdin } from "../../utils/stdin.ts"
import {
  buildWriteTimeoutSuggestion,
  resolveWriteTimeoutMs,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"

export const commentUpdateCommand = new Command()
  .name("update")
  .description("Update an existing comment")
  .arguments("<commentId:string>")
  .option("-b, --body <text:string>", "New comment body text")
  .option(
    "--body-file <path:string>",
    "Read comment body from a file (preferred for markdown content)",
  )
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .option("-i, --interactive", "Enable interactive body prompts")
  .example(
    "Update a comment from stdin",
    'printf "Updated comment\\n" | linear issue comment update comment_123',
  )
  .action(async (options, commentId) => {
    const { body, bodyFile, timeoutMs, interactive } = options

    try {
      const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
      // Validate that body and bodyFile are not both provided
      if (body && bodyFile) {
        throw new ValidationError(
          "Cannot specify both --body and --body-file",
        )
      }

      // Read body from file if provided
      let newBody = body
      if (bodyFile) {
        try {
          newBody = await Deno.readTextFile(bodyFile)
        } catch (error) {
          throw new ValidationError(
            `Failed to read body file: ${bodyFile}`,
            {
              suggestion: `Error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          )
        }
      } else if (newBody == null) {
        const stdinBody = await readTextFromStdin()
        if (stdinBody != null) {
          newBody = stdinBody
        }
      }

      let existingBody = ""

      // If no body provided, fetch existing comment to show as default
      if (!newBody) {
        ensureInteractiveInputAvailable(
          { interactive },
          "Comment body cannot be empty",
          "Provide --body, --body-file, or pipe the updated comment body on stdin. Use --profile human-debug --interactive to edit it in a terminal.",
        )
        const getCommentQuery = gql(`
          query GetComment($id: String!) {
            comment(id: $id) {
              body
            }
          }
        `)

        const client = getGraphQLClient()
        const commentData = await client.request(getCommentQuery, {
          id: commentId,
        })

        existingBody = commentData.comment?.body || ""

        newBody = await Input.prompt({
          message: "New comment body",
          default: existingBody,
        })

        if (!newBody.trim()) {
          throw new ValidationError("Comment body cannot be empty")
        }
      }

      const mutation = gql(`
        mutation UpdateComment($id: String!, $input: CommentUpdateInput!) {
          commentUpdate(id: $id, input: $input) {
            success
            comment {
              id
              body
              updatedAt
              url
              user {
                name
                displayName
              }
            }
          }
        }
      `)

      const client = getGraphQLClient()
      const data = await withWriteTimeout(
        (signal) =>
          client.request({
            document: mutation,
            variables: {
              id: commentId,
              input: {
                body: newBody,
              },
            },
            signal,
          }),
        {
          operation: "issue comment update",
          timeoutMs: writeTimeoutMs,
          suggestion: buildWriteTimeoutSuggestion(),
        },
      )

      if (!data.commentUpdate.success) {
        throw new CliError("Failed to update comment")
      }

      const comment = data.commentUpdate.comment
      if (!comment) {
        throw new CliError("Comment update failed - no comment returned")
      }

      console.log("✓ Comment updated")
      console.log(comment.url)
    } catch (error) {
      handleError(error, "Failed to update comment")
    }
  })
