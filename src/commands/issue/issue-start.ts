import { Command } from "@cliffy/command"
import { Select } from "@cliffy/prompt"
import { getPriorityDisplay } from "../../utils/display.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { ensureInteractiveInputAvailable } from "../../utils/interactive.ts"
import {
  fetchIssuesForState,
  getIssueIdentifier,
  requireTeamKey,
} from "../../utils/linear.ts"
import {
  buildStartWorkPlan,
  startWorkOnIssue as startIssue,
} from "../../utils/actions.ts"
import {
  handleError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors.ts"

export const startCommand = new Command()
  .name("start")
  .description("Start working on an issue")
  .arguments("[issueId:string]")
  .option(
    "-A, --all-assignees",
    "Show issues for all assignees",
  )
  .option(
    "-U, --unassigned",
    "Show only unassigned issues",
  )
  .option(
    "-f, --from-ref <fromRef:string>",
    "Git ref to create new branch from",
  )
  .option(
    "-b, --branch <branch:string>",
    "Custom branch name to use instead of the issue identifier",
  )
  .option("-i, --interactive", "Enable interactive issue selection")
  .option(
    "--dry-run",
    "Preview the branch and state transition without making changes",
  )
  .example(
    "Preview the branch and state transition",
    "linear issue start ENG-123 --dry-run",
  )
  .example(
    "Pick from all unstarted issues",
    "linear issue start --all-assignees",
  )
  .action(async (
    { allAssignees, unassigned, fromRef, branch, dryRun, interactive },
    issueId,
  ) => {
    try {
      const teamId = requireTeamKey()

      // Validate that conflicting flags are not used together
      if (allAssignees && unassigned) {
        throw new ValidationError(
          "Cannot specify both --all-assignees and --unassigned",
        )
      }

      // Only resolve the provided issueId, don't infer from VCS
      // (start should pick from a list, not continue on current issue)
      let resolvedId = issueId ? await getIssueIdentifier(issueId) : undefined
      if (!resolvedId) {
        ensureInteractiveInputAvailable(
          { interactive },
          "Issue ID is required unless --interactive is used",
          "Pass an issue ID like `linear issue start ENG-123`, or use --interactive to pick from a list.",
        )
        const result = await fetchIssuesForState({
          teamKey: teamId,
          state: ["unstarted"],
          unassigned,
          allAssignees,
        })
        const issues = result.issues?.nodes || []

        if (issues.length === 0) {
          throw new NotFoundError("Unstarted issues", teamId)
        }

        const answer = await Select.prompt({
          message: "Select an issue to start:",
          search: true,
          searchLabel: "Search issues",
          options: issues.map((
            issue: { identifier: string; title: string; priority: number },
          ) => ({
            name: getPriorityDisplay(issue.priority) +
              ` ${issue.identifier}: ${issue.title}`,
            value: issue.identifier,
          })),
        })

        resolvedId = answer as string
      }

      if (!resolvedId) {
        throw new ValidationError("No issue ID resolved")
      }

      if (dryRun) {
        const plan = await buildStartWorkPlan(
          resolvedId,
          teamId,
          fromRef,
          branch,
        )
        emitDryRunOutput({
          summary: `Would start work on issue ${resolvedId}`,
          data: plan.preview,
          lines: [
            `- vcs: ${plan.preview.vcs}`,
            plan.preview.branchName == null
              ? "- branch: n/a (jj does not create branches)"
              : `- branch: ${plan.preview.branchName}`,
            plan.preview.sourceRef == null
              ? null
              : `- from ref: ${plan.preview.sourceRef}`,
            `- target state: ${plan.preview.targetState.name}`,
          ].filter((line): line is string => line != null),
        })
        return
      }

      await startIssue(resolvedId, teamId, fromRef, branch, interactive === true)
    } catch (error) {
      handleError(error, "Failed to start issue")
    }
  })
