import { Command } from "@cliffy/command"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  getCycleIdByNameOrNumber,
  getIssueId,
  getIssueIdentifier,
  getIssueLabelIdByNameForTeam,
  getIssueProjectId,
  getMilestoneIdByName,
  getProjectIdByName,
  getTeamIdByKey,
  getWorkflowStateByNameOrType,
  lookupUserId,
} from "../../utils/linear.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  CliError,
  handleError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors.ts"
import { buildIssueWritePayload } from "./issue-write-payload.ts"

export const updateCommand = new Command()
  .name("update")
  .description("Update a linear issue")
  .arguments("[issueId:string]")
  .option(
    "-a, --assignee <assignee:string>",
    "Assign the issue to 'self' or someone (by username or name)",
  )
  .option(
    "--due-date <dueDate:string>",
    "Due date of the issue",
  )
  .option(
    "--clear-due-date",
    "Clear the due date on the issue",
  )
  .option(
    "--parent <parent:string>",
    "Parent issue (if any) as a team_number code",
  )
  .option(
    "-p, --priority <priority:number>",
    "Priority of the issue (1-4, descending priority)",
  )
  .option(
    "--estimate <estimate:number>",
    "Points estimate of the issue",
  )
  .option(
    "-d, --description <description:string>",
    "Description of the issue",
  )
  .option(
    "--description-file <path:string>",
    "Read description from a file (preferred for markdown content)",
  )
  .option(
    "-l, --label <label:string>",
    "Issue label associated with the issue. May be repeated.",
    { collect: true },
  )
  .option(
    "--team <team:string>",
    "Team associated with the issue (if not your default team)",
  )
  .option(
    "--project <project:string>",
    "Name or slug ID of the project with the issue",
  )
  .option(
    "-s, --state <state:string>",
    "Workflow state for the issue (by name or type)",
  )
  .option(
    "--milestone <milestone:string>",
    "Name of the project milestone",
  )
  .option(
    "--cycle <cycle:string>",
    "Cycle name, number, or 'active'",
  )
  .option("-j, --json", "Output as JSON")
  .option("-t, --title <title:string>", "Title of the issue")
  .action(
    async (
      {
        assignee,
        dueDate,
        clearDueDate,
        parent,
        priority,
        estimate,
        description,
        descriptionFile,
        label: labels,
        team,
        project,
        state,
        milestone,
        cycle,
        title,
        json,
      },
      issueIdArg,
    ) => {
      try {
        // Validate that description and descriptionFile are not both provided
        if (description && descriptionFile) {
          throw new ValidationError(
            "Cannot specify both --description and --description-file",
          )
        }
        if (dueDate != null && clearDueDate) {
          throw new ValidationError(
            "Cannot specify both --due-date and --clear-due-date",
            {
              suggestion:
                "Use --due-date to set a due date, or --clear-due-date to remove it.",
            },
          )
        }

        // Read description from file if provided
        let finalDescription = description
        if (descriptionFile) {
          try {
            finalDescription = await Deno.readTextFile(descriptionFile)
          } catch (error) {
            throw new ValidationError(
              `Failed to read description file: ${descriptionFile}`,
              {
                suggestion: `Error: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            )
          }
        }

        // Get the issue ID - either from argument or infer from current context
        const issueId = await getIssueIdentifier(issueIdArg)
        if (!issueId) {
          throw new ValidationError(
            "Could not determine issue ID",
            {
              suggestion:
                "Please provide an issue ID like 'ENG-123' or run from a branch with an issue ID.",
            },
          )
        }

        // Extract team from issue ID if not provided
        let teamKey = team
        if (!teamKey) {
          const match = issueId.match(/^([A-Z]+)-/)
          teamKey = match?.[1]
        }
        if (!teamKey) {
          throw new ValidationError(
            "Could not determine team key from issue ID",
          )
        }

        // Convert team key to team ID for some operations
        const teamId = await getTeamIdByKey(teamKey)
        if (!teamId) {
          throw new NotFoundError("Team", teamKey)
        }

        let stateId: string | undefined
        if (state) {
          const workflowState = await getWorkflowStateByNameOrType(
            teamKey,
            state,
          )
          if (!workflowState) {
            throw new NotFoundError(
              "Workflow state",
              `'${state}' for team ${teamKey}`,
            )
          }
          stateId = workflowState.id
        }

        let assigneeId: string | undefined
        if (assignee !== undefined) {
          assigneeId = await lookupUserId(assignee)
          if (!assigneeId) {
            throw new NotFoundError("User", assignee)
          }
        }

        const labelIds = []
        if (labels != null && labels.length > 0) {
          for (const label of labels) {
            const labelId = await getIssueLabelIdByNameForTeam(label, teamKey)
            if (!labelId) {
              throw new NotFoundError("Issue label", label)
            }
            labelIds.push(labelId)
          }
        }

        let projectId: string | undefined = undefined
        if (project !== undefined) {
          projectId = await getProjectIdByName(project)
          if (projectId === undefined) {
            throw new NotFoundError("Project", project)
          }
        }

        let projectMilestoneId: string | undefined
        if (milestone != null) {
          const milestoneProjectId = projectId ??
            await getIssueProjectId(issueId)
          if (milestoneProjectId == null) {
            throw new ValidationError(
              "--milestone requires --project to be set (issue has no existing project)",
              {
                suggestion:
                  "Use --project to specify the project for the milestone.",
              },
            )
          }
          projectMilestoneId = await getMilestoneIdByName(
            milestone,
            milestoneProjectId,
          )
        }

        let cycleId: string | undefined
        if (cycle != null) {
          cycleId = await getCycleIdByNameOrNumber(cycle, teamId)
        }

        // Build the update input object, only including fields that were provided
        const input: Record<
          string,
          string | number | string[] | null | undefined
        > = {}

        if (title !== undefined) input.title = title
        if (assigneeId !== undefined) input.assigneeId = assigneeId
        if (dueDate !== undefined) input.dueDate = dueDate
        if (clearDueDate) input.dueDate = null
        if (parent !== undefined) {
          const parentIdentifier = await getIssueIdentifier(parent)
          if (!parentIdentifier) {
            throw new ValidationError(
              `Could not resolve parent issue identifier: ${parent}`,
            )
          }
          const parentId = await getIssueId(parentIdentifier)
          if (!parentId) {
            throw new NotFoundError("Parent issue", parentIdentifier)
          }
          input.parentId = parentId
        }
        if (priority !== undefined) input.priority = priority
        if (estimate !== undefined) input.estimate = estimate
        if (finalDescription !== undefined) input.description = finalDescription
        if (labelIds.length > 0) input.labelIds = labelIds
        if (teamId !== undefined) input.teamId = teamId
        if (projectId !== undefined) input.projectId = projectId
        if (projectMilestoneId !== undefined) {
          input.projectMilestoneId = projectMilestoneId
        }
        if (cycleId !== undefined) input.cycleId = cycleId
        if (stateId !== undefined) input.stateId = stateId

        if (!json) {
          console.log(`Updating issue ${issueId}`)
          console.log()
        }

        const updateIssueMutation = gql(`
          mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
            issueUpdate(id: $id, input: $input) {
              success
              issue {
                id
                identifier
                title
                url
                dueDate
                assignee {
                  id
                  name
                  displayName
                  initials
                }
                parent {
                  id
                  identifier
                  title
                  url
                  dueDate
                  state {
                    name
                    color
                  }
                }
                state {
                  name
                  color
                }
              }
            }
          }
        `)

        const client = getGraphQLClient()
        const data = await withSpinner(
          () =>
            client.request(updateIssueMutation, {
              id: issueId,
              input,
            }),
          { enabled: !json },
        )

        if (!data.issueUpdate.success) {
          throw new CliError("Issue update failed")
        }

        const issue = data.issueUpdate.issue
        if (!issue) {
          throw new CliError("Issue update failed - no issue returned")
        }

        if (json) {
          console.log(JSON.stringify(buildIssueWritePayload(issue), null, 2))
          return
        }

        console.log(`✓ Updated issue ${issue.identifier}: ${issue.title}`)
        console.log(issue.url)
      } catch (error) {
        handleError(error, "Failed to update issue")
      }
    },
  )
