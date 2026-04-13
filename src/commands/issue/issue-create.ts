import { Command } from "@cliffy/command"
import { Checkbox, Input, Select } from "@cliffy/prompt"
import { getOption } from "../../config.ts"
import { gql } from "../../__codegen__/gql.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { getEditor, openEditor } from "../../utils/editor.ts"
import { getPriorityDisplay } from "../../utils/display.ts"
import {
  fetchParentIssueData,
  getAllTeams,
  getCycleIdByNameOrNumber,
  getIssueId,
  getIssueIdentifier,
  getIssueLabelIdByNameForTeam,
  getIssueLabelOptionsByNameForTeam,
  getLabelsForTeam,
  getMilestoneIdByName,
  getProjectIdByName,
  getProjectOptionsByName,
  getTeamIdByKey,
  getTeamKey,
  getWorkflowStateByNameOrType,
  getWorkflowStates,
  lookupUserId,
  searchTeamsByKeySubstring,
  selectOption,
  type WorkflowState,
} from "../../utils/linear.ts"
import { startWorkOnIssue } from "../../utils/actions.ts"
import {
  handleAutomationCommandError,
  handleAutomationContractParseError,
} from "../../utils/json_output.ts"
import { resolveJsonOutputMode } from "../../utils/output_mode.ts"
import { ensureInteractiveInputAvailable } from "../../utils/interactive.ts"
import { emitDryRunOutput } from "../../utils/dry_run.ts"
import { withSpinner } from "../../utils/spinner.ts"
import { CliError, NotFoundError, ValidationError } from "../../utils/errors.ts"
import { readTextFromStdin } from "../../utils/stdin.ts"
import {
  buildWriteTimeoutSuggestion,
  resolveWriteTimeoutMs,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../utils/operation_receipt.ts"
import {
  buildExternalContextPayload,
  deriveTitleFromExternalContext,
  readExternalContextFromFile,
  renderExternalContextMarkdown,
} from "../../utils/external_context.ts"
import {
  buildWriteApplyOperationFromReceipt,
  buildWritePreviewOperation,
  withWriteOperationContract,
} from "../../utils/write_operation.ts"
import { buildIssueCreateDryRunPayload } from "./issue-dry-run-payload.ts"
import { buildIssueWritePayload } from "./issue-write-payload.ts"
import { maybeHandleIssueDescriptionParseError } from "./issue-description-parse.ts"

type IssueLabel = { id: string; name: string; color: string }

type AdditionalField = {
  key: string
  label: string
  handler: (
    teamKey: string,
    teamId: string,
    preloaded?: {
      states?: WorkflowState[]
      labels?: IssueLabel[]
    },
  ) => Promise<string | number | string[] | undefined>
}

const ADDITIONAL_FIELDS: AdditionalField[] = [
  {
    key: "workflow_state",
    label: "Workflow state",
    handler: async (
      teamKey: string,
      _teamId: string,
      preloaded?: {
        states?: WorkflowState[]
        labels?: IssueLabel[]
      },
    ) => {
      const states = preloaded?.states ?? await getWorkflowStates(teamKey)
      if (states.length === 0) return undefined

      const defaultState = states.find((s) => s.type === "unstarted") ||
        states[0]
      return await Select.prompt({
        message: "Which workflow state should this issue be in?",
        options: states.map((state) => ({
          name: `${state.name} (${state.type})`,
          value: state.id,
        })),
        default: defaultState.id,
      })
    },
  },
  {
    key: "assignee",
    label: "Assignee",
    handler: async () => {
      const assignToSelf = await Select.prompt({
        message: "Assign this issue to yourself?",
        options: [
          { name: "No", value: false },
          { name: "Yes", value: true },
        ],
        default: false,
      })
      return assignToSelf ? await lookupUserId("self") : undefined
    },
  },
  {
    key: "priority",
    label: "Priority",
    handler: async () => {
      return await Select.prompt({
        message: "What priority should this issue have?",
        options: [
          { name: `${getPriorityDisplay(0)} No priority`, value: 0 },
          { name: `${getPriorityDisplay(1)} Urgent`, value: 1 },
          { name: `${getPriorityDisplay(2)} High`, value: 2 },
          { name: `${getPriorityDisplay(3)} Medium`, value: 3 },
          { name: `${getPriorityDisplay(4)} Low`, value: 4 },
        ],
        default: 0,
      })
    },
  },
  {
    key: "labels",
    label: "Labels",
    handler: async (
      teamKey: string,
      _teamId: string,
      preloaded?: {
        states?: WorkflowState[]
        labels?: IssueLabel[]
      },
    ) => {
      const labels = preloaded?.labels ?? await getLabelsForTeam(teamKey)
      if (labels.length === 0) return []

      return await Checkbox.prompt({
        message: "Select labels (use space to select, enter to confirm)",
        search: true,
        searchLabel: "Search labels",
        options: labels.map((label) => ({
          name: label.name,
          value: label.id,
        })),
      })
    },
  },
  {
    key: "estimate",
    label: "Estimate",
    handler: async () => {
      const estimate = await Input.prompt({
        message: "Estimate (leave blank for none)",
        default: "",
      })
      const parsed = parseInt(estimate)
      return isNaN(parsed) ? undefined : parsed
    },
  },
]

async function promptAdditionalFields(
  teamKey: string,
  teamId: string,
  states: WorkflowState[],
  labels: IssueLabel[],
  autoAssignToSelf: boolean,
): Promise<{
  assigneeId?: string
  priority?: number
  estimate?: number
  labelIds: string[]
  stateId?: string
}> {
  // Build options that display defaults in parentheses for workflow state and assignee
  let defaultStateName: string | null = null
  if (states.length > 0) {
    const defaultState = states.find((s) => s.type === "unstarted") ||
      states[0]
    defaultStateName = defaultState.name
  }
  const additionalFieldOptions = ADDITIONAL_FIELDS.map((field) => {
    let name = field.label
    if (field.key === "workflow_state" && defaultStateName) {
      name = `${field.label} (${defaultStateName})`
    } else if (field.key === "assignee") {
      name = `${field.label} (${autoAssignToSelf ? "self" : "unassigned"})`
    }
    return { name, value: field.key }
  })
  const selectedFields = await Checkbox.prompt({
    message: "Select additional fields to configure",
    options: additionalFieldOptions,
  })

  // Initialize default values
  let assigneeId: string | undefined
  let priority: number | undefined
  let estimate: number | undefined
  let labelIds: string[] = []
  let stateId: string | undefined

  // Set assignee default based on user settings
  if (autoAssignToSelf) {
    assigneeId = await lookupUserId("self")
  }

  // Process selected fields
  for (const fieldKey of selectedFields) {
    const field = ADDITIONAL_FIELDS.find((f) => f.key === fieldKey)
    if (field) {
      const value = await field.handler(teamKey, teamId, {
        states,
        labels,
      })

      switch (fieldKey) {
        case "workflow_state":
          stateId = value as string | undefined
          break
        case "assignee":
          assigneeId = value as string | undefined
          break
        case "priority":
          priority = value === 0 ? undefined : (value as number)
          break
        case "labels":
          labelIds = (value as string[]) || []
          break
        case "estimate":
          estimate = value as number | undefined
          break
      }
    }
  }

  return {
    assigneeId,
    priority,
    estimate,
    labelIds,
    stateId,
  }
}

async function promptInteractiveIssueCreation(
  parentId?: string,
  parentData?: {
    title: string
    identifier: string
    projectId: string | null
  } | null,
): Promise<{
  title: string
  teamId: string
  assigneeId?: string
  priority?: number
  estimate?: number
  labelIds: string[]
  description?: string
  stateId?: string
  start: boolean
  parentId?: string
  projectId?: string | null
}> {
  // Start user settings and team resolution in background while asking for title
  const userSettingsPromise = (async () => {
    const client = getGraphQLClient()
    const userSettingsQuery = gql(`
      query GetUserSettings {
        userSettings {
          autoAssignToSelf
        }
      }
    `)
    const result = await client.request(userSettingsQuery)
    return result.userSettings.autoAssignToSelf
  })()

  const teamResolutionPromise = (async () => {
    const defaultTeamKey = getTeamKey()
    if (defaultTeamKey) {
      const teamId = await getTeamIdByKey(defaultTeamKey)
      if (teamId) {
        return {
          teamId: teamId,
          teamKey: defaultTeamKey,
          needsTeamSelection: false,
        }
      }
    }
    return {
      teamId: null,
      teamKey: null,
      needsTeamSelection: true,
    }
  })()

  // If we have a parent issue, display its title
  if (parentData) {
    const parentTitle = `${parentData.identifier}: ${parentData.title}`
    console.log(`Creating sub-issue for: ${parentTitle}`)
    console.log()
  }

  const title = await Input.prompt({
    message: "What's the title of your issue?",
    minLength: 1,
  })

  // Await team resolution and user settings
  const teamResult = await teamResolutionPromise
  const autoAssignToSelf = await userSettingsPromise
  let teamId: string
  let teamKey: string

  if (teamResult.needsTeamSelection) {
    // Need to prompt for team selection
    const teams = await getAllTeams()

    const selectedTeamId = await Select.prompt({
      message: "Which team should this issue belong to?",
      search: true,
      searchLabel: "Search teams",
      options: teams.map((team) => ({
        name: `${team.name} (${team.key})`,
        value: team.id,
      })),
    })

    const team = teams.find((t) => t.id === selectedTeamId)

    if (!team) {
      throw new NotFoundError("Team", selectedTeamId)
    }

    teamId = team.id
    teamKey = team.key
  } else {
    // Team was resolved in background
    teamId = teamResult.teamId!
    teamKey = teamResult.teamKey!
  }

  // Preload team-scoped data (do not await yet)
  const workflowStatesPromise = getWorkflowStates(teamKey)
  const labelsPromise = getLabelsForTeam(teamKey)

  // Description prompt
  const editorName = await getEditor()
  const editorDisplayName = editorName ? editorName.split("/").pop() : null
  const promptMessage = editorDisplayName
    ? `Description [(e) to launch ${editorDisplayName}]`
    : "Description"

  const description = await Input.prompt({
    message: promptMessage,
    default: "",
  })

  let finalDescription: string | undefined
  if (description === "e" && editorDisplayName) {
    console.log(`Opening ${editorDisplayName}...`)
    finalDescription = await openEditor()
    if (finalDescription && finalDescription.length > 0) {
      console.log(
        `Description entered (${finalDescription.length} characters)`,
      )
    } else {
      console.log("No description entered")
      finalDescription = undefined
    }
  } else if (description === "e" && !editorDisplayName) {
    console.error(
      "No editor found. Please set EDITOR environment variable or configure git editor with: git config --global core.editor <editor>",
    )
    finalDescription = undefined
  } else if (description.trim().length > 0) {
    finalDescription = description.trim()
  }

  // Now await the preloaded data and resolve default state
  const states = await workflowStatesPromise
  const labels = await labelsPromise
  let defaultState: WorkflowState | undefined
  if (states.length > 0) {
    defaultState = states.find((s) => s.type === "unstarted") || states[0]
  }

  // What's next? prompt
  const nextAction = await Select.prompt({
    message: "What's next?",
    options: [
      { name: "Submit issue", value: "submit" },
      { name: "Add more fields", value: "more_fields" },
    ],
    default: "submit",
  })

  // Initialize default values for additional fields
  let assigneeId: string | undefined
  let priority: number | undefined
  let estimate: number | undefined
  let labelIds: string[] = []
  let stateId: string | undefined

  // Set assignee default based on user settings
  if (autoAssignToSelf) {
    assigneeId = await lookupUserId("self")
  }

  // Set default state (resolved earlier)
  if (defaultState) {
    stateId = defaultState.id
  }

  if (nextAction === "more_fields") {
    const additionalFieldsResult = await promptAdditionalFields(
      teamKey,
      teamId,
      states,
      labels,
      autoAssignToSelf,
    )

    // Override defaults with user selections
    assigneeId = additionalFieldsResult.assigneeId
    priority = additionalFieldsResult.priority
    estimate = additionalFieldsResult.estimate
    labelIds = additionalFieldsResult.labelIds
    stateId = additionalFieldsResult.stateId
  }

  // Ask about starting work (always show this)
  const start = await Select.prompt({
    message:
      "Start working on this issue now? (creates branch and updates status)",
    options: [
      { name: "No", value: false },
      { name: "Yes", value: true },
    ],
    default: false,
  })

  return {
    title,
    teamId,
    assigneeId,
    priority,
    estimate,
    labelIds,
    description: finalDescription,
    stateId,
    start,
    parentId,
    projectId: parentData?.projectId || null,
  }
}

export const createCommand = new Command()
  .name("create")
  .description("Create a linear issue")
  .option(
    "--start",
    "Start the issue after creation",
  )
  .option(
    "-a, --assignee <assignee:string>",
    "Assign the issue to 'self' or someone (by username or name)",
  )
  .option(
    "--due-date <dueDate:string>",
    "Due date of the issue",
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
    "--description-file <path:string>",
    "Read description from a file (preferred for markdown content)",
  )
  .option(
    "--context-file <path:string>",
    "Read a normalized external context JSON envelope from a file.",
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
  .option("-j, --json", "Force machine-readable JSON output")
  .option("--text", "Output human-readable text")
  .option("--dry-run", "Preview the created issue without creating it")
  .option(
    "--timeout-ms <timeoutMs:number>",
    "Timeout for write confirmation in milliseconds",
  )
  .option(
    "--no-pager",
    "Accepted for compatibility; issue create does not use a pager",
  )
  .option(
    "--no-use-default-template",
    "Do not use default template for the issue",
  )
  .option("-i, --interactive", "Enable interactive prompts and editor flow")
  .option(
    "--no-interactive",
    "Accepted for compatibility; issue create is non-interactive by default",
  )
  .option("-t, --title <title:string>", "Title of the issue")
  .example(
    "Create an issue as JSON",
    'linear issue create --title "Fix auth expiry bug" --team ENG',
  )
  .example(
    "Create an issue with a piped description",
    'cat description.md | linear issue create --title "Fix auth expiry bug" --team ENG',
  )
  .example(
    "Create an issue from a normalized source context file",
    "linear issue create --team ENG --context-file slack-thread.json --dry-run --json",
  )
  .example(
    "Create an issue with human-readable output",
    'linear issue create --title "Fix auth expiry bug" --team ENG --text',
  )
  .example(
    "Preview issue creation",
    'linear issue create --title "Fix auth expiry bug" --team ENG --state started --dry-run',
  )
  .error((error, cmd) => {
    if (
      maybeHandleIssueDescriptionParseError(
        error,
        cmd,
        "Failed to create issue",
      )
    ) {
      return
    }
    handleAutomationContractParseError(error, cmd, "Failed to create issue")
  })
  .action(
    async (
      {
        start,
        assignee,
        dueDate,
        useDefaultTemplate,
        parent: parentIdentifier,
        priority,
        estimate,
        description,
        descriptionFile,
        contextFile,
        label: labels,
        team,
        project,
        state,
        milestone,
        cycle,
        interactive,
        title,
        json: jsonFlag,
        text,
        dryRun,
        timeoutMs,
      },
    ) => {
      const json = resolveJsonOutputMode("linear issue create", {
        json: jsonFlag,
        text,
      })
      try {
        const writeTimeoutMs = resolveWriteTimeoutMs(timeoutMs)
        const useInteractive = interactive === true && !json && !dryRun
        if (useInteractive) {
          ensureInteractiveInputAvailable(
            { interactive },
            "Interactive issue creation requested",
          )
        }

        // Validate that description and descriptionFile are not both provided
        if (description && descriptionFile) {
          throw new ValidationError(
            "Cannot specify both --description and --description-file",
          )
        }
        if (contextFile != null && descriptionFile != null) {
          throw new ValidationError(
            "Cannot specify both --context-file and --description-file",
            {
              suggestion:
                "Use --context-file to derive the description from normalized source context, or --description-file to provide explicit markdown content.",
            },
          )
        }
        if (json && start && !dryRun) {
          throw new ValidationError(
            "Cannot use machine-readable output with --start",
            {
              suggestion:
                "Use --dry-run for machine-readable previews, or pass --text --start when you want to start work immediately.",
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
        const externalContext = contextFile == null
          ? null
          : await readExternalContextFromFile(contextFile)
        if (externalContext != null) {
          if (finalDescription != null) {
            throw new ValidationError(
              "Cannot combine --context-file with explicit description input",
              {
                suggestion:
                  "Use only --context-file, or remove it and pass --description, --description-file, or stdin content explicitly.",
              },
            )
          }
          finalDescription = renderExternalContextMarkdown(externalContext)
        }
        const sourceContext = externalContext == null
          ? null
          : buildExternalContextPayload(externalContext, "description")

        // If no flags are provided (or only parent is provided), interactive mode
        // must be explicitly requested.
        const noFlagsProvided = !title && !assignee && !dueDate &&
          priority === undefined && estimate === undefined &&
          !finalDescription &&
          (!labels || labels.length === 0) &&
          !team && !project && !state && !milestone && !cycle && !start

        if (noFlagsProvided && useInteractive) {
          // Convert parent identifier if provided and fetch parent data
          let parentId: string | undefined
          let parentData: {
            title: string
            identifier: string
            projectId: string | null
          } | null = null
          if (parentIdentifier) {
            const parentIdentifierResolved = await getIssueIdentifier(
              parentIdentifier,
            )
            if (!parentIdentifierResolved) {
              throw new ValidationError(
                `Could not resolve parent issue identifier: ${parentIdentifier}`,
              )
            }
            parentId = await getIssueId(parentIdentifierResolved)
            if (!parentId) {
              throw new NotFoundError("Parent issue", parentIdentifierResolved)
            }

            // Fetch parent issue data including project
            parentData = await fetchParentIssueData(parentId)
          }

          const interactiveData = await promptInteractiveIssueCreation(
            parentId,
            parentData,
          )

          console.log(`Creating issue...`)
          console.log()

          const createIssueMutation = gql(`
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

          const client = getGraphQLClient()
          const data = await withSpinner(
            () =>
              withWriteTimeout(
                (signal) =>
                  client.request({
                    document: createIssueMutation,
                    variables: {
                      input: {
                        title: interactiveData.title,
                        assigneeId: interactiveData.assigneeId,
                        dueDate: undefined,
                        parentId: interactiveData.parentId,
                        priority: interactiveData.priority,
                        estimate: interactiveData.estimate,
                        labelIds: interactiveData.labelIds,
                        teamId: interactiveData.teamId,
                        projectId: interactiveData.projectId,
                        stateId: interactiveData.stateId,
                        useDefaultTemplate,
                        description: interactiveData.description,
                      },
                    },
                    signal,
                  }),
                {
                  operation: "issue creation",
                  timeoutMs: writeTimeoutMs,
                  suggestion: buildWriteTimeoutSuggestion(),
                },
              ),
            { enabled: true },
          )

          if (!data.issueCreate.success) {
            throw new CliError("Issue creation failed")
          }
          const issue = data.issueCreate.issue
          if (!issue) {
            throw new CliError("Issue creation failed - no issue returned")
          }
          const issueId = issue.id
          console.log(
            `✓ Created issue ${issue.identifier}: ${interactiveData.title}`,
          )
          console.log(issue.url)

          if (interactiveData.start) {
            const teamKey = issue.team.key
            const teamIdForStartWork = await getTeamIdByKey(teamKey)
            if (teamIdForStartWork) {
              await startWorkOnIssue(issueId, teamIdForStartWork)
            }
          }
          return
        }

        // Fallback to flag-based mode
        if (!title) {
          const derivedTitle = externalContext == null
            ? null
            : deriveTitleFromExternalContext(externalContext)
          if (derivedTitle != null) {
            title = derivedTitle
          }
        }

        if (!title) {
          throw new ValidationError(
            "Title is required unless --profile human-debug --interactive is used",
            {
              suggestion: json
                ? "Use --title or provide title-bearing --context-file input when requesting --json output."
                : "Use --title, provide title-bearing --context-file input, or pass --profile human-debug --interactive to create the issue with prompts.",
            },
          )
        }

        team = (team == null) ? getTeamKey() : team.toUpperCase()
        if (!team) {
          throw new ValidationError("Could not determine team key")
        }

        // For functions that need actual team IDs (like createIssue), get the ID
        let teamId = await getTeamIdByKey(team)
        if (useInteractive && !teamId) {
          const teamIds = await searchTeamsByKeySubstring(team)
          teamId = await selectOption("Team", team, teamIds)
        }
        if (!teamId) {
          throw new NotFoundError("Team", team)
        }
        if (start && assignee === undefined) {
          assignee = "self"
        }
        if (start && assignee !== undefined && assignee !== "self") {
          throw new ValidationError(
            "Cannot use --start and a non-self --assignee",
          )
        }
        let stateId: string | undefined
        if (state) {
          const workflowState = await getWorkflowStateByNameOrType(
            team,
            state,
          )
          if (!workflowState) {
            throw new NotFoundError(
              "Workflow state",
              `'${state}' for team ${team}`,
            )
          }
          stateId = workflowState.id
        }

        let assigneeId = undefined

        if (assignee) {
          assigneeId = await lookupUserId(assignee)
          if (assigneeId == null) {
            throw new NotFoundError("User", assignee)
          }
        }

        const labelIds = []
        if (labels != null && labels.length > 0) {
          // sequential in case of questions
          for (const label of labels) {
            let labelId = await getIssueLabelIdByNameForTeam(label, team)
            if (!labelId && useInteractive) {
              const labelIds = await getIssueLabelOptionsByNameForTeam(
                label,
                team,
              )
              labelId = await selectOption("Issue label", label, labelIds)
            }
            if (!labelId) {
              throw new NotFoundError("Issue label", label)
            }
            labelIds.push(labelId)
          }
        }
        let projectId: string | undefined = undefined
        // Use provided project, or fall back to default_project from config
        const effectiveProject = project ?? getOption("default_project")
        if (effectiveProject !== undefined) {
          projectId = await getProjectIdByName(effectiveProject)
          if (projectId === undefined && useInteractive) {
            const projectIds = await getProjectOptionsByName(effectiveProject)
            projectId = await selectOption(
              "Project",
              effectiveProject,
              projectIds,
            )
          }
          if (projectId === undefined) {
            throw new NotFoundError("Project", effectiveProject)
          }
        }

        let projectMilestoneId: string | undefined
        if (milestone != null) {
          if (projectId == null) {
            throw new ValidationError(
              "--milestone requires --project to be set",
              {
                suggestion:
                  "Use --project to specify which project the milestone belongs to.",
              },
            )
          }
          projectMilestoneId = await getMilestoneIdByName(
            milestone,
            projectId,
          )
        }

        let cycleId: string | undefined
        if (cycle != null) {
          cycleId = await getCycleIdByNameOrNumber(cycle, teamId)
        }

        // Date validation done at graphql level

        // Convert parent identifier if provided and fetch parent data
        let parentId: string | undefined
        let parentData: {
          title: string
          identifier: string
          projectId: string | null
        } | null = null
        if (parentIdentifier) {
          const parentIdentifierResolved = await getIssueIdentifier(
            parentIdentifier,
          )
          if (!parentIdentifierResolved) {
            throw new ValidationError(
              `Could not resolve parent issue identifier: ${parentIdentifier}`,
            )
          }
          parentId = await getIssueId(parentIdentifierResolved)
          if (!parentId) {
            throw new NotFoundError("Parent issue", parentIdentifierResolved)
          }

          // Fetch parent issue data including project
          parentData = await fetchParentIssueData(parentId)
        }

        const input = {
          title,
          assigneeId,
          dueDate,
          parentId,
          priority,
          estimate,
          labelIds,
          teamId: teamId,
          projectId: projectId || parentData?.projectId,
          projectMilestoneId,
          cycleId,
          stateId,
          useDefaultTemplate,
          description: finalDescription,
        }
        const createPreviewPayload = buildIssueCreateDryRunPayload({
          input,
          team: { id: teamId, key: team },
          project: {
            id: (projectId || parentData?.projectId) ?? null,
            nameOrSlug: effectiveProject ?? null,
          },
          parent: parentData == null ? null : {
            id: parentId!,
            identifier: parentData.identifier,
            title: parentData.title,
          },
          start: start === true,
          sourceContext: sourceContext ?? undefined,
        })
        if (dryRun) {
          const summary = `Would create issue in ${team}`
          emitDryRunOutput({
            json,
            summary,
            data: createPreviewPayload,
            operation: buildWritePreviewOperation({
              command: "issue.create",
              resource: "issue",
              action: "create",
              summary,
              refs: {
                teamKey: team,
                project: effectiveProject ?? null,
                parentIssueIdentifier: parentData?.identifier ?? null,
                sourceSystem: sourceContext?.source.system ?? null,
                sourceRef: sourceContext?.source.ref ?? null,
              },
              changes: [
                ...Object.keys(createPreviewPayload.input),
                ...(start ? ["start"] : []),
              ],
            }),
            lines: [
              `Title: ${title}`,
              `Team: ${team}`,
              ...(start ? ["Start work after creation: yes"] : []),
            ],
          })
          return
        }
        if (!json) {
          console.log(`Creating issue in ${team}`)
          console.log()
        }

        const createIssueMutation = gql(`
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

        const client = getGraphQLClient()
        const data = await withSpinner(
          () =>
            withWriteTimeout(
              (signal) =>
                client.request({
                  document: createIssueMutation,
                  variables: { input },
                  signal,
                }),
              {
                operation: "issue creation",
                timeoutMs: writeTimeoutMs,
                suggestion: buildWriteTimeoutSuggestion(),
              },
            ),
          { enabled: !json },
        )
        if (!data.issueCreate.success) {
          throw new CliError("Issue creation failed")
        }
        const issue = data.issueCreate.issue
        if (!issue) {
          throw new CliError("Issue creation failed - no issue returned")
        }
        const issueId = issue.id
        if (json) {
          const issuePayload = buildIssueWritePayload(issue)
          const issuePayloadWithContext = sourceContext == null
            ? issuePayload
            : {
              ...issuePayload,
              sourceContext,
            }
          const receipt = buildOperationReceipt({
            operationId: "issue.create",
            resource: "issue",
            action: "create",
            resolvedRefs: {
              issueIdentifier: issue.identifier,
              teamKey: issue.team.key,
              assignee: issuePayload.assignee?.name ?? null,
              parentIssueIdentifier: issuePayload.parent?.identifier ?? null,
              state: issuePayload.state?.name ?? null,
              sourceSystem: sourceContext?.source.system ?? null,
              sourceRef: sourceContext?.source.ref ?? null,
            },
            appliedChanges: [
              "title",
              ...(finalDescription != null ? ["description"] : []),
              ...(issuePayload.assignee != null ? ["assignee"] : []),
              ...(issuePayload.dueDate != null ? ["dueDate"] : []),
              ...(issuePayload.parent != null ? ["parent"] : []),
              ...(priority != null ? ["priority"] : []),
              ...(estimate != null ? ["estimate"] : []),
              ...(labelIds.length > 0 ? ["labels"] : []),
              ...((projectId || parentData?.projectId) != null
                ? ["project"]
                : []),
              ...(projectMilestoneId != null ? ["milestone"] : []),
              ...(cycleId != null ? ["cycle"] : []),
              ...(issuePayload.state != null ? ["state"] : []),
            ],
            nextSafeAction: "read_before_retry",
          })
          console.log(JSON.stringify(
            withWriteOperationContract(
              withOperationReceipt(issuePayloadWithContext, receipt),
              buildWriteApplyOperationFromReceipt(
                `Created issue ${issue.identifier}`,
                receipt,
              ),
            ),
            null,
            2,
          ))
          return
        }

        console.log(issue.url)

        if (start) {
          await startWorkOnIssue(issueId, issue.team.key)
        }
      } catch (error) {
        handleAutomationCommandError(error, "Failed to create issue", json)
      }
    },
  )
