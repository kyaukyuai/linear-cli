import { Command } from "@cliffy/command"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError, NotFoundError } from "../../utils/errors.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { resolveProjectLabel } from "./project-label-utils.ts"

const GetProjectLabelsForProject = gql(`
  query GetProjectLabelsForProjectRemove($id: String!) {
    project(id: $id) {
      id
      name
      slugId
      labels(first: 100) {
        nodes {
          id
          name
        }
      }
    }
  }
`)

const ProjectRemoveLabel = gql(`
  mutation ProjectRemoveLabel($id: String!, $labelId: String!) {
    projectRemoveLabel(id: $id, labelId: $labelId) {
      success
      project {
        id
        name
        slugId
        labels(first: 100) {
          nodes {
            id
            name
          }
        }
      }
    }
  }
`)

export const removeLabelCommand = new Command()
  .name("remove")
  .description("Remove a label from a project")
  .arguments("<projectId:string> <label:string>")
  .option("-j, --json", "Output as JSON")
  .example(
    "Remove a project label",
    "linear project label remove auth-redesign bug",
  )
  .action(async ({ json }, projectIdOrSlug, labelRef) => {
    try {
      const client = getGraphQLClient()
      const result = await withSpinner(async () => {
        const projectId = await resolveProjectId(projectIdOrSlug)
        const label = await resolveProjectLabel(labelRef, { client })
        if (label == null) {
          throw new NotFoundError("Project label", labelRef)
        }

        const current = await client.request(GetProjectLabelsForProject, {
          id: projectId,
        })
        const project = current.project
        if (project == null) {
          throw new NotFoundError("Project", projectIdOrSlug)
        }

        const currentlyAttached = project.labels.nodes.some((existingLabel) =>
          existingLabel.id === label.id
        )
        if (!currentlyAttached) {
          return {
            changed: false,
            project,
            label,
          }
        }

        const mutation = await client.request(ProjectRemoveLabel, {
          id: projectId,
          labelId: label.id,
        })

        if (
          !mutation.projectRemoveLabel.success ||
          mutation.projectRemoveLabel.project == null
        ) {
          throw new Error("Failed to remove project label")
        }

        return {
          changed: true,
          project: mutation.projectRemoveLabel.project,
          label,
        }
      }, { enabled: !json })

      if (json) {
        console.log(JSON.stringify(
          {
            changed: result.changed,
            project: {
              id: result.project.id,
              name: result.project.name,
              slugId: result.project.slugId,
              labels: result.project.labels.nodes.map((label) => ({
                id: label.id,
                name: label.name,
              })),
            },
            label: {
              id: result.label.id,
              name: result.label.name,
            },
          },
          null,
          2,
        ))
        return
      }

      if (!result.changed) {
        console.log(`Project doesn't have label "${result.label.name}"`)
        return
      }

      console.log(
        green("✓") +
          ` Removed label "${result.label.name}" from ${result.project.slugId}`,
      )
    } catch (error) {
      handleError(error, "Failed to remove project label")
    }
  })
