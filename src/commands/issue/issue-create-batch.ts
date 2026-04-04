import { Command } from "@cliffy/command"
import { bold } from "@std/fmt/colors"
import { gql } from "../../__codegen__/gql.ts"
import type { IssueCreateInput } from "../../__codegen__/graphql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import {
  getIssueLabelIdByNameForTeam,
  getProjectIdByName,
  getTeamIdByKey,
  getWorkflowStateByNameOrType,
  lookupUserId,
  requireTeamKey,
} from "../../utils/linear.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../utils/operation_receipt.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { CliError, NotFoundError, ValidationError } from "../../utils/errors.ts"
import {
  buildWriteApplyOperationFromReceipt,
  buildWritePreviewOperation,
  withWriteOperationContract,
} from "../../utils/write_operation.ts"
import {
  buildWriteTimeoutSuggestion,
  resolveWriteTimeoutMs,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"
import {
  buildIssueWritePayload,
  type IssueWritePayloadIssue,
} from "./issue-write-payload.ts"
import { buildIssueCreateBatchDryRunPayload } from "./issue-dry-run-payload.ts"

type BatchIssueSpec = {
  title: string
  description?: string
  assignee?: string
  dueDate?: string
  priority?: number
  estimate?: number
  state?: string
  labels?: string[]
}

type BatchCreateSpec = {
  team?: string
  project?: string
  parent: BatchIssueSpec
  children: BatchIssueSpec[]
}

type BatchFailureDetails = {
  command: "issue.create-batch"
  createdIdentifiers: string[]
  createdCount: number
  failedStep: {
    stage: "child"
    index: number
    total: number
    title: string
  }
  retryable: false
  retryHint: string
}

const CreateIssue = gql(`
  mutation CreateIssue($input: IssueCreateInput!) {
    issueCreate(input: $input) {
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
        team {
          key
        }
      }
    }
  }
`)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null && !Array.isArray(value)
}

function readOptionalString(
  value: unknown,
  fieldPath: string,
): string | undefined {
  if (value == null) {
    return undefined
  }
  if (typeof value !== "string") {
    throw new ValidationError(`${fieldPath} must be a string`)
  }
  return value
}

function parseBatchIssueSpec(
  value: unknown,
  fieldPath: string,
): BatchIssueSpec {
  if (!isRecord(value)) {
    throw new ValidationError(`${fieldPath} must be an object`)
  }

  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    throw new ValidationError(`${fieldPath}.title must be a non-empty string`)
  }

  if (value.priority != null) {
    if (
      typeof value.priority !== "number" ||
      !Number.isInteger(value.priority) ||
      value.priority < 0 ||
      value.priority > 4
    ) {
      throw new ValidationError(
        `${fieldPath}.priority must be an integer between 0 and 4`,
      )
    }
  }

  if (value.estimate != null) {
    if (
      typeof value.estimate !== "number" ||
      !Number.isInteger(value.estimate) ||
      value.estimate < 0
    ) {
      throw new ValidationError(
        `${fieldPath}.estimate must be a non-negative integer`,
      )
    }
  }

  if (value.dueDate != null) {
    if (
      typeof value.dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.dueDate)
    ) {
      throw new ValidationError(
        `${fieldPath}.dueDate must be an ISO date string like 2026-03-31`,
      )
    }
  }

  if (value.labels != null) {
    if (
      !Array.isArray(value.labels) ||
      value.labels.some((label) => typeof label !== "string")
    ) {
      throw new ValidationError(
        `${fieldPath}.labels must be an array of strings`,
      )
    }
  }

  return {
    title: value.title.trim(),
    description: readOptionalString(
      value.description,
      `${fieldPath}.description`,
    ),
    assignee: readOptionalString(value.assignee, `${fieldPath}.assignee`),
    dueDate: readOptionalString(value.dueDate, `${fieldPath}.dueDate`),
    priority: value.priority as number | undefined,
    estimate: value.estimate as number | undefined,
    state: readOptionalString(value.state, `${fieldPath}.state`),
    labels: value.labels as string[] | undefined,
  }
}

function parseBatchCreateSpec(
  rawText: string,
  filePath: string,
): BatchCreateSpec {
  let parsed: unknown

  try {
    parsed = JSON.parse(rawText)
  } catch (error) {
    throw new ValidationError(
      `Failed to parse batch file: ${filePath}`,
      {
        suggestion: error instanceof Error ? error.message : String(error),
      },
    )
  }

  if (!isRecord(parsed)) {
    throw new ValidationError("Batch file must contain a JSON object")
  }

  const childrenValue = parsed.children
  if (!Array.isArray(childrenValue) || childrenValue.length === 0) {
    throw new ValidationError(
      "Batch file must contain a non-empty children array",
      {
        suggestion: "Provide at least one child issue in the children array.",
      },
    )
  }

  return {
    team: readOptionalString(parsed.team, "team"),
    project: readOptionalString(parsed.project, "project"),
    parent: parseBatchIssueSpec(parsed.parent, "parent"),
    children: childrenValue.map((child, index) =>
      parseBatchIssueSpec(child, `children[${index}]`)
    ),
  }
}

async function resolveLabelIds(
  labels: string[] | undefined,
  teamKey: string,
): Promise<string[]> {
  if (labels == null || labels.length === 0) {
    return []
  }

  const labelIds: string[] = []
  for (const label of labels) {
    const labelId = await getIssueLabelIdByNameForTeam(label, teamKey)
    if (!labelId) {
      throw new NotFoundError("Issue label", label)
    }
    labelIds.push(labelId)
  }
  return labelIds
}

async function buildIssueCreateInput(
  spec: BatchIssueSpec,
  context: {
    teamKey: string
    teamId: string
    projectId?: string
    parentId?: string
  },
): Promise<IssueCreateInput> {
  let assigneeId: string | undefined
  if (spec.assignee != null) {
    assigneeId = await lookupUserId(spec.assignee)
    if (!assigneeId) {
      throw new NotFoundError("User", spec.assignee)
    }
  }

  let stateId: string | undefined
  if (spec.state != null) {
    const workflowState = await getWorkflowStateByNameOrType(
      context.teamKey,
      spec.state,
    )
    if (!workflowState) {
      throw new NotFoundError(
        "Workflow state",
        `'${spec.state}' for team ${context.teamKey}`,
      )
    }
    stateId = workflowState.id
  }

  const labelIds = await resolveLabelIds(spec.labels, context.teamKey)

  return {
    title: spec.title,
    description: spec.description,
    assigneeId,
    dueDate: spec.dueDate,
    parentId: context.parentId,
    priority: spec.priority,
    estimate: spec.estimate,
    labelIds,
    teamId: context.teamId,
    projectId: context.projectId,
    stateId,
  }
}

async function createIssue(
  input: IssueCreateInput,
  options: { json: boolean; message: string; timeoutMs: number },
): Promise<IssueWritePayloadIssue> {
  const client = getGraphQLClient()
  const data = await withSpinner(
    () =>
      withWriteTimeout(
        (signal) =>
          client.request({
            document: CreateIssue,
            variables: { input },
            signal,
          }),
        {
          operation: "issue creation",
          timeoutMs: options.timeoutMs,
          suggestion: buildWriteTimeoutSuggestion(),
        },
      ),
    { enabled: !options.json, message: options.message },
  )

  if (!data.issueCreate.success) {
    throw new CliError("Issue creation failed")
  }

  const issue = data.issueCreate.issue
  if (!issue) {
    throw new CliError("Issue creation failed - no issue returned")
  }

  return issue
}

function buildBatchFailureDetails(
  issues: ReturnType<typeof buildIssueWritePayload>[],
  child: BatchIssueSpec,
  index: number,
  total: number,
): BatchFailureDetails {
  return {
    command: "issue.create-batch",
    createdIdentifiers: issues.map((issue) => issue.identifier),
    createdCount: issues.length,
    failedStep: {
      stage: "child",
      index: index + 1,
      total,
      title: child.title,
    },
    retryable: false,
    retryHint:
      "Do not rerun the same batch file unchanged after a partial failure. Remove already created issues from the input or rerun only the remaining work.",
  }
}

export const createBatchCommand = new Command()
  .name("create-batch")
  .description("Create a parent issue and child issues from a JSON file")
  .option(
    "--file <path:string>",
    "Path to a JSON file describing the issue batch",
  )
  .option("--team <team:string>", "Team key override for the batch file")
  .option(
    "--project <project:string>",
    "Project name override for the batch file",
  )
  .option("-j, --json", "Output as JSON")
  .option("--dry-run", "Preview the batch without creating issues")
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .example(
    "Preview a parent and child issue batch",
    "linear issue create-batch --file rollout.json --dry-run",
  )
  .example(
    "Create a batch and return JSON",
    "linear issue create-batch --file rollout.json --json",
  )
  .error((error, cmd) => {
    handleAutomationContractParseError(
      error,
      cmd,
      "Failed to create issue batch",
    )
  })
  .action(async ({ file, team, project, json, dryRun, timeoutMs }) => {
    const jsonOutput = json === true

    try {
      const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
      if (file == null) {
        throw new ValidationError(
          "Batch file is required",
          {
            suggestion: "Use --file <path> to specify a JSON batch definition.",
          },
        )
      }

      const rawText = await Deno.readTextFile(file).catch((error) => {
        throw new ValidationError(
          `Failed to read batch file: ${file}`,
          {
            suggestion: error instanceof Error ? error.message : String(error),
          },
        )
      })

      const batch = parseBatchCreateSpec(rawText, file)
      const teamKey = requireTeamKey(team ?? batch.team)
      const teamId = await getTeamIdByKey(teamKey)
      if (!teamId) {
        throw new NotFoundError("Team", teamKey)
      }

      const effectiveProject = project ?? batch.project
      let projectId: string | undefined
      if (effectiveProject != null) {
        projectId = await getProjectIdByName(effectiveProject)
        if (projectId == null) {
          throw new NotFoundError("Project", effectiveProject)
        }
      }

      const parentInput = await buildIssueCreateInput(batch.parent, {
        teamKey,
        teamId,
        projectId,
      })
      const childInputs = await Promise.all(
        batch.children.map((child) =>
          buildIssueCreateInput(child, {
            teamKey,
            teamId,
            projectId,
            parentId: "(resolved at execution time)",
          })
        ),
      )
      if (dryRun) {
        const summary = `Would create ${
          batch.children.length + 1
        } issues in batch for ${teamKey}`
        emitDryRunOutput({
          json,
          summary,
          data: buildIssueCreateBatchDryRunPayload({
            team: { id: teamId, key: teamKey },
            project: {
              id: projectId ?? null,
              nameOrSlug: effectiveProject ?? null,
            },
            parent: parentInput,
            children: childInputs,
          }),
          operation: buildWritePreviewOperation({
            command: "issue.create-batch",
            resource: "issue_batch",
            action: "create",
            summary,
            refs: {
              teamKey,
              projectId: projectId ?? null,
              project: effectiveProject ?? null,
            },
            changes: ["parent", "children"],
          }),
          lines: [
            `Team: ${teamKey}`,
            `Parent: ${batch.parent.title}`,
            `Children: ${batch.children.length}`,
          ],
        })
        return
      }

      const createdParentAndChildren: ReturnType<
        typeof buildIssueWritePayload
      >[] = []

      const parent = await createIssue(
        parentInput,
        {
          json: jsonOutput,
          message: "Creating parent issue",
          timeoutMs: writeTimeoutMs,
        },
      )
      const parentPayload = buildIssueWritePayload(parent)
      createdParentAndChildren.push(parentPayload)

      const childPayloads: ReturnType<typeof buildIssueWritePayload>[] = []

      for (const [index, child] of batch.children.entries()) {
        try {
          const createdChild = await createIssue(
            await buildIssueCreateInput(child, {
              teamKey,
              teamId,
              projectId,
              parentId: parent.id,
            }),
            {
              json: jsonOutput,
              message: `Creating child issue ${
                index + 1
              }/${batch.children.length}`,
              timeoutMs: writeTimeoutMs,
            },
          )
          const childPayload = buildIssueWritePayload(createdChild)
          createdParentAndChildren.push(childPayload)
          childPayloads.push(childPayload)
        } catch (error) {
          const details = buildBatchFailureDetails(
            createdParentAndChildren,
            child,
            index,
            batch.children.length,
          )
          throw new CliError(
            `Issue batch creation failed while creating child ${
              index + 1
            } of ${batch.children.length}`,
            {
              suggestion: `${
                details.createdIdentifiers.length > 0
                  ? `Already created issues: ${
                    details.createdIdentifiers.join(", ")
                  }. `
                  : ""
              }Remove already created issues from the batch file before retrying, or rerun only the remaining work.`,
              details,
              cause: error,
            },
          )
        }
      }

      if (jsonOutput) {
        const receipt = buildOperationReceipt({
          operationId: "issue.create-batch",
          resource: "issue_batch",
          action: "create",
          resolvedRefs: {
            teamKey,
            project: effectiveProject ?? null,
            parentIssueIdentifier: parentPayload.identifier,
          },
          appliedChanges: ["parent", "children"],
          nextSafeAction: "read_before_retry",
        })
        console.log(
          JSON.stringify(
            withWriteOperationContract(
              withOperationReceipt(
                {
                  team: teamKey,
                  project: effectiveProject ?? null,
                  parent: parentPayload,
                  children: childPayloads,
                  counts: {
                    totalCreated: createdParentAndChildren.length,
                    childCount: childPayloads.length,
                  },
                },
                receipt,
              ),
              buildWriteApplyOperationFromReceipt(
                `Created ${createdParentAndChildren.length} issues in batch for ${teamKey}`,
                receipt,
              ),
            ),
            null,
            2,
          ),
        )
        return
      }

      console.log(
        bold(
          `Created ${createdParentAndChildren.length} issues for batch in ${teamKey}`,
        ),
      )
      console.log(`Parent: ${parentPayload.identifier} ${parentPayload.url}`)
      for (const child of childPayloads) {
        console.log(`Child: ${child.identifier} ${child.url}`)
      }
    } catch (error) {
      handleAutomationCommandError(
        error,
        "Failed to create issue batch",
        jsonOutput,
      )
    }
  })
