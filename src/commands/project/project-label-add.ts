import { Command } from "@cliffy/command"
import { green } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { handleError, NotFoundError } from "../../utils/errors.ts"
import { resolveProjectId } from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { resolveProjectLabel } from "./project-label-utils.ts"

const GetProjectLabelsForProject = gql(`
  query GetProjectLabelsForProject($id: String!) {
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

const ProjectAddLabel = gql(`
  mutation ProjectAddLabel($id: String!, $labelId: String!) {
    projectAddLabel(id: $id, labelId: $labelId) {
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

export const addLabelCommand = new Command()
  .name("add")
  .description("Add a label to a project")
  .arguments("<projectId:string> <label:string>")
  .option("-j, --json", "Output as JSON")
  .example("Add a project label", "linear project label add auth-redesign bug")
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

        const alreadyAttached = project.labels.nodes.some((existingLabel) =>
          existingLabel.id === label.id
        )
        if (alreadyAttached) {
          return {
            changed: false,
            project,
            label,
          }
        }

        const mutation = await client.request(ProjectAddLabel, {
          id: projectId,
          labelId: label.id,
        })

        if (
          !mutation.projectAddLabel.success ||
          mutation.projectAddLabel.project == null
        ) {
          throw new Error("Failed to add project label")
        }

        return {
          changed: true,
          project: mutation.projectAddLabel.project,
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
        console.log(`Project already has label "${result.label.name}"`)
        return
      }

      console.log(
        green("✓") +
          ` Added label "${result.label.name}" to ${result.project.slugId}`,
      )
    } catch (error) {
      handleError(error, "Failed to add project label")
    }
  })
