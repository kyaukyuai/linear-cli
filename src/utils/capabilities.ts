export type AutomationContractVersion = "v1" | "v2" | "v3" | "v4" | "v5"
export type DryRunContractVersion = "v1"
export type StdinPolicyVersion = "v1"
export type CapabilitiesSchemaVersion = "v1" | "v2"
export type CapabilitiesCompatibilityVersion = CapabilitiesSchemaVersion

export type CapabilityStdinMode = "none" | "implicit_text" | "explicit_bulk"
export type CapabilityInputMode = "flags" | "stdin" | "file"
export type CapabilitySchemaCoverage = "curated_primary_inputs"
export type CapabilityInputReferenceSource = "argument" | "flag"
export type CapabilityLiteralValue = string | number | boolean
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

export type CapabilityAllowedValue = {
  value: string
  description: string | null
}

export type CapabilityArgumentSchema = {
  name: string
  required: boolean
  valueType: CapabilityValueType
  description: string
  allowedValues: CapabilityAllowedValue[] | null
}

export type CapabilityFlagSchema = {
  name: string
  short: string | null
  required: boolean
  valueType: CapabilityValueType
  description: string
  allowedValues: CapabilityAllowedValue[] | null
}

export type CapabilityInputReference = {
  source: CapabilityInputReferenceSource
  name: string
}

export type CapabilityInputDefault = CapabilityInputReference & {
  value: CapabilityLiteralValue | null
  description: string
}

export type CapabilityInputResolutionStrategy =
  | "current_issue_context"
  | "configured_team_context"
  | "env_or_internal_default"

export type CapabilityInputResolution = CapabilityInputReference & {
  strategy: CapabilityInputResolutionStrategy
  description: string
}

export type CapabilityConstraintKind = "conflicts_with" | "requires_all_of"

export type CapabilityConstraint = {
  source: CapabilityInputReference
  kind: CapabilityConstraintKind
  targets: CapabilityInputReference[]
  reason: string
}

export type CapabilityInputChannelTarget = {
  field: string
  viaFlags: string[]
}

export type CapabilityCommandExample = {
  description: string
  argv: string[]
}

export type CapabilityCommandSchema = {
  coverage: CapabilitySchemaCoverage
  arguments: CapabilityArgumentSchema[]
  flags: CapabilityFlagSchema[]
  inputModes: CapabilityInputMode[]
  requiredInputs: CapabilityInputReference[]
  optionalInputs: CapabilityInputReference[]
  defaults: CapabilityInputDefault[]
  resolutions: CapabilityInputResolution[]
  constraints: CapabilityConstraint[]
  stdinTargets: CapabilityInputChannelTarget[]
  fileTargets: CapabilityInputChannelTarget[]
  examples: CapabilityCommandExample[]
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

export type CapabilityOutputContractKind =
  | "automation_contract"
  | "dry_run_preview"
  | "capabilities_discovery"
  | "raw_graphql_response"

export type CapabilityOutputContract = {
  kind: CapabilityOutputContractKind
  version: string | null
}

export type CapabilityOutputSemantics = {
  success: {
    category: CapabilityOutputCategory
    contractTarget: string | null
    contract: CapabilityOutputContract | null
    shape: CapabilityOutputShape
    exitCode: 0
    topLevelFields: string[]
  }
  preview: {
    supported: boolean
    contractTarget: string | null
    contract: CapabilityOutputContract | null
    shape: CapabilityOutputShape | null
    exitCode: 0 | null
    topLevelFields: string[] | null
  }
  failure: {
    jsonWhenRequested: boolean
    parseErrorsJsonWhenRequested: boolean
    exitCodes: CapabilityExitCode[]
    topLevelFields: string[]
    errorFields: string[]
    detailFields: string[]
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

export type CapabilityWriteSemantics = {
  timeoutAware: boolean
  timeoutReconciliation: boolean
  mayReturnNoOp: boolean
  mayReturnPartialSuccess: boolean
}

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
  writeSemantics: CapabilityWriteSemantics
  schema: CapabilityCommandSchema
  output: CapabilityOutputSemantics
  notes: string | null
}

type CapabilityRegistryEntry = Omit<
  CapabilityCommand,
  "schema" | "output" | "writeSemantics"
>
export type CapabilityCommandV1 = CapabilityRegistryEntry

type CapabilitiesPayloadBase = {
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
}

export type CapabilitiesPayloadV1 = CapabilitiesPayloadBase & {
  schemaVersion: "v1"
  commands: CapabilityCommandV1[]
}

export type CapabilitiesPayloadV2 = CapabilitiesPayloadBase & {
  schemaVersion: "v2"
  compatibility: {
    defaultSchemaVersion: "v1"
    latestSchemaVersion: "v2"
    supportedSchemaVersions: CapabilitiesCompatibilityVersion[]
  }
  commands: CapabilityCommand[]
}

export type CapabilitiesPayload = CapabilitiesPayloadV1 | CapabilitiesPayloadV2

const AUTOMATION_CONTRACT_VERSIONS = ["v1", "v2", "v3", "v4", "v5"] as const
const DRY_RUN_CONTRACT_VERSIONS = ["v1"] as const
const STDIN_POLICY_VERSIONS = ["v1"] as const
const CAPABILITIES_COMPATIBILITY_VERSIONS = ["v1", "v2"] as const
const RELATION_TYPE_VALUES = [
  "blocks",
  "blocked-by",
  "related",
  "duplicate",
] as const
const INITIATIVE_STATUS_VALUES = [
  "active",
  "planned",
  "completed",
] as const

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
  allowedValues: CapabilityAllowedValue[] | null = null,
): CapabilityArgumentSchema {
  return {
    name,
    required,
    valueType,
    description,
    allowedValues,
  }
}

function flag(
  name: string,
  short: string | null,
  valueType: CapabilityValueType,
  description: string,
  required = false,
  allowedValues: CapabilityAllowedValue[] | null = null,
): CapabilityFlagSchema {
  return {
    name,
    short,
    required,
    valueType,
    description,
    allowedValues,
  }
}

function enumValues(values: readonly string[]): CapabilityAllowedValue[] {
  return values.map((value) => ({
    value,
    description: null,
  }))
}

function inputRef(
  source: CapabilityInputReferenceSource,
  name: string,
): CapabilityInputReference {
  return { source, name }
}

function inputDefault(
  source: CapabilityInputReferenceSource,
  name: string,
  description: string,
  value: CapabilityLiteralValue | null = null,
): CapabilityInputDefault {
  return { source, name, description, value }
}

function inputResolution(
  source: CapabilityInputReferenceSource,
  name: string,
  strategy: CapabilityInputResolutionStrategy,
  description: string,
): CapabilityInputResolution {
  return { source, name, strategy, description }
}

function constraint(
  source: CapabilityInputReference,
  kind: CapabilityConstraintKind,
  targets: CapabilityInputReference[],
  reason: string,
): CapabilityConstraint {
  return { source, kind, targets, reason }
}

function example(
  description: string,
  argv: string[],
): CapabilityCommandExample {
  return { description, argv }
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
  "linear initiative list",
  "linear initiative view",
  "linear initiative-update list",
  "linear label list",
  "linear milestone list",
  "linear milestone view",
  "linear notification count",
  "linear notification list",
  "linear project list",
  "linear project view",
  "linear project-update list",
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
  "linear notification archive",
  "linear notification read",
])

const PLAN_LIMIT_COMMANDS = new Set<string>([
  "linear document create",
  "linear issue create",
  "linear issue create-batch",
  "linear milestone create",
  "linear project create",
  "linear webhook create",
])

const PARTIAL_SUCCESS_COMMANDS = new Set<string>([
  "linear issue create-batch",
  "linear issue update",
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
    argument(
      "relationType",
      "relation_type",
      "Relation type keyword.",
      true,
      enumValues(RELATION_TYPE_VALUES),
    ),
    argument(
      "relatedIssue",
      "issue_ref",
      "Related issue identifier or internal ID.",
    ),
  ],
  "linear issue relation delete": [
    argument("issue", "issue_ref", "Source issue identifier or internal ID."),
    argument(
      "relationType",
      "relation_type",
      "Relation type keyword.",
      true,
      enumValues(RELATION_TYPE_VALUES),
    ),
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
  "linear initiative view": [
    argument("initiative", "string", "Initiative ID, slug, or name."),
  ],
  "linear initiative-update list": [
    argument("initiative", "string", "Initiative ID, slug, or name."),
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
  "linear project-update list": [
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
  "linear capabilities": [
    flag(
      "--compat",
      null,
      "string",
      "Select the machine-readable capabilities schema version.",
      false,
      enumValues(CAPABILITIES_COMPATIBILITY_VERSIONS),
    ),
  ],
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
  "linear document create": [
    flag("--title", "-t", "string", "Document title.", true),
    flag("--content", "-c", "string", "Document content as inline markdown."),
    flag("--content-file", "-f", "path", "Read document content from a file."),
    flag("--project", null, "project_ref", "Attach the document to a project."),
    flag("--issue", null, "issue_ref", "Attach the document to an issue."),
  ],
  "linear document delete": [
    flag(
      "--bulk",
      null,
      "document_id",
      "Delete multiple documents by slug or ID.",
    ),
    flag(
      "--bulk-file",
      null,
      "path",
      "Read document slugs or IDs from a file.",
    ),
    flag(
      "--bulk-stdin",
      null,
      "boolean",
      "Read document slugs or IDs from stdin.",
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
  "linear document update": [
    flag("--title", "-t", "string", "Replacement document title."),
    flag("--content", "-c", "string", "Replacement document content."),
    flag(
      "--content-file",
      "-f",
      "path",
      "Read replacement document content from a file.",
    ),
    flag("--icon", null, "string", "Replacement icon."),
    flag("--edit", "-e", "boolean", "Open the current content in an editor."),
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
    flag(
      "--all-states",
      null,
      "boolean",
      "Include every workflow state while keeping assignee selection unchanged.",
    ),
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
  "linear initiative list": [
    flag(
      "--status",
      "-s",
      "string",
      "Filter by initiative status.",
      false,
      enumValues(INITIATIVE_STATUS_VALUES),
    ),
    flag("--all-statuses", null, "boolean", "Include all initiative statuses."),
    flag("--owner", "-o", "user_ref", "Filter by owner username or email."),
    flag("--archived", null, "boolean", "Include archived initiatives."),
  ],
  "linear initiative-update list": [
    flag("--limit", null, "integer", "Limit returned initiative updates."),
  ],
  "linear project list": [
    flag("--team", null, "team_key", "Filter by team key."),
  ],
  "linear project-update list": [
    flag("--limit", null, "integer", "Limit returned project updates."),
  ],
}

const STDIN_TARGETS: Record<string, CapabilityInputChannelTarget[]> = {
  "linear api": [{ field: "query", viaFlags: [] }],
  "linear document create": [{ field: "content", viaFlags: [] }],
  "linear document delete": [{
    field: "documentIds",
    viaFlags: ["--bulk-stdin"],
  }],
  "linear document update": [{ field: "content", viaFlags: [] }],
  "linear issue comment add": [{ field: "body", viaFlags: [] }],
  "linear issue comment update": [{ field: "body", viaFlags: [] }],
  "linear issue create": [{ field: "description", viaFlags: [] }],
  "linear issue update": [{ field: "description", viaFlags: [] }],
}

const FILE_TARGETS: Record<string, CapabilityInputChannelTarget[]> = {
  "linear document create": [
    { field: "content", viaFlags: ["--content-file"] },
  ],
  "linear document delete": [
    { field: "documentIds", viaFlags: ["--bulk-file"] },
  ],
  "linear document update": [
    { field: "content", viaFlags: ["--content-file"] },
  ],
  "linear issue comment add": [
    { field: "body", viaFlags: ["--body-file"] },
  ],
  "linear issue comment update": [
    { field: "body", viaFlags: ["--body-file"] },
  ],
  "linear issue create": [
    { field: "description", viaFlags: ["--description-file"] },
  ],
  "linear issue create-batch": [
    { field: "batch", viaFlags: ["--file"] },
  ],
  "linear issue update": [
    { field: "description", viaFlags: ["--description-file"] },
  ],
}

const INPUT_DEFAULTS: Record<string, CapabilityInputDefault[]> = {
  "linear capabilities": [
    inputDefault(
      "flag",
      "--compat",
      "Defaults to the startup-safe capabilities schema shape.",
      "v1",
    ),
  ],
  "linear cycle current": [
    inputDefault(
      "flag",
      "--team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
  "linear cycle list": [
    inputDefault(
      "flag",
      "--team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
  "linear cycle next": [
    inputDefault(
      "flag",
      "--team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
  "linear issue children": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue comment add": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear issue comment update": [
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear issue create": [
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear issue create-batch": [
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear issue parent": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue relation list": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue start": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue update": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear issue view": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear notification archive": [
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear notification read": [
    inputDefault(
      "flag",
      "--timeout-ms",
      "Falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in timeout.",
    ),
  ],
  "linear team members": [
    inputDefault(
      "argument",
      "team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
  "linear team view": [
    inputDefault(
      "argument",
      "team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
}

const INPUT_RESOLUTIONS: Record<string, CapabilityInputResolution[]> = {
  "linear cycle current": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
    ),
  ],
  "linear cycle list": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
    ),
  ],
  "linear cycle next": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
    ),
  ],
  "linear issue children": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue comment add": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear issue comment update": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear issue create": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear issue create-batch": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear issue parent": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue relation list": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue start": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear issue update": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear issue view": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear notification archive": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear notification read": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
    ),
  ],
  "linear team members": [
    inputResolution(
      "argument",
      "team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
    ),
  ],
  "linear team view": [
    inputResolution(
      "argument",
      "team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
    ),
  ],
}

const COMMAND_CONSTRAINTS: Record<string, CapabilityConstraint[]> = {
  "linear capabilities": [
    constraint(
      inputRef("flag", "--compat"),
      "requires_all_of",
      [inputRef("flag", "--json")],
      "--compat only applies to the machine-readable JSON output.",
    ),
  ],
  "linear issue comment add": [
    constraint(
      inputRef("flag", "--body"),
      "conflicts_with",
      [inputRef("flag", "--body-file")],
      "Choose either inline body text or a body file for the comment content.",
    ),
  ],
  "linear issue comment update": [
    constraint(
      inputRef("flag", "--body"),
      "conflicts_with",
      [inputRef("flag", "--body-file")],
      "Choose either inline body text or a body file for the replacement comment content.",
    ),
  ],
  "linear issue create": [
    constraint(
      inputRef("flag", "--description"),
      "conflicts_with",
      [inputRef("flag", "--description-file")],
      "Choose either inline description text or a description file.",
    ),
  ],
  "linear issue list": [
    constraint(
      inputRef("flag", "--all-states"),
      "conflicts_with",
      [inputRef("flag", "--state")],
      "--all-states already includes every state, so it cannot be combined with --state.",
    ),
  ],
  "linear issue update": [
    constraint(
      inputRef("flag", "--description"),
      "conflicts_with",
      [inputRef("flag", "--description-file")],
      "Choose either inline replacement description text or a description file.",
    ),
  ],
}

const COMMAND_EXAMPLES: Record<string, CapabilityCommandExample[]> = {
  "linear capabilities": [
    example("Read the startup-safe capabilities registry.", [
      "linear",
      "capabilities",
      "--json",
    ]),
    example("Opt into richer schema metadata for advanced agents.", [
      "linear",
      "capabilities",
      "--json",
      "--compat",
      "v2",
    ]),
  ],
  "linear issue create": [
    example("Preview a new issue before creating it.", [
      "linear",
      "issue",
      "create",
      "--title",
      "Backfill docs",
      "--team",
      "ENG",
      "--dry-run",
      "--json",
    ]),
  ],
  "linear issue list": [
    example("Read issue list data with a stable JSON envelope.", [
      "linear",
      "issue",
      "list",
      "--json",
    ]),
    example("List all assignees with a state filter.", [
      "linear",
      "issue",
      "list",
      "--all",
      "--state",
      "started",
      "--json",
    ]),
  ],
  "linear issue update": [
    example("Preview an issue update with dry-run JSON.", [
      "linear",
      "issue",
      "update",
      "ENG-123",
      "--state",
      "done",
      "--dry-run",
      "--json",
    ]),
    example("Apply an update and append a comment.", [
      "linear",
      "issue",
      "update",
      "ENG-123",
      "--state",
      "done",
      "--comment",
      "Shipped",
      "--json",
    ]),
  ],
  "linear notification read": [
    example("Mark a notification as read with machine-readable output.", [
      "linear",
      "notification",
      "read",
      "notif_123",
      "--json",
    ]),
  ],
}

const ARRAY_RESULT_COMMANDS = new Set<string>([
  "linear cycle list",
  "linear document list",
  "linear issue children",
  "linear issue list",
  "linear issue relation list",
  "linear initiative list",
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
    notes:
      "Default --json preserves the v1-compatible shape; use --compat v2 for richer schema and output metadata.",
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
    path: "linear initiative list",
    summary: "List initiatives",
    json: jsonContract("v5"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear initiative view",
    summary: "View an initiative",
    json: jsonContract("v5"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes: null,
  },
  {
    path: "linear initiative-update list",
    summary: "List initiative status updates",
    json: jsonContract("v5"),
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
    notes:
      "Issue list JSON keeps the nested state object and adds a stateName convenience field.",
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
    path: "linear project-update list",
    summary: "List project status updates",
    json: jsonContract("v5"),
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
  const flags = uniqueFlags([
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
  ])
  const arguments_ = PRIMARY_ARGUMENTS[command.path] ?? []

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

  const requiredInputs: CapabilityInputReference[] = [
    ...arguments_
      .filter((entry) => entry.required)
      .map((entry) => ({ source: "argument" as const, name: entry.name })),
    ...flags
      .filter((entry) => entry.required)
      .map((entry) => ({ source: "flag" as const, name: entry.name })),
  ]
  const optionalInputs: CapabilityInputReference[] = [
    ...arguments_
      .filter((entry) => !entry.required)
      .map((entry) => ({ source: "argument" as const, name: entry.name })),
    ...flags
      .filter((entry) => !entry.required)
      .map((entry) => ({ source: "flag" as const, name: entry.name })),
  ]

  return {
    coverage: "curated_primary_inputs",
    arguments: arguments_,
    flags,
    inputModes,
    requiredInputs,
    optionalInputs,
    defaults: INPUT_DEFAULTS[command.path] ?? [],
    resolutions: INPUT_RESOLUTIONS[command.path] ?? [],
    constraints: COMMAND_CONSTRAINTS[command.path] ?? [],
    stdinTargets: STDIN_TARGETS[command.path] ?? [],
    fileTargets: FILE_TARGETS[command.path] ?? [],
    examples: COMMAND_EXAMPLES[command.path] ?? [],
  }
}

function buildSuccessTopLevelFields(
  command: CapabilityRegistryEntry,
): string[] {
  const explicitFields: Record<string, string[]> = {
    "linear issue comment add": [
      "id",
      "body",
      "createdAt",
      "url",
      "parentId",
      "issue",
      "user",
      "receipt",
    ],
    "linear issue create": [
      "id",
      "identifier",
      "title",
      "url",
      "dueDate",
      "assignee",
      "parent",
      "state",
      "receipt",
    ],
    "linear issue relation add": [
      "success",
      "noOp",
      "direction",
      "relationType",
      "issue",
      "relatedIssue",
      "relationId",
      "receipt",
    ],
    "linear issue relation delete": [
      "success",
      "noOp",
      "direction",
      "relationType",
      "issue",
      "relatedIssue",
      "relationId",
      "receipt",
    ],
    "linear issue update": [
      "id",
      "identifier",
      "title",
      "url",
      "dueDate",
      "assignee",
      "parent",
      "state",
      "comment",
      "receipt",
    ],
    "linear notification archive": [
      "id",
      "title",
      "archivedAt",
      "readAt",
      "noOp",
      "receipt",
    ],
    "linear notification read": [
      "id",
      "title",
      "readAt",
      "archivedAt",
      "noOp",
      "receipt",
    ],
  }

  const explicit = explicitFields[command.path]
  if (explicit != null) {
    return explicit
  }

  if (command.path === "linear capabilities") {
    return [
      "schemaVersion",
      "cli",
      "contractVersions",
      "automationTier",
      "commands",
      "compatibility",
    ]
  }

  if (command.path === "linear api") {
    return ["data"]
  }

  if (command.json.supported) {
    return ["success", "data"]
  }

  return []
}

function buildFailureDetailFields(
  command: CapabilityRegistryEntry,
): string[] {
  const fields = new Set<string>()

  if (WRITE_TIMEOUT_COMMANDS.has(command.path)) {
    fields.add("failureMode")
    fields.add("outcome")
    fields.add("appliedState")
    fields.add("callerGuidance")
  }

  if (PARTIAL_SUCCESS_COMMANDS.has(command.path)) {
    fields.add("partialSuccess")
    fields.add("retryCommand")
  }

  if (command.path === "linear issue create-batch") {
    fields.add("createdIdentifiers")
    fields.add("createdCount")
    fields.add("failedStep")
    fields.add("retryable")
    fields.add("retryHint")
  }

  return [...fields]
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

  const successContract: CapabilityOutputContract | null =
    command.path === "linear api"
      ? { kind: "raw_graphql_response", version: null }
      : command.path === "linear capabilities"
      ? { kind: "capabilities_discovery", version: "v2" }
      : command.json.contractVersion == null
      ? null
      : { kind: "automation_contract", version: command.json.contractVersion }

  const previewContract: CapabilityOutputContract | null =
    command.dryRun.contractVersion == null
      ? null
      : { kind: "dry_run_preview", version: command.dryRun.contractVersion }

  return {
    success: {
      category,
      contractTarget,
      contract: successContract,
      shape,
      exitCode: 0,
      topLevelFields: buildSuccessTopLevelFields(command),
    },
    preview: {
      supported: command.dryRun.supported,
      contractTarget: command.dryRun.contractVersion == null
        ? null
        : `dry_run_preview:${command.dryRun.contractVersion}`,
      contract: previewContract,
      shape: command.dryRun.supported ? "object" : null,
      exitCode: command.dryRun.supported ? 0 : null,
      topLevelFields: command.dryRun.supported
        ? ["success", "dryRun", "summary", "data"]
        : null,
    },
    failure: {
      jsonWhenRequested: JSON_FAILURE_COMMANDS.has(command.path),
      parseErrorsJsonWhenRequested: JSON_FAILURE_COMMANDS.has(command.path),
      exitCodes: buildFailureExitCodes(command),
      topLevelFields: JSON_FAILURE_COMMANDS.has(command.path)
        ? ["success", "error"]
        : [],
      errorFields: JSON_FAILURE_COMMANDS.has(command.path)
        ? ["type", "message", "suggestion", "context", "details"]
        : [],
      detailFields: JSON_FAILURE_COMMANDS.has(command.path)
        ? buildFailureDetailFields(command)
        : [],
    },
  }
}

function buildWriteSemantics(
  command: CapabilityRegistryEntry,
): CapabilityWriteSemantics {
  const timeoutAware = WRITE_TIMEOUT_COMMANDS.has(command.path)

  return {
    timeoutAware,
    timeoutReconciliation: timeoutAware,
    mayReturnNoOp: command.idempotency.category === "retry_safe_no_op",
    mayReturnPartialSuccess: PARTIAL_SUCCESS_COMMANDS.has(command.path),
  }
}

function buildAutomationTier() {
  const byVersion = {
    v1: [] as string[],
    v2: [] as string[],
    v3: [] as string[],
    v4: [] as string[],
    v5: [] as string[],
  }

  for (const command of CAPABILITY_COMMANDS) {
    const version = command.json.contractVersion
    if (version != null) {
      byVersion[version].push(command.path)
    }
  }

  return {
    latestVersion: "v5" as const,
    byVersion,
    allCommands: [
      ...byVersion.v1,
      ...byVersion.v2,
      ...byVersion.v3,
      ...byVersion.v4,
      ...byVersion.v5,
    ],
  }
}

function buildCapabilitiesPayloadBase(
  version: string,
): CapabilitiesPayloadBase {
  return {
    cli: {
      name: "linear-cli",
      binary: "linear",
      version,
    },
    contractVersions: {
      automation: {
        latest: "v5",
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
  }
}

function buildCapabilitiesPayloadV1(version: string): CapabilitiesPayloadV1 {
  return {
    schemaVersion: "v1",
    ...buildCapabilitiesPayloadBase(version),
    commands: CAPABILITY_COMMANDS.map((command) => ({
      ...command,
      json: { ...command.json },
      dryRun: { ...command.dryRun },
      stdin: { ...command.stdin },
      idempotency: { ...command.idempotency },
    })),
  }
}

function buildCapabilitiesPayloadV2(version: string): CapabilitiesPayloadV2 {
  return {
    schemaVersion: "v2",
    ...buildCapabilitiesPayloadBase(version),
    compatibility: {
      defaultSchemaVersion: "v1",
      latestSchemaVersion: "v2",
      supportedSchemaVersions: [...CAPABILITIES_COMPATIBILITY_VERSIONS],
    },
    commands: CAPABILITY_COMMANDS.map((command) => ({
      ...command,
      json: { ...command.json },
      dryRun: { ...command.dryRun },
      stdin: { ...command.stdin },
      idempotency: { ...command.idempotency },
      writeSemantics: buildWriteSemantics(command),
      schema: buildCommandSchema(command),
      output: buildCommandOutput(command),
    })),
  }
}

export function buildCapabilitiesPayload(
  version: string,
): CapabilitiesPayloadV1
export function buildCapabilitiesPayload(
  version: string,
  compat: "v1",
): CapabilitiesPayloadV1
export function buildCapabilitiesPayload(
  version: string,
  compat: "v2",
): CapabilitiesPayloadV2
export function buildCapabilitiesPayload(
  version: string,
  compat: CapabilitiesCompatibilityVersion,
): CapabilitiesPayload
export function buildCapabilitiesPayload(
  version: string,
  compat: CapabilitiesCompatibilityVersion = "v1",
): CapabilitiesPayload {
  if (compat === "v2") {
    return buildCapabilitiesPayloadV2(version)
  }

  return buildCapabilitiesPayloadV1(version)
}
