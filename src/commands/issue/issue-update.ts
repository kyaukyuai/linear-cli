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
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { resolveJsonOutputMode } from "../../utils/output_mode.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  CliError,
  isWriteTimeoutError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors.ts"
import { reconcileWriteTimeoutError } from "../../utils/write_reconciliation.ts"
import { readTextFromStdin } from "../../utils/stdin.ts"
import {
  buildWriteTimeoutSuggestion,
  resolveWriteTimeoutMs,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"
import { buildIssueWritePayload } from "./issue-write-payload.ts"
import { buildIssueCommentPayload } from "./issue-comment-payload.ts"
import { createIssueComment } from "./issue-comment-utils.ts"
import { buildIssueUpdateDryRunPayload } from "./issue-dry-run-payload.ts"
import { maybeHandleIssueDescriptionParseError } from "./issue-description-parse.ts"
import { buildPartialSuccessDetails } from "../../utils/retry_semantics.ts"
import {
  findIssueCommentForTimeoutReconciliation,
  type IssueUpdateReconciliationInput,
  reconcileIssueUpdateTimeout,
} from "./issue-reconciliation.ts"
import {
  buildExternalContextPayload,
  buildExternalContextSourceProvenance,
  type ExternalContextTarget,
  readExternalContextFromFile,
  renderExternalContextMarkdown,
} from "../../utils/external_context.ts"
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../utils/operation_receipt.ts"
import {
  buildWriteApplyOperationFromReceipt,
  buildWritePreviewOperation,
  withWriteOperationContract,
} from "../../utils/write_operation.ts"
import { buildSourceTriageContract } from "../../utils/source_triage.ts"

function getIssueUpdateAppliedChanges(
  input: IssueUpdateReconciliationInput,
  comment: string | undefined,
): string[] {
  const changes: string[] = []

  if (input.title != null) changes.push("title")
  if (input.assigneeId != null) changes.push("assignee")
  if ("dueDate" in input) changes.push("dueDate")
  if (input.parentId != null) changes.push("parent")
  if (input.priority != null) changes.push("priority")
  if (input.estimate != null) changes.push("estimate")
  if (input.description != null) changes.push("description")
  if (input.labelIds != null) changes.push("labels")
  if (input.teamId != null) changes.push("team")
  if (input.projectId != null) changes.push("project")
  if (input.projectMilestoneId != null) changes.push("milestone")
  if (input.cycleId != null) changes.push("cycle")
  if (input.stateId != null) changes.push("state")
  if (comment != null) changes.push("comment")

  return changes
}

function parseExternalContextTarget(
  value: string | undefined,
): ExternalContextTarget {
  if (value == null || value === "comment" || value === "description") {
    return value ?? "comment"
  }

  throw new ValidationError(
    `Unsupported --context-target value: ${value}`,
    {
      suggestion:
        "Use --context-target comment or --context-target description.",
    },
  )
}

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
    "Description of the issue (prefer --description-file for markdown)",
  )
  .option(
    "--comment <comment:string>",
    "Add a comment after successfully updating the issue",
  )
  .option(
    "--description-file <path:string>",
    "Read description from a file (preferred for markdown content)",
  )
  .option(
    "--context-file <path:string>",
    "Read a normalized external context JSON envelope from a file.",
  )
  .option(
    "--context-target <target:string>",
    "Map --context-file into description or comment (default: comment).",
  )
  .option(
    "--apply-triage",
    "Apply deterministic triage hints from --context-file when routing fields are omitted.",
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
  .option(
    "--no-interactive",
    "Accepted for compatibility; issue update is always non-interactive",
  )
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .option("--dry-run", "Preview the update without mutating the issue")
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .option("-t, --title <title:string>", "Title of the issue")
  .example(
    "Update state and assignee",
    "linear issue update ENG-123 --state started --assignee self",
  )
  .example(
    "Preview an update with a comment",
    'linear issue update ENG-123 --state completed --comment "Ready for review" --dry-run',
  )
  .example(
    "Pipe a description into an update",
    "cat description.md | linear issue update ENG-123 --state started --dry-run --json",
  )
  .example(
    "Preview an update with normalized source context",
    "linear issue update ENG-123 --state triage --context-file slack-thread.json --dry-run --json",
  )
  .example(
    "Apply deterministic triage from normalized source context",
    "linear issue update ENG-123 --context-file slack-thread.json --apply-triage --dry-run --json",
  )
  .example(
    "Return the updated issue as JSON",
    'linear issue update ENG-123 --title "Fix auth timeout edge case"',
  )
  .example(
    "Return human-readable terminal output",
    'linear issue update ENG-123 --title "Fix auth timeout edge case" --text',
  )
  .error((error, cmd) => {
    if (
      maybeHandleIssueDescriptionParseError(
        error,
        cmd,
        "Failed to update issue",
      )
    ) {
      return
    }
    handleAutomationContractParseError(error, cmd, "Failed to update issue")
  })
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
        comment,
        descriptionFile,
        contextFile,
        contextTarget,
        applyTriage,
        label: labels,
        team,
        project,
        state,
        milestone,
        cycle,
        title,
        json: jsonFlag,
        text,
        dryRun,
        timeoutMs,
      },
      issueIdArg,
    ) => {
      const json = resolveJsonOutputMode("linear issue update", {
        json: jsonFlag,
        text,
      })
      try {
        // Validate that description and descriptionFile are not both provided
        if (description && descriptionFile) {
          throw new ValidationError(
            "Cannot specify both --description and --description-file",
          )
        }
        const resolvedContextTarget = parseExternalContextTarget(contextTarget)
        if (contextFile == null && contextTarget != null) {
          throw new ValidationError(
            "--context-target requires --context-file",
            {
              suggestion:
                "Pass --context-file with a normalized external context envelope before choosing a target.",
            },
          )
        }
        if (contextFile != null && descriptionFile != null) {
          throw new ValidationError(
            "Cannot specify both --context-file and --description-file",
            {
              suggestion:
                "Use --context-file to derive content from normalized source context, or --description-file to provide explicit markdown content.",
            },
          )
        }
        if (applyTriage && contextFile == null) {
          throw new ValidationError(
            "--apply-triage requires --context-file",
            {
              suggestion:
                "Pass --context-file with a normalized external context envelope before applying deterministic triage.",
            },
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
        } else if (finalDescription == null) {
          const stdinDescription = await readTextFromStdin()
          if (stdinDescription != null) {
            finalDescription = stdinDescription
          }
        }
        let finalComment = comment
        const externalContext = contextFile == null
          ? null
          : await readExternalContextFromFile(contextFile)
        if (externalContext != null) {
          const renderedContext = renderExternalContextMarkdown(externalContext)

          if (resolvedContextTarget === "description") {
            if (finalDescription != null) {
              throw new ValidationError(
                "Cannot combine --context-file with explicit description input when --context-target description is used",
                {
                  suggestion:
                    "Use only --context-file for the description, or remove it and pass --description, --description-file, or stdin content explicitly.",
                },
              )
            }
            finalDescription = renderedContext
          } else {
            if (finalComment != null) {
              throw new ValidationError(
                "Cannot combine --context-file with --comment when --context-target comment is used",
                {
                  suggestion:
                    "Use only --context-file for the comment body, or remove it and pass --comment explicitly.",
                },
              )
            }
            finalComment = renderedContext
          }
        }
        const sourceContext = externalContext == null
          ? null
          : buildExternalContextPayload(externalContext, resolvedContextTarget)
        const hasExplicitIssueUpdates = title !== undefined ||
          assignee !== undefined ||
          dueDate !== undefined ||
          clearDueDate === true ||
          parent !== undefined ||
          priority !== undefined ||
          estimate !== undefined ||
          finalDescription !== undefined ||
          (labels?.length ?? 0) > 0 ||
          team !== undefined ||
          project !== undefined ||
          state !== undefined ||
          milestone !== undefined ||
          cycle !== undefined
        if (applyTriage && externalContext?.triage == null) {
          throw new ValidationError(
            "--apply-triage requires triage hints inside --context-file",
            {
              suggestion:
                "Add a triage object with team, state, labels, duplicateIssueRefs, or relatedIssueRefs to the normalized context envelope.",
            },
          )
        }

        if (finalComment != null && finalComment.trim().length === 0) {
          throw new ValidationError("Comment body cannot be empty")
        }
        if (finalComment != null && !hasExplicitIssueUpdates && !applyTriage) {
          throw new ValidationError(
            "Cannot add a comment without any issue updates",
            {
              suggestion: sourceContext != null
                ? "Use --context-target description, pair --context-file with another issue update, apply triage with --apply-triage, or use `linear issue comment add <ISSUE> --body-file <path>` for a standalone context comment."
                : "Use `linear issue comment add <ISSUE> --body <text>` or pipe the comment body to `linear issue comment add` for a standalone comment.",
            },
          )
        }

        const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)

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

        const triageResult = externalContext == null || applyTriage !== true
          ? null
          : await buildSourceTriageContract({
            context: externalContext,
            target: "issue.update",
            applyRequested: applyTriage === true,
            fallbackTeamKey: teamKey,
            preferTriageTeamForResolution: false,
            explicitTeam: team ?? null,
            explicitState: state ?? null,
            explicitLabels: labels ?? [],
            supportsTeamApply: false,
          })

        if (applyTriage && triageResult != null) {
          const { state: triageState, labels: triageLabels } =
            triageResult.triage.suggestions

          if (state == null && externalContext?.triage?.state != null) {
            if (triageState.status === "unresolved") {
              throw new ValidationError(
                "Failed to apply triage workflow state suggestion",
                {
                  suggestion: triageState.reason ??
                    "Fix the triage state hint in --context-file or pass --state explicitly.",
                },
              )
            }
            if (triageState.applied && triageResult.resolved.state != null) {
              state = triageResult.resolved.state.name
            }
          }

          const unresolvedTriageLabels = triageLabels.filter((label) =>
            label.status === "unresolved"
          )
          if (unresolvedTriageLabels.length > 0) {
            throw new ValidationError(
              "Failed to apply triage label suggestions",
              {
                suggestion: unresolvedTriageLabels.map((label) =>
                  label.reason ?? `Fix triage label hint: ${label.requested}`
                ).join(" "),
              },
            )
          }

          const appliedTriageLabels = triageLabels.flatMap((label) =>
            label.applied && label.resolved != null ? [label.resolved.name] : []
          )
          if (appliedTriageLabels.length > 0) {
            labels = [...new Set([...(labels ?? []), ...appliedTriageLabels])]
          }
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
        const input: IssueUpdateReconciliationInput = {}

        if (title !== undefined) input.title = title
        if (assigneeId !== undefined) input.assigneeId = assigneeId
        if (dueDate !== undefined) input.dueDate = dueDate
        if (clearDueDate) input.dueDate = null
        let parentPreview:
          | {
            id: string
            identifier: string
          }
          | null = null
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
          parentPreview = {
            id: parentId,
            identifier: parentIdentifier,
          }
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

        if (finalComment != null && Object.keys(input).length === 0) {
          throw new ValidationError(
            "Cannot add a comment without any issue updates",
            {
              suggestion: sourceContext != null
                ? "Use --context-target description, pair --context-file with another issue update, apply triage with --apply-triage, or use `linear issue comment add <ISSUE> --body-file <path>` for a standalone context comment."
                : "Use `linear issue comment add <ISSUE> --body <text>` or pipe the comment body to `linear issue comment add` for a standalone comment.",
            },
          )
        }

        if (dryRun) {
          const previewPayload = buildIssueUpdateDryRunPayload({
            issue: { identifier: issueId },
            input,
            parent: parentPreview,
            comment: finalComment,
            sourceContext: sourceContext ?? undefined,
            triage: triageResult?.triage,
          })
          const summary = `Would update issue ${issueId}`
          emitDryRunOutput({
            json,
            summary,
            data: previewPayload,
            operation: buildWritePreviewOperation({
              command: "issue.update",
              resource: "issue",
              action: "update",
              summary,
              refs: {
                issueIdentifier: issueId,
                teamKey,
                parentIssueIdentifier: parentPreview?.identifier ?? null,
                state: state ?? null,
                sourceSystem: sourceContext?.source.system ?? null,
                sourceRef: sourceContext?.source.ref ?? null,
              },
              changes: getIssueUpdateAppliedChanges(input, finalComment),
            }),
            lines: [
              `Issue: ${issueId}`,
              ...(finalComment != null
                ? ["Would add comment after update"]
                : []),
              ...(triageResult != null
                ? [
                  `Triage suggestions: ${
                    triageResult.triage.appliedChanges.length > 0
                      ? triageResult.triage.appliedChanges.join(", ")
                      : "preview only"
                  }`,
                ]
                : []),
            ],
          })
          return
        }

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
        let data
        try {
          data = await withSpinner(
            () =>
              withWriteTimeout(
                (signal) =>
                  client.request({
                    document: updateIssueMutation,
                    variables: {
                      id: issueId,
                      input,
                    },
                    signal,
                  }),
                {
                  operation: "issue update",
                  timeoutMs: writeTimeoutMs,
                  suggestion: buildWriteTimeoutSuggestion(),
                },
              ),
            { enabled: !json },
          )
        } catch (error) {
          if (isWriteTimeoutError(error)) {
            await reconcileWriteTimeoutError(
              error,
              () => reconcileIssueUpdateTimeout(client, issueId, input),
            )
          }
          throw error
        }

        if (!data.issueUpdate.success) {
          throw new CliError("Issue update failed")
        }

        const issue = data.issueUpdate.issue
        if (!issue) {
          throw new CliError("Issue update failed - no issue returned")
        }
        const issuePayload = buildIssueWritePayload(issue)
        const sourceProvenance = externalContext == null
          ? undefined
          : buildExternalContextSourceProvenance(
            externalContext,
            resolvedContextTarget,
            {
              triageApplied: triageResult != null,
            },
          )
        const receipt = buildOperationReceipt({
          operationId: "issue.update",
          resource: "issue",
          action: "update",
          resolvedRefs: {
            issueIdentifier: issue.identifier,
            teamKey,
            assignee: issuePayload.assignee?.name ?? null,
            parentIssueIdentifier: issuePayload.parent?.identifier ?? null,
            state: issuePayload.state?.name ?? null,
            sourceSystem: sourceContext?.source.system ?? null,
            sourceRef: sourceContext?.source.ref ?? null,
          },
          appliedChanges: getIssueUpdateAppliedChanges(input, finalComment),
          nextSafeAction: finalComment != null
            ? "read_before_retry"
            : "continue",
          sourceProvenance,
        })

        let createdComment = null
        if (finalComment != null) {
          try {
            createdComment = await createIssueComment(
              {
                issueId: issue.id,
                body: finalComment,
              },
              {
                client,
                spinnerEnabled: !json,
                timeoutMs: writeTimeoutMs,
              },
            )
          } catch (error) {
            if (isWriteTimeoutError(error)) {
              const timeoutContextError = buildIssueUpdateCommentFailureError(
                issuePayload,
                finalComment,
                error,
              )
              await reconcileWriteTimeoutError(
                timeoutContextError,
                async () => {
                  const retryCommand =
                    `linear issue comment add ${issue.identifier} --body ${
                      JSON.stringify(finalComment)
                    }`
                  const reconciledComment =
                    await findIssueCommentForTimeoutReconciliation(
                      client,
                      issue.identifier,
                      finalComment,
                      {
                        fallbackIssue: {
                          id: issue.id,
                          identifier: issue.identifier,
                          title: issue.title,
                          url: issue.url,
                        },
                      },
                    )

                  if (reconciledComment != null) {
                    return {
                      outcome: "probably_succeeded",
                      suggestion:
                        "Linear now shows the comment. Treat this combined write as succeeded unless you need stronger confirmation.",
                      details: {
                        failureStage: "comment_create",
                        issue: issuePayload,
                        comment: reconciledComment,
                        commentObserved: true,
                      },
                    }
                  }

                  return {
                    outcome: "partial_success",
                    suggestion:
                      `Retry with \`${retryCommand}\` if the comment is still missing.`,
                    details: buildPartialSuccessDetails(
                      {
                        issueUpdated: true,
                        commentAttempted: true,
                        issue: issuePayload,
                      },
                      {
                        failureStage: "comment_create",
                        retryable: true,
                        retryCommand,
                        extraDetails: {
                          commentObserved: false,
                        },
                      },
                    ),
                  }
                },
              )
            }
            throw buildIssueUpdateCommentFailureError(
              issuePayload,
              finalComment,
              error,
            )
          }
        }

        if (json) {
          const issuePayloadWithContext = sourceContext == null
            ? issuePayload
            : {
              ...issuePayload,
              sourceContext,
            }
          const issuePayloadWithTriage = triageResult == null
            ? issuePayloadWithContext
            : {
              ...issuePayloadWithContext,
              triage: triageResult.triage,
            }
          console.log(JSON.stringify(
            withWriteOperationContract(
              withOperationReceipt(
                createdComment == null ? issuePayloadWithTriage : {
                  ...issuePayloadWithTriage,
                  comment: buildIssueCommentPayload(createdComment, {
                    id: issue.id,
                    identifier: issue.identifier,
                    title: issue.title,
                    url: issue.url,
                  }),
                },
                receipt,
              ),
              buildWriteApplyOperationFromReceipt(
                `Updated issue ${issue.identifier}`,
                receipt,
              ),
            ),
            null,
            2,
          ))
          return
        }

        console.log(`✓ Updated issue ${issue.identifier}: ${issue.title}`)
        console.log(issue.url)
        if (createdComment != null) {
          console.log(`✓ Comment added to ${issue.identifier}`)
          console.log(createdComment.url)
        }
      } catch (error) {
        handleAutomationCommandError(error, "Failed to update issue", json)
      }
    },
  )

type IssueUpdateCommentFailureIssue = ReturnType<typeof buildIssueWritePayload>

function buildIssueUpdateCommentFailureError(
  issue: IssueUpdateCommentFailureIssue,
  comment: string,
  error: unknown,
): CliError {
  const retryCommand = `linear issue comment add ${issue.identifier} --body ${
    JSON.stringify(comment)
  }`
  const failureMode = isWriteTimeoutError(error)
    ? "timeout_waiting_for_confirmation"
    : "error"

  return new CliError(
    isWriteTimeoutError(error)
      ? `Issue ${issue.identifier} was updated, but adding the comment did not complete in time.`
      : `Issue ${issue.identifier} was updated, but adding the comment failed.`,
    {
      suggestion: isWriteTimeoutError(error)
        ? `Retry with \`${retryCommand}\`. Increase the timeout with --timeout-ms or LINEAR_WRITE_TIMEOUT_MS if comment creation is consistently slow.`
        : `Retry with \`${retryCommand}\`.`,
      cause: error,
      details: buildPartialSuccessDetails(
        {
          issueUpdated: true,
          commentAttempted: true,
          issue,
        },
        {
          failureStage: "comment_create",
          retryable: true,
          retryCommand,
          extraDetails: {
            failureMode,
          },
        },
      ),
    },
  )
}
