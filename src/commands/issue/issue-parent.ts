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

export const parentCommand = new Command()
  .name("parent")
  .description("Show the parent issue for an issue")
  .arguments("[issueId:string]")
  .option("-j, --json", "Output as JSON")
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to fetch parent issue",
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
        parent: issue.parent == null ? null : toIssueHierarchyRef(issue.parent),
      }

      if (json) {
        console.log(JSON.stringify(payload, null, 2))
        return
      }

      if (payload.parent == null) {
        console.log(`${issue.identifier} has no parent issue.`)
        return
      }

      console.log(bold(`${issue.identifier} -> ${payload.parent.identifier}`))
      console.log(payload.parent.title)
      console.log(`${gray("State:")} ${payload.parent.state.name}`)
      if (payload.parent.dueDate != null) {
        console.log(`${gray("Due:")} ${payload.parent.dueDate}`)
      }
      console.log(payload.parent.url)
    } catch (error) {
      handleAutomationCommandError(error, "Failed to show parent issue", json)
    }
  })
