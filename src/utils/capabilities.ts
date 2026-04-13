import {
  AGENT_SAFE_PROFILE,
  AGENT_SAFE_WRITE_TIMEOUT_MS,
  HUMAN_DEBUG_PROFILE,
} from "./execution_profile.ts"

export type AutomationContractVersion =
  | "v1"
  | "v2"
  | "v3"
  | "v4"
  | "v5"
  | "v6"
  | "v7"
export type DryRunContractVersion = "v1"
export type StdinPolicyVersion = "v1"
export type CapabilitiesSchemaVersion = "v1" | "v2"
export type CapabilitiesCompatibilityVersion = CapabilitiesSchemaVersion

export type CapabilityStdinMode = "none" | "implicit_text" | "explicit_bulk"
export type CapabilityInputMode = "flags" | "stdin" | "file"
export type CapabilitySchemaCoverage = "curated_primary_inputs"
export type CapabilityInputReferenceSource = "argument" | "flag" | "stdin"
export type CapabilityScalarLiteralValue = string | number | boolean
export type CapabilityLiteralValue =
  | CapabilityScalarLiteralValue
  | CapabilityScalarLiteralValue[]
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

export type CapabilityDeprecation = {
  replacement: string | null
  note: string
}

export type CapabilityParameterExampleValue = CapabilityLiteralValue

export type CapabilityArgumentSchema = {
  name: string
  required: boolean
  valueType: CapabilityValueType
  description: string
  allowedValues: CapabilityAllowedValue[] | null
  repeatable?: boolean
  variadic?: boolean
  aliases?: string[]
  defaultValue?: CapabilityLiteralValue | null
  examples?: CapabilityParameterExampleValue[]
  deprecated?: CapabilityDeprecation | null
}

export type CapabilityFlagSchema = {
  name: string
  short: string | null
  required: boolean
  valueType: CapabilityValueType
  description: string
  allowedValues: CapabilityAllowedValue[] | null
  repeatable?: boolean
  variadic?: boolean
  aliases?: string[]
  defaultValue?: CapabilityLiteralValue | null
  examples?: CapabilityParameterExampleValue[]
  deprecated?: CapabilityDeprecation | null
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
  | "config_or_env_default"
  | "implicit_input_source"

export type CapabilityResolutionSourceKind =
  | "config"
  | "env"
  | "git_branch"
  | "jj_trailer"
  | "stdin"
  | "internal_default"

export type CapabilityResolutionSource = {
  kind: CapabilityResolutionSourceKind
  name: string | null
  value: CapabilityLiteralValue | null
}

export type CapabilityInputResolution = CapabilityInputReference & {
  strategy: CapabilityInputResolutionStrategy
  description: string
  sources?: CapabilityResolutionSource[]
}

export type CapabilityConstraintKind =
  | "conflicts_with"
  | "requires_all_of"
  | "requires_any_of"
  | "at_most_one_of"

export type CapabilityConstraint = {
  source?: CapabilityInputReference
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

export type CapabilityExecutionProfileName = "agent-safe" | "human-debug"

export type CapabilityExecutionProfile = {
  name: CapabilityExecutionProfileName
  description: string
  semantics: {
    disablePagerByDefault: boolean
    preferJsonWhenSupported: boolean
    requireExplicitConfirmationBypass: boolean
    defaultWriteTimeoutMs: number
    allowInteractivePrompts: boolean
  }
  nonGoals: string[]
}

export type CapabilityExecutionProfiles = {
  defaultProfile: CapabilityExecutionProfileName
  availableProfiles: CapabilityExecutionProfile[]
}

export type CapabilitySurfaceClass =
  | "stable"
  | "partial"
  | "escape_hatch"

export type CapabilitySurfaceReason =
  | "startup_contract"
  | "automation_contract"
  | "shared_preview_contract"
  | "best_effort_machine_readable"
  | "raw_api"
  | "human_debug_only"

export type CapabilitySurfaceClassification = {
  class: CapabilitySurfaceClass
  reason: CapabilitySurfaceReason
}

export type CapabilitySurfaceClasses = Record<
  CapabilitySurfaceClass,
  {
    description: string
    callerExpectation: string
  }
>

export type CapabilityCommand = {
  path: string
  summary: string
  surface: CapabilitySurfaceClassification
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
  "surface" | "schema" | "output" | "writeSemantics"
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
    defaultSchemaVersion: "v2"
    latestSchemaVersion: "v2"
    supportedSchemaVersions: CapabilitiesCompatibilityVersion[]
  }
  surfaceClasses: CapabilitySurfaceClasses
  executionProfiles: CapabilityExecutionProfiles
  commands: CapabilityCommand[]
}

export type CapabilitiesPayload = CapabilitiesPayloadV1 | CapabilitiesPayloadV2

const AUTOMATION_CONTRACT_VERSIONS = [
  "v1",
  "v2",
  "v3",
  "v4",
  "v5",
  "v6",
  "v7",
] as const
const DRY_RUN_CONTRACT_VERSIONS = ["v1"] as const
const STDIN_POLICY_VERSIONS = ["v1"] as const
const CAPABILITIES_COMPATIBILITY_VERSIONS = ["v1", "v2"] as const
const RELATION_TYPE_VALUES = [
  "blocks",
  "blocked-by",
  "related",
  "duplicate",
] as const
const ISSUE_STATE_VALUES = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
] as const
const INITIATIVE_STATUS_VALUES = [
  "active",
  "planned",
  "completed",
] as const
const PROJECT_STATUS_VALUES = [
  "planned",
  "started",
  "paused",
  "completed",
  "canceled",
  "backlog",
] as const
const ISSUE_SORT_VALUES = ["manual", "priority"] as const

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

type CapabilityParameterOptions = {
  repeatable?: boolean
  variadic?: boolean
  aliases?: string[]
  deprecated?: CapabilityDeprecation | null
  defaultValue?: CapabilityLiteralValue | null
  examples?: CapabilityParameterExampleValue[]
}

function argument(
  name: string,
  valueType: CapabilityValueType,
  description: string,
  required = true,
  allowedValues: CapabilityAllowedValue[] | null = null,
  options: CapabilityParameterOptions = {},
): CapabilityArgumentSchema {
  return {
    name,
    required,
    valueType,
    description,
    allowedValues,
    ...(options.repeatable ? { repeatable: true } : {}),
    ...(options.variadic ? { variadic: true } : {}),
    ...(options.aliases != null && options.aliases.length > 0
      ? { aliases: options.aliases }
      : {}),
    ...(options.deprecated != null ? { deprecated: options.deprecated } : {}),
    ...(options.defaultValue != null
      ? { defaultValue: options.defaultValue }
      : {}),
    ...(options.examples != null && options.examples.length > 0
      ? { examples: options.examples }
      : {}),
  }
}

function flag(
  name: string,
  short: string | null,
  valueType: CapabilityValueType,
  description: string,
  required = false,
  allowedValues: CapabilityAllowedValue[] | null = null,
  options: CapabilityParameterOptions = {},
): CapabilityFlagSchema {
  return {
    name,
    short,
    required,
    valueType,
    description,
    allowedValues,
    ...(options.repeatable ? { repeatable: true } : {}),
    ...(options.variadic ? { variadic: true } : {}),
    ...(options.aliases != null && options.aliases.length > 0
      ? { aliases: options.aliases }
      : {}),
    ...(options.deprecated != null ? { deprecated: options.deprecated } : {}),
    ...(options.defaultValue != null
      ? { defaultValue: options.defaultValue }
      : {}),
    ...(options.examples != null && options.examples.length > 0
      ? { examples: options.examples }
      : {}),
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
  sources: CapabilityResolutionSource[] = [],
): CapabilityInputResolution {
  return {
    source,
    name,
    strategy,
    description,
    ...(sources.length > 0 ? { sources } : {}),
  }
}

function constraint(
  source: CapabilityInputReference,
  kind: CapabilityConstraintKind,
  targets: CapabilityInputReference[],
  reason: string,
): CapabilityConstraint {
  return { source, kind, targets, reason }
}

function constraintGroup(
  kind: CapabilityConstraintKind,
  targets: CapabilityInputReference[],
  reason: string,
): CapabilityConstraint {
  return { kind, targets, reason }
}

function deprecation(
  note: string,
  replacement: string | null = null,
): CapabilityDeprecation {
  return { note, replacement }
}

function resolutionSource(
  kind: CapabilityResolutionSourceKind,
  name: string | null,
  value: CapabilityLiteralValue | null = null,
): CapabilityResolutionSource {
  return { kind, name, value }
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
  "linear issue assign",
  "linear issue children",
  "linear issue comment add",
  "linear issue create",
  "linear issue create-batch",
  "linear issue estimate",
  "linear issue list",
  "linear issue move",
  "linear issue parent",
  "linear issue priority",
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
  "linear project create",
  "linear project label add",
  "linear project label remove",
  "linear project list",
  "linear project view",
  "linear project-update list",
  "linear project-label list",
  "linear resolve issue",
  "linear resolve label",
  "linear resolve team",
  "linear resolve user",
  "linear resolve workflow-state",
  "linear team list",
  "linear team members",
  "linear team view",
  "linear user list",
  "linear user view",
  "linear webhook create",
  "linear webhook delete",
  "linear webhook list",
  "linear webhook update",
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
  "linear api": [
    argument(
      "query",
      "string",
      "Inline GraphQL query text. Omit to provide the query on stdin.",
      false,
      null,
      {
        examples: ["query { viewer { id } }"],
      },
    ),
  ],
  "linear document delete": [
    argument(
      "documentIds",
      "document_id",
      "One or more document IDs.",
      false,
      null,
      {
        variadic: true,
        repeatable: true,
        examples: ["doc_123", "doc_456"],
      },
    ),
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
      null,
      {
        examples: ["Ready for review"],
      },
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
  "linear resolve issue": [
    argument(
      "issue",
      "issue_ref",
      "Issue identifier. Defaults to the current issue from VCS context.",
      false,
      null,
      {
        examples: ["ENG-123"],
      },
    ),
  ],
  "linear resolve label": [
    argument("label", "label_ref", "Issue label name."),
  ],
  "linear resolve team": [
    argument(
      "team",
      "team_key",
      "Team key. Defaults to the configured current team.",
      false,
    ),
  ],
  "linear resolve user": [
    argument("user", "user_ref", "User email, display name, or self."),
  ],
  "linear resolve workflow-state": [
    argument(
      "workflowState",
      "state_ref",
      "Workflow state name, type, or ID within a team context.",
    ),
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
  "linear api": [
    flag(
      "--variable",
      null,
      "string",
      "Variable in key=value format (coerces booleans, numbers, null; @file reads from path).",
      false,
      null,
      {
        repeatable: true,
        examples: ["teamId=ENG", "limit=10", "input=@payload.json"],
      },
    ),
    flag(
      "--variables-json",
      null,
      "string",
      "JSON object of variables merged with --variable values.",
      false,
      null,
      {
        examples: ['{"teamId":"ENG","limit":10}'],
      },
    ),
    flag(
      "--paginate",
      null,
      "boolean",
      "Auto-paginate a single connection field using cursor pagination.",
    ),
    flag(
      "--silent",
      null,
      "boolean",
      "Suppress response output while still surfacing non-zero exits.",
    ),
  ],
  "linear capabilities": [
    flag(
      "--compat",
      null,
      "string",
      "Select the machine-readable capabilities schema version.",
      false,
      enumValues(CAPABILITIES_COMPATIBILITY_VERSIONS),
      {
        defaultValue: "v2",
        examples: ["v1", "v2"],
      },
    ),
    flag(
      "--text",
      null,
      "boolean",
      "Output a human-readable capabilities summary.",
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
    flag(
      "--attach",
      "-a",
      "path",
      "Attach a file to the comment.",
      false,
      null,
      {
        repeatable: true,
        examples: ["review.md", "screenshot.png"],
      },
    ),
    flag(
      "--interactive",
      "-i",
      "boolean",
      "Enable interactive body prompts when the runtime allows them.",
    ),
  ],
  "linear issue comment update": [
    flag("--body", null, "string", "Replacement comment body as inline text."),
    flag("--body-file", null, "path", "Read the replacement body from a file."),
  ],
  "linear issue create": [
    flag("--start", null, "boolean", "Start the issue after creation."),
    flag(
      "--assignee",
      "-a",
      "user_ref",
      "Assign the issue to self or another user by username or name.",
      false,
      null,
      { examples: ["self", "alice"] },
    ),
    flag(
      "--due-date",
      null,
      "string",
      "Due date of the issue.",
      false,
      null,
      { examples: ["2026-04-30"] },
    ),
    flag(
      "--parent",
      null,
      "issue_ref",
      "Parent issue identifier.",
      false,
      null,
      { examples: ["ENG-100"] },
    ),
    flag(
      "--priority",
      "-p",
      "integer",
      "Priority of the issue (1-4, descending priority).",
      false,
      null,
      { examples: [1, 3] },
    ),
    flag(
      "--estimate",
      null,
      "integer",
      "Points estimate of the issue.",
      false,
      null,
      { examples: [3] },
    ),
    flag("--title", "-t", "string", "Issue title."),
    flag("--team", null, "team_key", "Team key.", true, null, {
      examples: ["ENG"],
    }),
    flag(
      "--description",
      "-d",
      "string",
      "Issue description as inline text.",
      false,
      null,
      { examples: ["Backfill the migration guide"] },
    ),
    flag(
      "--description-file",
      null,
      "path",
      "Read the description from a file.",
      false,
      null,
      { examples: ["issue.md"] },
    ),
    flag(
      "--context-file",
      null,
      "path",
      "Read a normalized external context JSON envelope from a file.",
      false,
      null,
      { examples: ["slack-thread.json"] },
    ),
    flag(
      "--apply-triage",
      null,
      "boolean",
      "Apply deterministic triage hints from --context-file when routing fields are omitted.",
    ),
    flag(
      "--label",
      "-l",
      "label_ref",
      "Issue label associated with the issue.",
      false,
      null,
      {
        repeatable: true,
        examples: ["bug", "customer"],
      },
    ),
    flag(
      "--project",
      null,
      "project_ref",
      "Name or slug ID of the project with the issue.",
      false,
      null,
      { examples: ["auth-refresh"] },
    ),
    flag(
      "--state",
      null,
      "state_ref",
      "Initial workflow state.",
      false,
      null,
      { examples: ["started", "done"] },
    ),
    flag(
      "--milestone",
      null,
      "milestone_ref",
      "Name of the project milestone.",
      false,
      null,
      { examples: ["Phase 1"] },
    ),
    flag(
      "--cycle",
      null,
      "cycle_ref",
      "Cycle name, number, or active.",
      false,
      null,
      { examples: ["active", "42"] },
    ),
    flag("--text", null, "boolean", "Output human-readable text."),
    flag(
      "--no-pager",
      null,
      "boolean",
      "Compatibility flag; issue create does not page output.",
    ),
    flag(
      "--no-use-default-template",
      null,
      "boolean",
      "Do not use the default issue template.",
    ),
    flag(
      "--interactive",
      "-i",
      "boolean",
      "Enable interactive prompts and editor flow.",
    ),
    flag(
      "--no-interactive",
      null,
      "boolean",
      "Compatibility flag for explicit non-interactive execution.",
    ),
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
    flag(
      "--state",
      "-s",
      "state_ref",
      "Filter by workflow state.",
      false,
      enumValues(ISSUE_STATE_VALUES),
      {
        repeatable: true,
        defaultValue: ["unstarted"],
        aliases: ["todo"],
        examples: ["started", "completed"],
      },
    ),
    flag("--query", null, "string", "Filter by search text.", false, null, {
      examples: ["auth refresh"],
    }),
    flag(
      "--team",
      null,
      "team_key",
      "Resolve team-scoped filters and aliases.",
      false,
      null,
      { examples: ["ENG"] },
    ),
    flag(
      "--parent",
      null,
      "issue_ref",
      "Filter child issues of a parent issue.",
      false,
      null,
      { examples: ["ENG-123"] },
    ),
    flag(
      "--assignee",
      null,
      "user_ref",
      "Filter by assignee username.",
      false,
      null,
      { examples: ["alice"] },
    ),
    flag("--all-assignees", "-A", "boolean", "Show issues for all assignees."),
    flag("--unassigned", "-U", "boolean", "Show only unassigned issues."),
    flag(
      "--sort",
      null,
      "string",
      "Sort order.",
      false,
      enumValues(ISSUE_SORT_VALUES),
      {
        examples: ["manual", "priority"],
      },
    ),
    flag(
      "--project",
      null,
      "project_ref",
      "Filter by project name.",
      false,
      null,
      { examples: ["auth-refresh"] },
    ),
    flag(
      "--cycle",
      null,
      "cycle_ref",
      "Filter by cycle name, number, or active.",
      false,
      null,
      { examples: ["active", "42"] },
    ),
    flag(
      "--milestone",
      null,
      "milestone_ref",
      "Filter by project milestone name.",
      false,
      null,
      { examples: ["Phase 1"] },
    ),
    flag(
      "--priority",
      null,
      "integer",
      "Filter by priority.",
      false,
      null,
      { examples: [0, 1, 4] },
    ),
    flag(
      "--updated-before",
      null,
      "string",
      "Filter issues updated before an ISO date or datetime.",
      false,
      null,
      { examples: ["2026-04-01T00:00:00Z"] },
    ),
    flag(
      "--due-before",
      null,
      "string",
      "Filter issues due before a date.",
      false,
      null,
      { examples: ["2026-04-30"] },
    ),
    flag(
      "--limit",
      null,
      "integer",
      "Maximum number of issues to fetch.",
      false,
      null,
      {
        defaultValue: 50,
        examples: [0, 50, 200],
      },
    ),
    flag("--text", null, "boolean", "Output human-readable text."),
    flag("--web", "-w", "boolean", "Open the list in the web browser."),
    flag("--app", "-a", "boolean", "Open the list in Linear.app."),
    flag("--no-pager", null, "boolean", "Disable automatic paging."),
  ],
  "linear issue update": [
    flag(
      "--assignee",
      "-a",
      "user_ref",
      "Assign the issue to self or another user by username or name.",
      false,
      null,
      { examples: ["self", "alice"] },
    ),
    flag(
      "--due-date",
      null,
      "string",
      "Due date of the issue.",
      false,
      null,
      { examples: ["2026-04-30"] },
    ),
    flag(
      "--clear-due-date",
      null,
      "boolean",
      "Clear the due date on the issue.",
    ),
    flag(
      "--parent",
      null,
      "issue_ref",
      "Parent issue identifier.",
      false,
      null,
      { examples: ["ENG-100"] },
    ),
    flag(
      "--priority",
      "-p",
      "integer",
      "Priority of the issue (1-4, descending priority).",
      false,
      null,
      { examples: [1, 3] },
    ),
    flag(
      "--estimate",
      null,
      "integer",
      "Points estimate of the issue.",
      false,
      null,
      { examples: [3] },
    ),
    flag(
      "--description",
      "-d",
      "string",
      "Replacement description text.",
      false,
      null,
      { examples: ["Ship after QA signoff"] },
    ),
    flag(
      "--comment",
      null,
      "string",
      "Comment to append after the update.",
      false,
      null,
      { examples: ["Shipped"] },
    ),
    flag(
      "--description-file",
      null,
      "path",
      "Read the replacement description from a file.",
      false,
      null,
      { examples: ["issue.md"] },
    ),
    flag(
      "--context-file",
      null,
      "path",
      "Read a normalized external context JSON envelope from a file.",
      false,
      null,
      { examples: ["slack-thread.json"] },
    ),
    flag(
      "--context-target",
      null,
      "string",
      "Choose whether --context-file fills the description or comment surface.",
      false,
      enumValues(["comment", "description"]),
    ),
    flag(
      "--apply-triage",
      null,
      "boolean",
      "Apply deterministic triage hints from --context-file when routing fields are omitted.",
    ),
    flag(
      "--label",
      "-l",
      "label_ref",
      "Issue label associated with the issue.",
      false,
      null,
      {
        repeatable: true,
        examples: ["bug", "customer"],
      },
    ),
    flag(
      "--team",
      null,
      "team_key",
      "Team associated with the issue when resolving project or workflow state.",
      false,
      null,
      { examples: ["ENG"] },
    ),
    flag(
      "--project",
      null,
      "project_ref",
      "Name or slug ID of the project with the issue.",
      false,
      null,
      { examples: ["auth-refresh"] },
    ),
    flag(
      "--state",
      null,
      "state_ref",
      "Target workflow state.",
      false,
      null,
      { examples: ["done", "started"] },
    ),
    flag(
      "--milestone",
      null,
      "milestone_ref",
      "Name of the project milestone.",
      false,
      null,
      { examples: ["Phase 1"] },
    ),
    flag(
      "--cycle",
      null,
      "cycle_ref",
      "Cycle name, number, or active.",
      false,
      null,
      { examples: ["active", "42"] },
    ),
    flag(
      "--no-interactive",
      null,
      "boolean",
      "Compatibility flag for explicit non-interactive execution.",
    ),
    flag("--text", null, "boolean", "Output human-readable text."),
    flag("--title", "-t", "string", "Title of the issue.", false, null, {
      examples: ["Backfill migration cookbook"],
    }),
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
  "linear project create": [
    flag("--name", "-n", "string", "Project name.", true, null, {
      examples: ["Auth refresh"],
    }),
    flag(
      "--description",
      "-d",
      "string",
      "Project description.",
      false,
      null,
      { examples: ["Agent-native rollout work"] },
    ),
    flag(
      "--team",
      "-t",
      "team_key",
      "Team key.",
      true,
      null,
      {
        repeatable: true,
        examples: ["ENG", "PLATFORM"],
      },
    ),
    flag(
      "--lead",
      "-l",
      "user_ref",
      "Project lead (username, email, or @me).",
      false,
      null,
      { examples: ["@me", "alice@example.com"] },
    ),
    flag(
      "--status",
      "-s",
      "string",
      "Project status.",
      false,
      enumValues(PROJECT_STATUS_VALUES),
      { examples: ["started"] },
    ),
    flag(
      "--start-date",
      null,
      "string",
      "Start date (YYYY-MM-DD).",
      false,
      null,
      { examples: ["2026-04-01"] },
    ),
    flag(
      "--target-date",
      null,
      "string",
      "Target completion date (YYYY-MM-DD).",
      false,
      null,
      { examples: ["2026-04-30"] },
    ),
    flag(
      "--initiative",
      null,
      "string",
      "Add to initiative immediately by ID, slug, or name.",
      false,
      null,
      { examples: ["roadmap-2026"] },
    ),
    flag("--interactive", "-i", "boolean", "Enable interactive prompts."),
  ],
  "linear project delete": [
    flag("--interactive", "-i", "boolean", "Enable interactive confirmation."),
    flag(
      "--force",
      "-f",
      "boolean",
      "Deprecated alias for --yes.",
      false,
      null,
      {
        aliases: ["--yes"],
        deprecated: deprecation("Deprecated alias for --yes.", "--yes"),
      },
    ),
  ],
  "linear project-update list": [
    flag("--limit", null, "integer", "Limit returned project updates."),
  ],
  "linear resolve label": [
    flag(
      "--team",
      null,
      "team_key",
      "Team key. Falls back to the configured current team.",
    ),
  ],
  "linear resolve workflow-state": [
    flag(
      "--team",
      null,
      "team_key",
      "Team key. Falls back to the configured current team.",
    ),
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
    { field: "sourceContext", viaFlags: ["--context-file"] },
  ],
  "linear issue create-batch": [
    { field: "batch", viaFlags: ["--file"] },
  ],
  "linear issue update": [
    { field: "description", viaFlags: ["--description-file"] },
    { field: "sourceContext", viaFlags: ["--context-file"] },
  ],
}

const INPUT_DEFAULTS: Record<string, CapabilityInputDefault[]> = {
  "linear capabilities": [
    inputDefault(
      "flag",
      "--compat",
      "Defaults to the richer v2 capabilities schema shape.",
      "v2",
    ),
  ],
  "linear issue list": [
    inputDefault(
      "flag",
      "--state",
      "Defaults to unstarted issues when no state filter is provided.",
      ["unstarted"],
    ),
    inputDefault(
      "flag",
      "--limit",
      "Defaults to 50 issues when omitted.",
      50,
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
      "--context-file",
      "May provide the issue title when the envelope includes title-bearing source context.",
    ),
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
      "--context-target",
      "Defaults to comment when --context-file is provided.",
      "comment",
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
  "linear resolve issue": [
    inputDefault(
      "argument",
      "issue",
      "Defaults to the current issue from the branch name or jj trailer.",
    ),
  ],
  "linear resolve label": [
    inputDefault(
      "flag",
      "--team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
  "linear resolve team": [
    inputDefault(
      "argument",
      "team",
      "Falls back to the configured current team when omitted.",
    ),
  ],
  "linear resolve workflow-state": [
    inputDefault(
      "flag",
      "--team",
      "Falls back to the configured current team when omitted.",
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
  "linear capabilities": [
    inputResolution(
      "flag",
      "--compat",
      "env_or_internal_default",
      "The schema defaults to the richer v2 capabilities shape when omitted.",
      [resolutionSource(
        "internal_default",
        "default capabilities schema",
        "v2",
      )],
    ),
  ],
  "linear issue list": [
    inputResolution(
      "flag",
      "--sort",
      "config_or_env_default",
      "If omitted, the CLI resolves issue sort from config or LINEAR_ISSUE_SORT.",
      [
        resolutionSource("config", "issue_sort"),
        resolutionSource("env", "LINEAR_ISSUE_SORT"),
      ],
    ),
  ],
  "linear cycle current": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear cycle list": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear cycle next": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear issue children": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
  ],
  "linear issue comment add": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
    inputResolution(
      "stdin",
      "stdin",
      "implicit_input_source",
      "If no explicit body is provided, the CLI reads stdin before falling back to interactive prompts.",
      [resolutionSource("stdin", "implicit text body")],
    ),
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
  ],
  "linear issue comment update": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
  ],
  "linear issue create": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
    inputResolution(
      "stdin",
      "stdin",
      "implicit_input_source",
      "If no explicit description is provided, the CLI reads stdin before entering interactive editor flow.",
      [resolutionSource("stdin", "implicit description text")],
    ),
  ],
  "linear issue create-batch": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
  ],
  "linear issue parent": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
  ],
  "linear issue relation list": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
  ],
  "linear issue start": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
  ],
  "linear issue update": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
    inputResolution(
      "stdin",
      "stdin",
      "implicit_input_source",
      "If no explicit description is provided, the CLI reads stdin before using interactive editor flow.",
      [resolutionSource("stdin", "implicit description text")],
    ),
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
  ],
  "linear issue view": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
  ],
  "linear notification archive": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
  ],
  "linear notification read": [
    inputResolution(
      "flag",
      "--timeout-ms",
      "env_or_internal_default",
      "The timeout falls back to LINEAR_WRITE_TIMEOUT_MS or the built-in default when omitted.",
      [
        resolutionSource("env", "LINEAR_WRITE_TIMEOUT_MS"),
        resolutionSource("internal_default", "execution profile write timeout"),
      ],
    ),
  ],
  "linear resolve issue": [
    inputResolution(
      "argument",
      "issue",
      "current_issue_context",
      "If omitted, the CLI resolves the current issue from the branch name or jj trailer.",
      [
        resolutionSource("git_branch", "issue identifier from branch name"),
        resolutionSource("jj_trailer", "linear issue trailer"),
      ],
    ),
  ],
  "linear resolve label": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear resolve team": [
    inputResolution(
      "argument",
      "team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear resolve workflow-state": [
    inputResolution(
      "flag",
      "--team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear team members": [
    inputResolution(
      "argument",
      "team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
    ),
  ],
  "linear team view": [
    inputResolution(
      "argument",
      "team",
      "configured_team_context",
      "If omitted, the CLI resolves the team from the configured current team.",
      [resolutionSource("config", "currentTeam")],
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
    constraintGroup(
      "at_most_one_of",
      [
        inputRef("flag", "--json"),
        inputRef("flag", "--text"),
      ],
      "Choose either machine-readable JSON output or the human-readable summary.",
    ),
  ],
  "linear issue comment add": [
    constraint(
      inputRef("flag", "--body"),
      "conflicts_with",
      [inputRef("flag", "--body-file")],
      "Choose either inline body text or a body file for the comment content.",
    ),
    constraintGroup(
      "requires_any_of",
      [
        inputRef("argument", "body"),
        inputRef("flag", "--body"),
        inputRef("flag", "--body-file"),
        inputRef("flag", "--attach"),
        inputRef("stdin", "stdin"),
        inputRef("flag", "--interactive"),
      ],
      "Comment creation needs explicit content, an attachment, stdin, or interactive mode.",
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
    constraint(
      inputRef("flag", "--context-file"),
      "conflicts_with",
      [
        inputRef("flag", "--description"),
        inputRef("flag", "--description-file"),
        inputRef("stdin", "stdin"),
      ],
      "Normalized source context supplies the description body, so it cannot be combined with explicit description text, a description file, or piped stdin content.",
    ),
    constraint(
      inputRef("flag", "--apply-triage"),
      "requires_all_of",
      [inputRef("flag", "--context-file")],
      "--apply-triage only applies when a normalized context file is provided.",
    ),
    constraintGroup(
      "requires_any_of",
      [
        inputRef("flag", "--title"),
        inputRef("flag", "--context-file"),
      ],
      "Issue creation needs an explicit title or a context envelope that carries title-bearing source context.",
    ),
    constraintGroup(
      "at_most_one_of",
      [
        inputRef("flag", "--json"),
        inputRef("flag", "--text"),
      ],
      "Choose either machine-readable JSON output or human-readable text.",
    ),
  ],
  "linear issue list": [
    constraint(
      inputRef("flag", "--all-states"),
      "conflicts_with",
      [inputRef("flag", "--state")],
      "--all-states already includes every state, so it cannot be combined with --state.",
    ),
    constraintGroup(
      "at_most_one_of",
      [
        inputRef("flag", "--json"),
        inputRef("flag", "--text"),
      ],
      "Choose either machine-readable JSON output or human-readable text.",
    ),
  ],
  "linear issue update": [
    constraint(
      inputRef("flag", "--due-date"),
      "conflicts_with",
      [inputRef("flag", "--clear-due-date")],
      "Choose either a replacement due date or --clear-due-date.",
    ),
    constraint(
      inputRef("flag", "--description"),
      "conflicts_with",
      [inputRef("flag", "--description-file")],
      "Choose either inline replacement description text or a description file.",
    ),
    constraint(
      inputRef("flag", "--context-target"),
      "requires_all_of",
      [inputRef("flag", "--context-file")],
      "--context-target only applies when a normalized context file is provided.",
    ),
    constraint(
      inputRef("flag", "--context-file"),
      "conflicts_with",
      [
        inputRef("flag", "--description-file"),
      ],
      "Normalized source context and --description-file are mutually exclusive.",
    ),
    constraint(
      inputRef("flag", "--apply-triage"),
      "requires_all_of",
      [inputRef("flag", "--context-file")],
      "--apply-triage only applies when a normalized context file is provided.",
    ),
    constraintGroup(
      "at_most_one_of",
      [
        inputRef("flag", "--json"),
        inputRef("flag", "--text"),
      ],
      "Choose either machine-readable JSON output or human-readable text.",
    ),
  ],
  "linear project delete": [
    constraintGroup(
      "requires_any_of",
      [
        inputRef("flag", "--yes"),
        inputRef("flag", "--force"),
        inputRef("flag", "--interactive"),
        inputRef("flag", "--dry-run"),
      ],
      "Project deletion requires explicit confirmation bypass, explicit interactive mode, or dry-run preview.",
    ),
  ],
}

const COMMAND_EXAMPLES: Record<string, CapabilityCommandExample[]> = {
  "linear capabilities": [
    example("Read the default schema-like capabilities registry.", [
      "linear",
      "capabilities",
      "--json",
    ]),
    example("Request the legacy v1 compatibility shape for older consumers.", [
      "linear",
      "capabilities",
      "--json",
      "--compat",
      "v1",
    ]),
    example("Pin the richer v2 schema metadata explicitly.", [
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
    example("Create from a normalized source context envelope.", [
      "linear",
      "issue",
      "create",
      "--team",
      "ENG",
      "--context-file",
      "slack-thread.json",
      "--dry-run",
      "--json",
    ]),
    example("Preview deterministic triage from normalized source context.", [
      "linear",
      "issue",
      "create",
      "--context-file",
      "slack-thread.json",
      "--apply-triage",
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
    example("Attach normalized source context to an update comment.", [
      "linear",
      "issue",
      "update",
      "ENG-123",
      "--state",
      "triage",
      "--context-file",
      "slack-thread.json",
      "--dry-run",
      "--json",
    ]),
    example("Preview deterministic triage from normalized source context.", [
      "linear",
      "issue",
      "update",
      "ENG-123",
      "--context-file",
      "slack-thread.json",
      "--apply-triage",
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
  "linear resolve issue": [
    example("Resolve an explicit issue identifier.", [
      "linear",
      "resolve",
      "issue",
      "ENG-123",
      "--json",
    ]),
    example("Resolve the current issue from VCS context.", [
      "linear",
      "resolve",
      "issue",
      "--json",
    ]),
  ],
  "linear resolve label": [
    example("Resolve a label inside a team context.", [
      "linear",
      "resolve",
      "label",
      "Bug",
      "--team",
      "ENG",
      "--json",
    ]),
  ],
  "linear resolve team": [
    example("Resolve the configured current team.", [
      "linear",
      "resolve",
      "team",
      "--json",
    ]),
  ],
  "linear resolve user": [
    example("Resolve the current authenticated user.", [
      "linear",
      "resolve",
      "user",
      "self",
      "--json",
    ]),
  ],
  "linear resolve workflow-state": [
    example("Resolve a workflow state by name.", [
      "linear",
      "resolve",
      "workflow-state",
      "Done",
      "--team",
      "ENG",
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
      "Default --json exposes the richer v2 schema and output metadata; use --compat v1 only for legacy startup compatibility.",
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
    path: "linear issue assign",
    summary: "Assign an issue",
    json: jsonContract("v7"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
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
    path: "linear issue estimate",
    summary: "Set an issue estimate",
    json: jsonContract("v7"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
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
    path: "linear issue move",
    summary: "Move an issue to a workflow state",
    json: jsonContract("v7"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
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
    path: "linear issue priority",
    summary: "Set an issue priority",
    json: jsonContract("v7"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("retry_safe_update"),
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
    json: jsonContract("v7"),
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
    json: jsonContract("v7"),
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
    json: jsonContract("v7"),
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
    json: jsonContract("v7"),
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
    json: jsonContract("v7"),
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
    path: "linear resolve issue",
    summary: "Resolve an issue reference",
    json: jsonContract("v6"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes:
      "Returns canonical issue metadata and unresolved reasons without mutating Linear.",
  },
  {
    path: "linear resolve label",
    summary: "Resolve an issue label reference",
    json: jsonContract("v6"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes:
      "Team-scoped label resolution falls back to the configured current team when --team is omitted.",
  },
  {
    path: "linear resolve team",
    summary: "Resolve a team reference",
    json: jsonContract("v6"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes:
      "If omitted, the team reference resolves from the configured current team.",
  },
  {
    path: "linear resolve user",
    summary: "Resolve a user reference",
    json: jsonContract("v6"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes:
      "Returns the runtime-selected user match and any ambiguous candidates without mutating Linear.",
  },
  {
    path: "linear resolve workflow-state",
    summary: "Resolve a workflow state reference",
    json: jsonContract("v6"),
    dryRun: dryRunContract(null),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("read_only"),
    notes:
      "Workflow state resolution requires team context and reports ambiguous matches as candidates.",
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
    json: jsonContract("v7"),
    dryRun: dryRunContract("v1"),
    stdin: stdin("none"),
    confirmationBypass: null,
    idempotency: idempotency("non_idempotent"),
    notes: null,
  },
  {
    path: "linear webhook delete",
    summary: "Delete a webhook",
    json: jsonContract("v7"),
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
    json: jsonContract("v7"),
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
    "linear issue assign": [
      "identifier",
      "assignee",
      "receipt",
      "operation",
    ],
    "linear issue comment add": [
      "id",
      "body",
      "createdAt",
      "url",
      "parentId",
      "issue",
      "user",
      "receipt",
      "operation",
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
      "sourceContext",
      "triage",
      "receipt",
      "operation",
    ],
    "linear issue create-batch": [
      "team",
      "project",
      "parent",
      "children",
      "counts",
      "receipt",
      "operation",
    ],
    "linear issue estimate": [
      "identifier",
      "estimate",
      "receipt",
      "operation",
    ],
    "linear issue move": [
      "identifier",
      "state",
      "receipt",
      "operation",
    ],
    "linear issue priority": [
      "identifier",
      "priority",
      "receipt",
      "operation",
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
      "operation",
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
      "operation",
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
      "sourceContext",
      "triage",
      "receipt",
      "operation",
    ],
    "linear project create": [
      "id",
      "slugId",
      "name",
      "url",
      "receipt",
      "operation",
    ],
    "linear project label add": [
      "changed",
      "project",
      "label",
      "receipt",
      "operation",
    ],
    "linear project label remove": [
      "changed",
      "project",
      "label",
      "receipt",
      "operation",
    ],
    "linear webhook create": [
      "id",
      "label",
      "url",
      "enabled",
      "archivedAt",
      "allPublicTeams",
      "resourceTypes",
      "createdAt",
      "updatedAt",
      "team",
      "creator",
      "receipt",
      "operation",
    ],
    "linear webhook delete": [
      "id",
      "label",
      "url",
      "success",
      "receipt",
      "operation",
    ],
    "linear webhook update": [
      "id",
      "label",
      "url",
      "enabled",
      "archivedAt",
      "allPublicTeams",
      "resourceTypes",
      "createdAt",
      "updatedAt",
      "team",
      "creator",
      "receipt",
      "operation",
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

  if (command.path.startsWith("linear resolve ")) {
    return [
      "kind",
      "version",
      "refType",
      "input",
      "source",
      "status",
      "matchedBy",
      "ambiguous",
      "resolved",
      "candidates",
      "unresolvedReason",
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

function buildPreviewTopLevelFields(
  command: CapabilityRegistryEntry,
): string[] | null {
  if (!command.dryRun.supported) {
    return null
  }

  const explicitFields: Record<string, string[]> = {
    "linear issue comment add": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear issue create": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear issue create-batch": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear issue relation add": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear issue relation delete": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear issue update": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear project create": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear webhook create": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear webhook delete": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
    "linear webhook update": [
      "success",
      "dryRun",
      "summary",
      "data",
      "operation",
    ],
  }

  return explicitFields[command.path] ??
    ["success", "dryRun", "summary", "data"]
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
      topLevelFields: buildPreviewTopLevelFields(command),
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
    v6: [] as string[],
    v7: [] as string[],
  }

  for (const command of CAPABILITY_COMMANDS) {
    const version = command.json.contractVersion
    if (version != null) {
      byVersion[version].push(command.path)
    }
  }

  return {
    latestVersion: "v7" as const,
    byVersion,
    allCommands: [
      ...byVersion.v1,
      ...byVersion.v2,
      ...byVersion.v3,
      ...byVersion.v4,
      ...byVersion.v5,
      ...byVersion.v6,
      ...byVersion.v7,
    ],
  }
}

function buildExecutionProfiles(): CapabilityExecutionProfiles {
  return {
    defaultProfile: AGENT_SAFE_PROFILE,
    availableProfiles: [
      {
        name: AGENT_SAFE_PROFILE,
        description:
          "Default profile for agent and automation runs that prefer predictable non-interactive defaults.",
        semantics: {
          disablePagerByDefault: true,
          preferJsonWhenSupported: true,
          requireExplicitConfirmationBypass: true,
          defaultWriteTimeoutMs: AGENT_SAFE_WRITE_TIMEOUT_MS,
          allowInteractivePrompts: false,
        },
        nonGoals: [
          "Does not force --json when the caller omits it.",
          "Does not auto-confirm destructive actions; use --yes explicitly.",
          "Does not replace missing required inputs; human/debug prompt flows still require explicit --profile human-debug --interactive opt-in.",
        ],
      },
      {
        name: HUMAN_DEBUG_PROFILE,
        description:
          "Opt-in profile for human-guided debugging that re-enables prompt and pager defaults.",
        semantics: {
          disablePagerByDefault: false,
          preferJsonWhenSupported: false,
          requireExplicitConfirmationBypass: false,
          defaultWriteTimeoutMs: 30_000,
          allowInteractivePrompts: true,
        },
        nonGoals: [
          "Does not revert default-JSON command surfaces; use --text for human-readable output.",
          "Does not auto-confirm destructive actions when --interactive is omitted.",
          "Does not change explicit legacy capabilities compatibility requests.",
        ],
      },
    ],
  }
}

function buildSurfaceClasses(): CapabilitySurfaceClasses {
  return {
    stable: {
      description:
        "Stable machine-readable surface with an explicit startup or automation contract.",
      callerExpectation:
        "Safe to treat as the primary agent-runtime path and depend on for startup, read, preview, or apply loops.",
    },
    partial: {
      description:
        "Agent-usable surface with some structured semantics, but without a full stable apply/read contract.",
      callerExpectation:
        "Prefer only when the stable surface does not cover the workflow yet, and pin explicit flags or migration guidance instead of assuming long-term shape stability.",
    },
    escape_hatch: {
      description:
        "Intentionally raw or human/debug-oriented path outside the stable agent-runtime contract.",
      callerExpectation:
        "Use only as an explicit fallback. Do not infer startup-critical or automation-tier guarantees from availability alone.",
    },
  }
}

function buildSurfaceClassification(
  command: CapabilityRegistryEntry,
): CapabilitySurfaceClassification {
  if (command.path === "linear capabilities") {
    return {
      class: "stable",
      reason: "startup_contract",
    }
  }

  if (command.json.contractVersion != null) {
    return {
      class: "stable",
      reason: "automation_contract",
    }
  }

  if (command.path === "linear api") {
    return {
      class: "escape_hatch",
      reason: "raw_api",
    }
  }

  if (command.dryRun.supported || command.json.supported) {
    return {
      class: "partial",
      reason: command.dryRun.supported
        ? "shared_preview_contract"
        : "best_effort_machine_readable",
    }
  }

  return {
    class: "escape_hatch",
    reason: "human_debug_only",
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
        latest: "v7",
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
      defaultSchemaVersion: "v2",
      latestSchemaVersion: "v2",
      supportedSchemaVersions: [...CAPABILITIES_COMPATIBILITY_VERSIONS],
    },
    surfaceClasses: buildSurfaceClasses(),
    executionProfiles: buildExecutionProfiles(),
    commands: CAPABILITY_COMMANDS.map((command) => ({
      ...command,
      surface: buildSurfaceClassification(command),
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
): CapabilitiesPayloadV2
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
  compat: CapabilitiesCompatibilityVersion = "v2",
): CapabilitiesPayload {
  if (compat === "v2") {
    return buildCapabilitiesPayloadV2(version)
  }

  return buildCapabilitiesPayloadV1(version)
}
