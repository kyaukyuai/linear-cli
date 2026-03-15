import { Command } from "@cliffy/command"
import { bold, gray } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError } from "../../utils/errors.ts"
import { withSpinner } from "../../utils/spinner.ts"

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
  .action(async ({ json }, workflowStateId) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(
        () => client.request(GetWorkflowState, { id: workflowStateId }),
        { enabled: !json },
      )

      const workflowState = result.workflowState

      if (json) {
        console.log(JSON.stringify(
          {
            id: workflowState.id,
            name: workflowState.name,
            type: workflowState.type,
            position: workflowState.position,
            color: workflowState.color,
            description: workflowState.description,
            createdAt: workflowState.createdAt,
            updatedAt: workflowState.updatedAt,
            archivedAt: workflowState.archivedAt,
            team: workflowState.team
              ? {
                id: workflowState.team.id,
                key: workflowState.team.key,
                name: workflowState.team.name,
              }
              : null,
            inheritedFrom: workflowState.inheritedFrom
              ? {
                id: workflowState.inheritedFrom.id,
                name: workflowState.inheritedFrom.name,
                type: workflowState.inheritedFrom.type,
              }
              : null,
          },
          null,
          2,
        ))
        return
      }

      console.log(bold(workflowState.name))
      console.log(`${gray("ID:")} ${workflowState.id}`)
      console.log(`${gray("Type:")} ${workflowState.type}`)
      console.log(`${gray("Position:")} ${workflowState.position}`)
      console.log(`${gray("Color:")} ${workflowState.color}`)
      console.log(
        `${gray("Team:")} ${workflowState.team.name} (${workflowState.team.key})`,
      )
      if (workflowState.description != null) {
        console.log(`${gray("Description:")} ${workflowState.description}`)
      }
      if (workflowState.inheritedFrom != null) {
        console.log(
          `${gray("Inherited from:")} ${workflowState.inheritedFrom.name} (${workflowState.inheritedFrom.type})`,
        )
      }
      console.log(`${gray("Created:")} ${workflowState.createdAt}`)
      console.log(`${gray("Updated:")} ${workflowState.updatedAt}`)
      if (workflowState.archivedAt != null) {
        console.log(`${gray("Archived:")} ${workflowState.archivedAt}`)
      }
    } catch (error) {
      handleError(error, "Failed to view workflow state")
    }
  })
