import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { NotFoundError } from "../../utils/errors.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { buildWorkflowStateJsonPayload } from "./workflow-state-json.ts"

const GetWorkflowState = gql(`
  query GetWorkflowState($id: String!) {
    workflowState(id: $id) {
      id
      name
      type
      position
      color
      description
      createdAt
      updatedAt
      archivedAt
      team {
        id
        key
        name
      }
      inheritedFrom {
        id
        name
        type
      }
    }
  }
`)

export const viewCommand = new Command()
  .name("view")
  .description("View a workflow state")
  .arguments("<workflowStateId:string>")
  .option("-j, --json", "Output as JSON")
  .example(
    "View a workflow state as JSON",
    "linear workflow-state view state-123 --json",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to view workflow state",
    )
  })
  .action(async ({ json }, workflowStateId) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetWorkflowState, { id: workflowStateId }),
        { enabled: !json },
      )

      const workflowState = result.workflowState
      if (workflowState == null) {
        throw new NotFoundError("Workflow state", workflowStateId)
      }

      if (json) {
        console.log(
          JSON.stringify(buildWorkflowStateJsonPayload(workflowState), null, 2),
        )
        return
      }

      console.log(bold(workflowState.name))
      console.log(`${gray("ID:")} ${workflowState.id}`)
      console.log(`${gray("Type:")} ${workflowState.type}`)
      console.log(`${gray("Position:")} ${workflowState.position}`)
      console.log(`${gray("Color:")} ${workflowState.color}`)
      console.log(
        `${
          gray("Team:")
        } ${workflowState.team.name} (${workflowState.team.key})`,
      )
      if (workflowState.description != null) {
        console.log(`${gray("Description:")} ${workflowState.description}`)
      }
      if (workflowState.inheritedFrom != null) {
        console.log(
          `${
            gray("Inherited from:")
          } ${workflowState.inheritedFrom.name} (${workflowState.inheritedFrom.type})`,
        )
      }
      console.log(`${gray("Created:")} ${workflowState.createdAt}`)
      console.log(`${gray("Updated:")} ${workflowState.updatedAt}`)
      if (workflowState.archivedAt != null) {
        console.log(`${gray("Archived:")} ${workflowState.archivedAt}`)
      }
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to view workflow state",
        json,
      )
    }
  })
