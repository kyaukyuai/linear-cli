import { Command } from "@cliffy/command"
import { renderMarkdown } from "@littletof/charmd"
import { open } from "@opensrc/deno-open"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { formatRelativeTime } from "../../utils/display.ts"
import {
  isClientError,
  isNotFoundError,
  NotFoundError,
} from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildDocumentDetailJsonPayload } from "./document-json.ts"

const GetDocument = gql(`
  query GetDocument($id: String!) {
    document(id: $id) {
      id
      title
      slugId
      content
      url
      createdAt
      updatedAt
      creator {
        name
        displayName
        email
      }
      project {
        id
        name
        slugId
        url
      }
      issue {
        id
        identifier
        title
        url
      }
    }
  }
`)

export const viewCommand = new Command()
  .name("view")
  .description("View a document's content")
  .alias("v")
  .arguments("<id:string>")
  .option("--raw", "Output raw markdown without rendering")
  .option("-w, --web", "Open document in browser")
  .option("--json", "Output full document as JSON")
  .example(
    "View a document as JSON",
    "linear document view d4b93e3b2695 --json",
  )
  .error((error, cmd) =>
    handleAutomationContractParseError(error, cmd, "Failed to view document")
  )
  .action(async ({ raw, web, json }, id) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetDocument, { id }),
        { enabled: !raw && !json },
      )

      const document = result.document
      if (!document) {
        throw new NotFoundError("Document", id)
      }

      // Open in browser if requested
      if (web) {
        console.log(`Opening ${document.url} in web browser`)
        await open(document.url)
        return
      }

      // JSON output
      if (json) {
        console.log(
          JSON.stringify(buildDocumentDetailJsonPayload(document), null, 2),
        )
        return
      }

      // Raw output (for piping)
      if (raw || !Deno.stdout.isTerminal()) {
        if (document.content) {
          console.log(document.content)
        }
        return
      }

      // Rendered output
      const lines: string[] = []

      // Title
      lines.push(`# ${document.title}`)
      lines.push("")

      // Metadata
      lines.push(`**Slug:** ${document.slugId}`)
      lines.push(`**URL:** ${document.url}`)

      if (document.creator) {
        lines.push(`**Creator:** ${document.creator.name}`)
      }

      if (document.project) {
        lines.push(`**Project:** ${document.project.name}`)
      }

      if (document.issue) {
        lines.push(
          `**Issue:** ${document.issue.identifier} - ${document.issue.title}`,
        )
      }

      lines.push(`**Created:** ${formatRelativeTime(document.createdAt)}`)
      lines.push(`**Updated:** ${formatRelativeTime(document.updatedAt)}`)

      // Content
      if (document.content) {
        lines.push("")
        lines.push("---")
        lines.push("")
        lines.push(document.content)
      }

      const markdown = lines.join("\n")
      const terminalWidth = Deno.consoleSize().columns
      console.log(renderMarkdown(markdown, { lineWidth: terminalWidth }))
    } catch (error) {
      const handledError = isClientError(error) && isNotFoundError(error)
        ? new NotFoundError("Document", id)
        : error

      handleAutomationCommandError(
        handledError,
        "Failed to view document",
        json,
      )
    }
  })
