import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { fetchIssueDetails, getIssueIdentifier } from "../../utils/linear.ts"
import { shouldShowSpinner } from "../../utils/hyperlink.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { ValidationError } from "../../utils/errors.ts"
import { toIssueHierarchyRef } from "./issue-hierarchy-payload.ts"

export const childrenCommand = new Command()
  .name("children")
  .description("List child issues for an issue")
  .arguments("[issueId:string]")
  .option("-j, --json", "Output as JSON")
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to fetch child issues",
    )
  })
  .action(async ({ json }, issueId) => {
    try {
      const resolvedId = await getIssueIdentifier(issueId)
      if (!resolvedId) {
        throw new ValidationError(
          "Could not determine issue ID",
          { suggestion: "Please provide an issue ID like 'ENG-123'." },
        )
      }

      const issue = await fetchIssueDetails(
        resolvedId,
        shouldShowSpinner() && !json,
        false,
      )

      const payload = {
        issue: toIssueHierarchyRef(issue),
        children: (issue.children ?? []).map((child) =>
          toIssueHierarchyRef(child)
        ),
      }

      if (json) {
        console.log(JSON.stringify(payload, null, 2))
        return
      }

      if (payload.children.length === 0) {
        console.log(`${issue.identifier} has no child issues.`)
        return
      }

      console.log(
        bold(
          `${issue.identifier} has ${payload.children.length} child issue${
            payload.children.length === 1 ? "" : "s"
          }`,
        ),
      )

      for (const child of payload.children) {
        console.log(
          `- ${bold(child.identifier)} ${
            gray(`[${child.state.name}]`)
          } ${child.title}`,
        )
        if (child.dueDate != null) {
          console.log(`  ${gray("Due:")} ${child.dueDate}`)
        }
        console.log(`  ${child.url}`)
      }
    } catch (error) {
      handleAutomationCommandError(error, "Failed to list child issues", json)
    }
  })
