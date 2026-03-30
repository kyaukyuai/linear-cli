import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { ValidationError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildProjectLabelJsonPayload } from "../label/label-json.ts"

const GetProjectLabels = gql(`
  query GetProjectLabels($first: Int!, $includeArchived: Boolean) {
    projectLabels(first: $first, includeArchived: $includeArchived) {
      nodes {
        id
        name
        description
        color
        isGroup
        createdAt
        updatedAt
        archivedAt
        retiredAt
        parent {
          id
          name
        }
      }
    }
  }
`)

export const listCommand = new Command()
  .name("list")
  .description("List project labels")
  .option("-n, --limit <limit:number>", "Maximum number of project labels", {
    default: 50,
  })
  .option("--include-archived", "Include archived project labels")
  .option("-j, --json", "Output as JSON")
  .option("--no-pager", "Disable automatic paging for long output")
  .example(
    "List project labels as JSON",
    "linear project-label list --json",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to list project labels",
    )
  })
  .action(async ({ limit, includeArchived, json }) => {
    try {
      if (limit < 1 || limit > 250) {
        throw new ValidationError("Limit must be between 1 and 250")
      }

      const client = getGraphQLClient()
      const result = await withSpinner(
        () =>
          client.request(GetProjectLabels, {
            first: limit,
            includeArchived,
          }),
        { enabled: !json },
      )

      const labels = [...result.projectLabels.nodes].sort((a, b) =>
        a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      )

      if (json) {
        console.log(JSON.stringify(
          labels.map(buildProjectLabelJsonPayload),
          null,
          2,
        ))
        return
      }

      if (labels.length === 0) {
        console.log("No project labels found.")
        return
      }

      for (const label of labels) {
        const flags = [
          label.isGroup ? "group" : null,
          label.retiredAt != null ? "retired" : null,
          label.archivedAt != null ? "archived" : null,
        ].filter((value) => value != null)

        console.log(`${bold(label.name)} ${gray(label.id)}`)
        console.log(`  ${gray("color:")} ${label.color}`)
        if (label.parent != null) {
          console.log(`  ${gray("parent:")} ${label.parent.name}`)
        }
        if (label.description != null && label.description.length > 0) {
          console.log(`  ${gray("description:")} ${label.description}`)
        }
        if (flags.length > 0) {
          console.log(`  ${gray("flags:")} ${flags.join(", ")}`)
        }
        console.log("")
      }
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to list project labels",
        json,
      )
    }
  })
