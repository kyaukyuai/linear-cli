import { Command } from "@cliffy/command"
import { Input } from "@cliffy/prompt"
import {
  getIssueIdentifier,
  resolveIssueInternalId,
} from "../../utils/linear.ts"
import {
  formatAsMarkdownLink,
  uploadFile,
  validateFilePath,
} from "../../utils/upload.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { ValidationError } from "../../utils/errors.ts"
import { createIssueComment } from "./issue-comment-utils.ts"
import { buildIssueCommentPayload } from "./issue-comment-payload.ts"

export const commentAddCommand = new Command()
  .name("add")
  .description("Add a comment to an issue or reply to a comment")
  .arguments("[issueId:string] [body:string]")
  .option("-b, --body <text:string>", "Comment body text")
  .option(
    "--body-file <path:string>",
    "Read comment body from a file (preferred for markdown content)",
  )
  .option("-p, --parent <id:string>", "Parent comment ID for replies")
  .option(
    "-a, --attach <filepath:string>",
    "Attach a file to the comment (can be used multiple times)",
    { collect: true },
  )
  .option("-j, --json", "Output as JSON")
  .error((error, cmd) => {
    handleAutomationContractParseError(error, cmd, "Failed to add comment")
  })
  .action(async (options, issueId, bodyArg) => {
    const { body, bodyFile, parent, attach, json } = options

    try {
      // Validate that body sources are not both provided
      if (body != null && bodyFile != null) {
        throw new ValidationError(
          "Cannot specify both --body and --body-file",
        )
      }
      if (body != null && bodyArg != null) {
        throw new ValidationError(
          "Cannot specify both a positional comment body and --body",
          {
            suggestion:
              'Pass the comment body either as `linear issue comment add <ISSUE> "text"` or with --body.',
          },
        )
      }

      // Read body from file if provided
      let commentBody = bodyArg ?? body
      if (bodyFile) {
        try {
          commentBody = await Deno.readTextFile(bodyFile)
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
      }

      const resolvedIdentifier = await getIssueIdentifier(issueId)
      if (!resolvedIdentifier) {
        throw new ValidationError(
          "Could not determine issue ID",
          { suggestion: "Please provide an issue ID like 'ENG-123'." },
        )
      }
      const resolvedIssueId = await resolveIssueInternalId(resolvedIdentifier)

      // Validate and upload attachments first
      const attachments = attach || []
      const uploadedFiles: {
        filename: string
        assetUrl: string
        isImage: boolean
      }[] = []

      if (attachments.length > 0) {
        // Validate all files exist before uploading
        for (const filepath of attachments) {
          await validateFilePath(filepath)
        }

        // Upload files
        for (const filepath of attachments) {
          const result = await uploadFile(filepath, {
            showProgress: !json && shouldShowSpinner(),
          })
          uploadedFiles.push({
            filename: result.filename,
            assetUrl: result.assetUrl,
            isImage: result.contentType.startsWith("image/"),
          })
          if (!json) {
            console.log(`✓ Uploaded ${result.filename}`)
          }
        }
      }

      // If no body provided and no attachments, prompt for it
      if (!commentBody && uploadedFiles.length === 0) {
        if (json) {
          throw new ValidationError(
            "Comment body cannot be empty",
            {
              suggestion:
                "Provide --body or --body-file when requesting --json output.",
            },
          )
        }
        commentBody = await Input.prompt({
          message: "Comment body",
          default: "",
        })

        if (!commentBody.trim()) {
          throw new ValidationError("Comment body cannot be empty")
        }
      }

      // Append attachment links to comment body
      if (uploadedFiles.length > 0) {
        const attachmentLinks = uploadedFiles.map((file) => {
          return formatAsMarkdownLink({
            filename: file.filename,
            assetUrl: file.assetUrl,
            contentType: file.isImage
              ? "image/png"
              : "application/octet-stream",
            size: 0,
          })
        })

        if (commentBody) {
          commentBody = `${commentBody}\n\n${attachmentLinks.join("\n")}`
        } else {
          commentBody = attachmentLinks.join("\n")
        }
      }

      if (commentBody == null) {
        throw new ValidationError("Comment body cannot be empty")
      }

      const input: {
        body: string
        issueId: string
        parentId?: string
      } = {
        body: commentBody,
        issueId: resolvedIssueId,
      }

      if (parent) {
        input.parentId = parent
      }

      const comment = await createIssueComment(input, {
        spinnerEnabled: !json,
      })

      if (json) {
        console.log(JSON.stringify(
          buildIssueCommentPayload(comment, {
            id: resolvedIssueId,
            identifier: resolvedIdentifier,
            title: null,
            url: null,
          }),
          null,
          2,
        ))
        return
      }

      console.log(`✓ Comment added to ${resolvedIdentifier}`)
      console.log(comment.url)
    } catch (error) {
      handleAutomationCommandError(error, "Failed to add comment", json)
    }
  })
