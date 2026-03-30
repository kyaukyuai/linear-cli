export type AutomationContractVersion = "v1" | "v2" | "v3" | "v4"
export type DryRunContractVersion = "v1"
export type StdinPolicyVersion = "v1"
export type CapabilitiesSchemaVersion = "v1"

export type CapabilityStdinMode = "none" | "implicit_text" | "explicit_bulk"

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
  notes: string | null
}

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
): CapabilityCommand["json"] {
  return {
    supported: contractVersion != null,
    contractVersion,
  }
}

function jsonOptional(): CapabilityCommand["json"] {
  return {
    supported: true,
    contractVersion: null,
  }
}

function noJson(): CapabilityCommand["json"] {
  return {
    supported: false,
    contractVersion: null,
  }
}

function dryRunContract(
  contractVersion: DryRunContractVersion | null,
): CapabilityCommand["dryRun"] {
  return {
    supported: contractVersion != null,
    contractVersion,
  }
}

function stdin(mode: CapabilityStdinMode): CapabilityCommand["stdin"] {
  return { mode }
}

function idempotency(
  category: CapabilityIdempotencyCategory,
  notes: string | null = null,
): CapabilityCommand["idempotency"] {
  return { category, notes }
}

const COMMANDS: CapabilityCommand[] = [
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
    schemaVersion: "v1",
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
    })),
  }
}
