export type AutomationContractVersion = "v1" | "v2" | "v3" | "v4"
export type DryRunContractVersion = "v1"
export type StdinPolicyVersion = "v1"
export type CapabilitiesSchemaVersion = "v1" | "v2"

export type CapabilityStdinMode = "none" | "implicit_text" | "explicit_bulk"
export type CapabilityInputMode = "flags" | "stdin" | "file"
export type CapabilitySchemaCoverage = "curated_primary_inputs"
export type CapabilityValueType =
  | "boolean"
  | "string"
  | "integer"
  | "path"
  | "json_file"
  | "issue_ref"
  | "team_key"
  | "state_ref"
  | "cycle_ref"
  | "project_ref"
  | "milestone_ref"
  | "document_id"
  | "webhook_id"
  | "notification_id"
  | "user_ref"
  | "workflow_state_id"
  | "label_ref"
  | "relation_type"
  | "url"

export type CapabilityArgumentSchema = {
  name: string
  required: boolean
  valueType: CapabilityValueType
  description: string
}

export type CapabilityFlagSchema = {
  name: string
  short: string | null
  required: boolean
  valueType: CapabilityValueType
  description: string
}

export type CapabilityCommandSchema = {
  coverage: CapabilitySchemaCoverage
  arguments: CapabilityArgumentSchema[]
  flags: CapabilityFlagSchema[]
  inputModes: CapabilityInputMode[]
}

export type CapabilityOutputCategory =
  | "automation_contract"
  | "curated_json"
  | "json_default"
  | "terminal_only"

export type CapabilityOutputShape = "object" | "array" | "unknown"
export type CapabilityExitCodeMeaning =
  | "generic_failure"
  | "auth_error"
  | "plan_limit"
  | "timeout_error"

export type CapabilityExitCode = {
  code: number
  meaning: CapabilityExitCodeMeaning
}

export type CapabilityOutputSemantics = {
  success: {
    category: CapabilityOutputCategory
    contractTarget: string | null
    shape: CapabilityOutputShape
    exitCode: 0
  }
  preview: {
    supported: boolean
    contractTarget: string | null
    shape: CapabilityOutputShape | null
    exitCode: 0 | null
  }
  failure: {
    jsonWhenRequested: boolean
    parseErrorsJsonWhenRequested: boolean
    exitCodes: CapabilityExitCode[]
  }
}

export type CapabilityIdempotencyCategory =
  | "read_only"
  | "retry_safe_update"
  | "retry_safe_no_op"
  | "non_idempotent"
  | "resumable_batch"
  | "conditional"
  | "destructive"

export type CapabilityCommand = {
  path: string
  summary: string
  json: {
    supported: boolean
    contractVersion: AutomationContractVersion | null
  }
  dryRun: {
    supported: boolean
    contractVersion: DryRunContractVersion | null
  }
  stdin: {
    mode: CapabilityStdinMode
  }
  confirmationBypass: "--yes" | null
  idempotency: {
    category: CapabilityIdempotencyCategory
    notes: string | null
  }
  schema: CapabilityCommandSchema
  output: CapabilityOutputSemantics
  notes: string | null
}

type CapabilityRegistryEntry = Omit<CapabilityCommand, "schema" | "output">

export type CapabilitiesPayload = {
  schemaVersion: CapabilitiesSchemaVersion
  cli: {
    name: "linear-cli"
    binary: "linear"
    version: string
  }
  contractVersions: {
    automation: {
      latest: AutomationContractVersion
      supported: AutomationContractVersion[]
    }
    dryRunPreview: {
      latest: DryRunContractVersion
      supported: DryRunContractVersion[]
    }
    stdinPolicy: {
      latest: StdinPolicyVersion
      supported: StdinPolicyVersion[]
    }
  }
  automationTier: {
    latestVersion: AutomationContractVersion
    byVersion: Record<AutomationContractVersion, string[]>
    allCommands: string[]
  }
  commands: CapabilityCommand[]
}

const AUTOMATION_CONTRACT_VERSIONS = ["v1", "v2", "v3", "v4"] as const
const DRY_RUN_CONTRACT_VERSIONS = ["v1"] as const
const STDIN_POLICY_VERSIONS = ["v1"] as const

function jsonContract(
  contractVersion: AutomationContractVersion | null,
): CapabilityRegistryEntry["json"] {
  return {
    supported: contractVersion != null,
    contractVersion,
  }
}

function jsonOptional(): CapabilityRegistryEntry["json"] {
  return {
    supported: true,
    contractVersion: null,
  }
}

function noJson(): CapabilityRegistryEntry["json"] {
  return {
    supported: false,
    contractVersion: null,
  }
}

function dryRunContract(
  contractVersion: DryRunContractVersion | null,
): CapabilityRegistryEntry["dryRun"] {
  return {
    supported: contractVersion != null,
    contractVersion,
  }
}

function stdin(mode: CapabilityStdinMode): CapabilityRegistryEntry["stdin"] {
  return { mode }
}

function idempotency(
  category: CapabilityIdempotencyCategory,
  notes: string | null = null,
): CapabilityCommand["idempotency"] {
  return { category, notes }
}

function argument(
  name: string,
  valueType: CapabilityValueType,
  description: string,
  required = true,
): CapabilityArgumentSchema {
  return {
    name,
    required,
    valueType,
    description,
  }
}

function flag(
  name: string,
  short: string | null,
  valueType: CapabilityValueType,
  description: string,
  required = false,
): CapabilityFlagSchema {
  return {
    name,
    short,
    required,
    valueType,
    description,
  }
}

const JSON_FAILURE_COMMANDS = new Set<string>([
  "linear capabilities",
  "linear cycle current",
  "linear cycle list",
  "linear cycle next",
  "linear cycle view",
  "linear document list",
  "linear document view",
  "linear issue children",
  "linear issue comment add",
  "linear issue create",
  "linear issue create-batch",
  "linear issue list",
  "linear issue parent",
  "linear issue relation add",
  "linear issue relation delete",
  "linear issue relation list",
  "linear issue update",
  "linear issue view",
  "linear label list",
  "linear milestone list",
  "linear milestone view",
  "linear notification count",
  "linear notification list",
  "linear project list",
  "linear project view",
  "linear project-label list",
  "linear team list",
  "linear team members",
  "linear team view",
  "linear user list",
  "linear user view",
  "linear webhook list",
  "linear webhook view",
  "linear workflow-state list",
  "linear workflow-state view",
])

const WRITE_TIMEOUT_COMMANDS = new Set<string>([
  "linear issue comment add",
  "linear issue comment update",
  "linear issue create",
  "linear issue create-batch",
  "linear issue relation add",
  "linear issue relation delete",
  "linear issue update",
])

const PLAN_LIMIT_COMMANDS = new Set<string>([
  "linear document create",
  "linear issue create",
  "linear issue create-batch",
  "linear milestone create",
  "linear project create",
  "linear webhook create",
])

const PRIMARY_ARGUMENTS: Record<string, CapabilityArgumentSchema[]> = {
  "linear document delete": [
    argument("documentIds", "document_id", "One or more document IDs.", false),
  ],
  "linear document view": [
    argument("document", "document_id", "Document ID."),
  ],
  "linear issue children": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
  ],
  "linear issue comment add": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
    argument(
      "body",
      "string",
      "Inline comment body. Omit to provide it with --body, --body-file, or stdin.",
      false,
    ),
  ],
  "linear issue comment update": [
    argument("comment", "string", "Comment ID."),
  ],
  "linear issue parent": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
  ],
  "linear issue relation add": [
    argument("issue", "issue_ref", "Source issue identifier or internal ID."),
    argument("relationType", "relation_type", "Relation type keyword."),
    argument(
      "relatedIssue",
      "issue_ref",
      "Related issue identifier or internal ID.",
    ),
  ],
  "linear issue relation delete": [
    argument("issue", "issue_ref", "Source issue identifier or internal ID."),
    argument("relationType", "relation_type", "Relation type keyword."),
    argument(
      "relatedIssue",
      "issue_ref",
      "Related issue identifier or internal ID.",
    ),
  ],
  "linear issue relation list": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
  ],
  "linear issue start": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
  ],
  "linear issue update": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
  ],
  "linear issue view": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier or internal ID. Defaults to the current issue.",
      false,
    ),
  ],
  "linear milestone view": [
    argument("milestone", "milestone_ref", "Milestone ID, slug, or name."),
  ],
  "linear notification archive": [
    argument("notification", "notification_id", "Notification ID."),
  ],
  "linear notification read": [
    argument("notification", "notification_id", "Notification ID."),
  ],
  "linear project delete": [
    argument("project", "project_ref", "Project ID or slug."),
  ],
  "linear project view": [
    argument("project", "project_ref", "Project ID or slug."),
  ],
  "linear team members": [
    argument(
      "team",
      "team_key",
      "Team key. Defaults to the configured current team.",
      false,
    ),
  ],
  "linear team view": [
    argument(
      "team",
      "team_key",
      "Team key. Defaults to the configured current team.",
      false,
    ),
  ],
  "linear user view": [
    argument("user", "user_ref", "User ID, email, or username."),
  ],
  "linear webhook delete": [
    argument("webhook", "webhook_id", "Webhook ID."),
  ],
  "linear webhook view": [
    argument("webhook", "webhook_id", "Webhook ID."),
  ],
  "linear workflow-state view": [
    argument("workflowState", "workflow_state_id", "Workflow state ID."),
  ],
  "linear cycle view": [
    argument("cycle", "cycle_ref", "Cycle number, ID, or reference."),
  ],
}

const FLAG_OVERRIDES: Record<string, CapabilityFlagSchema[]> = {
  "linear cycle current": [
    flag(
      "--team",
      null,
      "team_key",
      "Team key. Falls back to the configured current team.",
    ),
  ],
  "linear cycle list": [
    flag(
      "--team",
      null,
      "team_key",
      "Team key. Falls back to the configured current team.",
    ),
  ],
  "linear cycle next": [
    flag(
      "--team",
      null,
      "team_key",
      "Team key. Falls back to the configured current team.",
    ),
  ],
  "linear document list": [
    flag(
      "--issue",
      null,
      "issue_ref",
      "Filter documents attached to a specific issue.",
    ),
  ],
  "linear issue comment add": [
    flag("--body", null, "string", "Comment body as inline text."),
    flag("--body-file", null, "path", "Read the comment body from a file."),
  ],
  "linear issue comment update": [
    flag("--body", null, "string", "Replacement comment body as inline text."),
    flag("--body-file", null, "path", "Read the replacement body from a file."),
  ],
  "linear issue create": [
    flag("--title", "-t", "string", "Issue title.", true),
    flag("--team", null, "team_key", "Team key.", true),
    flag("--description", "-d", "string", "Issue description as inline text."),
    flag(
      "--description-file",
      null,
      "path",
      "Read the description from a file.",
    ),
    flag("--state", null, "state_ref", "Initial workflow state."),
  ],
  "linear issue create-batch": [
    flag(
      "--file",
      "-f",
      "json_file",
      "Path to the JSON batch description.",
      true,
    ),
  ],
  "linear issue list": [
    flag("--all", null, "boolean", "List all assignees and all states."),
    flag("--state", "-s", "state_ref", "Filter by workflow state."),
    flag("--query", null, "string", "Filter by search text."),
    flag(
      "--team",
      null,
      "team_key",
      "Resolve team-scoped filters and aliases.",
    ),
    flag(
      "--parent",
      null,
      "issue_ref",
      "Filter child issues of a parent issue.",
    ),
  ],
  "linear issue update": [
    flag("--state", null, "state_ref", "Target workflow state."),
    flag("--comment", null, "string", "Comment to append after the update."),
    flag("--description", "-d", "string", "Replacement description text."),
    flag(
      "--description-file",
      null,
      "path",
      "Read the replacement description from a file.",
    ),
  ],
  "linear issue view": [
    flag("--no-comments", null, "boolean", "Skip raw comments in JSON output."),
  ],
  "linear project list": [
    flag("--team", null, "team_key", "Filter by team key."),
  ],
}

const ARRAY_RESULT_COMMANDS = new Set<string>([
  "linear cycle list",
  "linear document list",
  "linear issue children",
  "linear issue list",
  "linear issue relation list",
  "linear label list",
  "linear milestone list",
  "linear notification list",
  "linear project list",
  "linear project-label list",
  "linear team list",
  "linear user list",
  "linear webhook list",
  "linear workflow-state list",
])

const COMMANDS: CapabilityRegistryEntry[] = [
  {
    path: "linear api",
    summary: "Run a raw GraphQL API query",
    json: noJson(),
    dryRun: dryRunContract(null),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes:
      "Outputs JSON by default and accepts stdin, but does not use a --json flag.",
  },
  {
    path: "linear capabilities",
    summary: "Describe the curated agent-facing command surface",
    json: jsonOptional(),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear cycle current",
    summary: "Show the current cycle for a team",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear cycle list",
    summary: "List cycles for a team",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear cycle next",
    summary: "Show the next cycle for a team",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear cycle view",
    summary: "View a cycle by number or ID",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear document create",
    summary: "Create a document",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear document delete",
    summary: "Delete one or more documents",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("explicit_bulk"),
    confirmationBypass: "--yes",
    idempotency: idempotency("destructive"),
    notes: null,
  },
  {
    path: "linear document list",
    summary: "List documents",
    json: jsonContract("v3"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear document update",
    summary: "Update a document",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
    notes: null,
  },
  {
    path: "linear document view",
    summary: "View a document",
    json: jsonContract("v3"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear issue children",
    summary: "List child issues",
    json: jsonContract("v1"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear issue comment add",
    summary: "Add an issue comment",
    json: jsonContract("v1"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear issue comment update",
    summary: "Update an existing comment",
    json: noJson(),
    dryRun: dryRunContract(null),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
    notes: null,
  },
  {
    path: "linear issue create",
    summary: "Create an issue",
    json: jsonContract("v1"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear issue create-batch",
    summary: "Create a parent issue and child issues from JSON",
    json: jsonContract("v1"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "resumable_batch",
      "Partial failures return createdIdentifiers and failedStep details.",
    ),
    notes: null,
  },
  {
    path: "linear issue list",
    summary: "List issues",
    json: jsonContract("v1"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear issue parent",
    summary: "Show an issue's parent",
    json: jsonContract("v1"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear issue relation add",
    summary: "Add an issue relation",
    json: jsonContract("v1"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "retry_safe_no_op",
      "Adding an existing relation succeeds with noOp: true.",
    ),
    notes: null,
  },
  {
    path: "linear issue relation delete",
    summary: "Delete an issue relation",
    json: jsonContract("v1"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "retry_safe_no_op",
      "Deleting a missing relation succeeds with noOp: true.",
    ),
    notes: null,
  },
  {
    path: "linear issue relation list",
    summary: "List issue relations",
    json: jsonContract("v1"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear issue start",
    summary: "Create or switch to an issue branch and mark it started",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "conditional",
      "The dry-run is safe to repeat; the live path mutates both Linear state and local VCS state.",
    ),
    notes: null,
  },
  {
    path: "linear issue update",
    summary: "Update an issue",
    json: jsonContract("v1"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("implicit_text"),
    confirmationBypass: null,
    idempotency: idempotency(
      "conditional",
      "Field-only updates are retry-safe; adding --comment makes the command non-idempotent.",
    ),
    notes: null,
  },
  {
    path: "linear issue view",
    summary: "View an issue",
    json: jsonContract("v1"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear label list",
    summary: "List issue labels",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear milestone create",
    summary: "Create a milestone",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear milestone delete",
    summary: "Delete a milestone",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: "--yes",
    idempotency: idempotency("destructive"),
    notes: null,
  },
  {
    path: "linear milestone list",
    summary: "List milestones",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear milestone update",
    summary: "Update a milestone",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
    notes: null,
  },
  {
    path: "linear milestone view",
    summary: "View a milestone",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear notification archive",
    summary: "Archive a notification",
    json: jsonOptional(),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "retry_safe_no_op",
      "Archiving an already-archived notification succeeds with noOp: true.",
    ),
    notes: null,
  },
  {
    path: "linear notification count",
    summary: "Count unread notifications",
    json: jsonContract("v3"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear notification list",
    summary: "List notifications",
    json: jsonContract("v3"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear notification read",
    summary: "Mark a notification as read",
    json: jsonOptional(),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "retry_safe_no_op",
      "Reading an already-read notification succeeds with noOp: true.",
    ),
    notes: null,
  },
  {
    path: "linear project create",
    summary: "Create a project",
    json: jsonOptional(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear project delete",
    summary: "Delete a project",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: "--yes",
    idempotency: idempotency("destructive"),
    notes: null,
  },
  {
    path: "linear project label add",
    summary: "Add a label to a project",
    json: jsonOptional(),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "retry_safe_no_op",
      "Adding an already-attached label succeeds with changed: false.",
    ),
    notes: null,
  },
  {
    path: "linear project label remove",
    summary: "Remove a label from a project",
    json: jsonOptional(),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency(
      "retry_safe_no_op",
      "Removing a missing label succeeds with changed: false.",
    ),
    notes: null,
  },
  {
    path: "linear project list",
    summary: "List projects",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear project update",
    summary: "Update a project",
    json: noJson(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
    notes: null,
  },
  {
    path: "linear project view",
    summary: "View a project",
    json: jsonContract("v2"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear project-label list",
    summary: "List project labels",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear team list",
    summary: "List teams",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear team members",
    summary: "List team members",
    json: jsonContract("v1"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear team view",
    summary: "View a team",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear user list",
    summary: "List users",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear user view",
    summary: "View a user",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear webhook create",
    summary: "Create a webhook",
    json: jsonOptional(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear webhook delete",
    summary: "Delete a webhook",
    json: jsonOptional(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: "--yes",
    idempotency: idempotency("destructive"),
    notes: null,
  },
  {
    path: "linear webhook list",
    summary: "List webhooks",
    json: jsonContract("v3"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear webhook update",
    summary: "Update a webhook",
    json: jsonOptional(),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
    notes: null,
  },
  {
    path: "linear webhook view",
    summary: "View a webhook",
    json: jsonContract("v3"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear workflow-state list",
    summary: "List workflow states",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear workflow-state view",
    summary: "View a workflow state",
    json: jsonContract("v4"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
]

const CAPABILITY_COMMANDS = [...COMMANDS].sort((a, b) =>
  a.path.localeCompare(b.path)
)

function uniqueFlags(flags: CapabilityFlagSchema[]): CapabilityFlagSchema[] {
  const seen = new Set<string>()
  const deduped: CapabilityFlagSchema[] = []

  for (const entry of flags) {
    if (seen.has(entry.name)) {
      continue
    }

    seen.add(entry.name)
    deduped.push(entry)
  }

  return deduped
}

function buildCommandSchema(
  command: CapabilityRegistryEntry,
): CapabilityCommandSchema {
  const flags = [
    ...(command.json.supported
      ? [flag("--json", "-j", "boolean", "Emit machine-readable JSON output.")]
      : []),
    ...(command.dryRun.supported
      ? [
        flag(
          "--dry-run",
          null,
          "boolean",
          "Preview the command without mutating Linear.",
        ),
      ]
      : []),
    ...(command.confirmationBypass != null
      ? [
        flag(
          command.confirmationBypass,
          null,
          "boolean",
          "Skip the confirmation prompt.",
        ),
      ]
      : []),
    ...(WRITE_TIMEOUT_COMMANDS.has(command.path)
      ? [
        flag(
          "--timeout-ms",
          null,
          "integer",
          "Override the write confirmation timeout in milliseconds.",
        ),
      ]
      : []),
    ...(FLAG_OVERRIDES[command.path] ?? []),
  ]

  const inputModes: CapabilityInputMode[] = ["flags"]
  if (command.stdin.mode !== "none") {
    inputModes.push("stdin")
  }
  if (
    flags.some((entry) =>
      entry.valueType === "path" || entry.valueType === "json_file"
    )
  ) {
    inputModes.push("file")
  }

  return {
    coverage: "curated_primary_inputs",
    arguments: PRIMARY_ARGUMENTS[command.path] ?? [],
    flags: uniqueFlags(flags),
    inputModes,
  }
}

function buildFailureExitCodes(
  command: CapabilityRegistryEntry,
): CapabilityExitCode[] {
  const exitCodes: CapabilityExitCode[] = [
    { code: 1, meaning: "generic_failure" },
  ]

  if (command.path !== "linear capabilities") {
    exitCodes.push({ code: 4, meaning: "auth_error" })
  }

  if (PLAN_LIMIT_COMMANDS.has(command.path)) {
    exitCodes.push({ code: 5, meaning: "plan_limit" })
  }

  if (WRITE_TIMEOUT_COMMANDS.has(command.path)) {
    exitCodes.push({ code: 6, meaning: "timeout_error" })
  }

  return exitCodes
}

function buildCommandOutput(
  command: CapabilityRegistryEntry,
): CapabilityOutputSemantics {
  const shape: CapabilityOutputShape = ARRAY_RESULT_COMMANDS.has(command.path)
    ? "array"
    : command.path === "linear api"
    ? "unknown"
    : "object"

  let category: CapabilityOutputCategory = "terminal_only"
  let contractTarget: string | null = null

  if (command.path === "linear api") {
    category = "json_default"
    contractTarget = "raw_graphql_response"
  } else if (command.path === "linear capabilities") {
    category = "curated_json"
    contractTarget = "capabilities_discovery:v2"
  } else if (command.json.contractVersion != null) {
    category = "automation_contract"
    contractTarget = `automation_contract:${command.json.contractVersion}`
  } else if (command.json.supported) {
    category = "curated_json"
  }

  return {
    success: {
      category,
      contractTarget,
      shape,
      exitCode: 0,
    },
    preview: {
      supported: command.dryRun.supported,
      contractTarget: command.dryRun.contractVersion == null
        ? null
        : `dry_run_preview:${command.dryRun.contractVersion}`,
      shape: command.dryRun.supported ? "object" : null,
      exitCode: command.dryRun.supported ? 0 : null,
    },
    failure: {
      jsonWhenRequested: JSON_FAILURE_COMMANDS.has(command.path),
      parseErrorsJsonWhenRequested: JSON_FAILURE_COMMANDS.has(command.path),
      exitCodes: buildFailureExitCodes(command),
    },
  }
}

function buildAutomationTier() {
  const byVersion = {
    v1: [] as string[],
    v2: [] as string[],
    v3: [] as string[],
    v4: [] as string[],
  }

  for (const command of CAPABILITY_COMMANDS) {
    const version = command.json.contractVersion
    if (version != null) {
      byVersion[version].push(command.path)
    }
  }

  return {
    latestVersion: "v4" as const,
    byVersion,
    allCommands: [
      ...byVersion.v1,
      ...byVersion.v2,
      ...byVersion.v3,
      ...byVersion.v4,
    ],
  }
}

export function buildCapabilitiesPayload(version: string): CapabilitiesPayload {
  return {
    schemaVersion: "v2",
    cli: {
      name: "linear-cli",
      binary: "linear",
      version,
    },
    contractVersions: {
      automation: {
        latest: "v4",
        supported: [...AUTOMATION_CONTRACT_VERSIONS],
      },
      dryRunPreview: {
        latest: "v1",
        supported: [...DRY_RUN_CONTRACT_VERSIONS],
      },
      stdinPolicy: {
        latest: "v1",
        supported: [...STDIN_POLICY_VERSIONS],
      },
    },
    automationTier: buildAutomationTier(),
    commands: CAPABILITY_COMMANDS.map((command) => ({
      ...command,
      json: { ...command.json },
      dryRun: { ...command.dryRun },
      stdin: { ...command.stdin },
      idempotency: { ...command.idempotency },
      schema: buildCommandSchema(command),
      output: buildCommandOutput(command),
    })),
  }
}
