import { gray, yellow } from "@std/fmt/colors"
import { gql } from "../__codegen__/gql.ts"
import { getGraphQLClient } from "./graphql.ts"
import {
  formatIssueIdentifier,
  getTeamKey,
  getWorkflowStates,
} from "./linear.ts"
import { getCurrentIssueFromVcs } from "./vcs.ts"
import { ValidationError } from "./errors.ts"

export type ReferenceResolutionVersion = "v1"
export type ReferenceResolutionType =
  | "issue"
  | "team"
  | "workflow_state"
  | "user"
  | "project"
  | "label"

export type ReferenceResolutionStatus = "resolved" | "unresolved"
export type ReferenceResolutionSource =
  | "argument"
  | "current_issue_context"
  | "configured_team_context"

export type ReferenceResolutionReasonCode =
  | "not_found"
  | "missing_context"

export type ReferenceResolutionReason = {
  code: ReferenceResolutionReasonCode
  message: string
}

export type ResolvedIssueReference = {
  id: string
  identifier: string
  title: string
  url: string
  team: {
    id: string
    key: string
    name: string
  }
}

export type ResolvedTeamReference = {
  id: string
  key: string
  name: string
}

export type ResolvedWorkflowStateReference = {
  id: string
  name: string
  type: string
  color: string
  team: {
    id: string
    key: string
    name: string
  }
}

export type ResolvedUserReference = {
  id: string
  name: string
  displayName: string
  email: string | null
}

export type ResolvedProjectReference = {
  id: string
  slugId: string
  name: string
  url: string
}

export type ResolvedLabelReference = {
  id: string
  name: string
  color: string
  team: {
    id: string
    key: string
    name: string
  } | null
}

export type ReferenceResolutionPayload<TResolved> = {
  kind: "reference_resolution"
  version: ReferenceResolutionVersion
  refType: ReferenceResolutionType
  input: string | null
  source: ReferenceResolutionSource
  status: ReferenceResolutionStatus
  matchedBy: string | null
  ambiguous: boolean
  resolved: TResolved | null
  candidates: TResolved[]
  unresolvedReason: ReferenceResolutionReason | null
}

export type AnyResolvedReference =
  | ResolvedIssueReference
  | ResolvedTeamReference
  | ResolvedWorkflowStateReference
  | ResolvedUserReference
  | ResolvedProjectReference
  | ResolvedLabelReference

export type AnyReferenceResolutionPayload = ReferenceResolutionPayload<
  AnyResolvedReference
>

export type ContextPackResolutionVersion = "v1"
export type ContextPackResolutionStatus =
  | "resolved"
  | "partially_resolved"
  | "unresolved"
export type ContextPackTeamContextSource =
  | "none"
  | "explicit_team_argument"
  | "resolved_issue_team"
  | "configured_team_context"

export type ContextPackTeamContext = {
  source: ContextPackTeamContextSource
  input: string | null
  resolved: ResolvedTeamReference | null
  unresolvedReason: ReferenceResolutionReason | null
}

export type ContextPackRequest = {
  issue: string | null
  team: string | null
  workflowState: string | null
  user: string | null
  project: string | null
  labels: string[]
}

export type ContextPackEntities = {
  issue: ReferenceResolutionPayload<ResolvedIssueReference> | null
  team: ReferenceResolutionPayload<ResolvedTeamReference> | null
  workflowState:
    | ReferenceResolutionPayload<ResolvedWorkflowStateReference>
    | null
  user: ReferenceResolutionPayload<ResolvedUserReference> | null
  project: ReferenceResolutionPayload<ResolvedProjectReference> | null
  labels: ReferenceResolutionPayload<ResolvedLabelReference>[]
}

export type ContextPackResolutionPayload = {
  kind: "context_pack_resolution"
  version: ContextPackResolutionVersion
  requested: ContextPackRequest
  status: ContextPackResolutionStatus
  teamContext: ContextPackTeamContext
  entities: ContextPackEntities
  summary: {
    requestedCount: number
    resolvedCount: number
    unresolvedCount: number
    ambiguousCount: number
  }
}

export type ResolveContextPackInput = {
  issue?: string
  team?: string
  workflowState?: string
  user?: string
  project?: string
  labels?: string[]
}

const ResolveIssueReferenceQuery = gql(/* GraphQL */ `
  query ResolveIssueReference($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      url
      team {
        id
        key
        name
      }
    }
  }
`)

const ResolveTeamReferenceQuery = gql(/* GraphQL */ `
  query ResolveTeamReference($id: String!) {
    team(id: $id) {
      id
      key
      name
    }
  }
`)

const ResolveViewerReferenceQuery = gql(/* GraphQL */ `
  query ResolveViewerReference {
    viewer {
      id
      name
      displayName
      email
    }
  }
`)

const ResolveUserReferenceQuery = gql(/* GraphQL */ `
  query ResolveUserReference($input: String!) {
    users(
      filter: {
        or: [
          { email: { eqIgnoreCase: $input } }
          { displayName: { eqIgnoreCase: $input } }
          { name: { containsIgnoreCaseAndAccent: $input } }
        ]
      }
    ) {
      nodes {
        id
        email
        displayName
        name
      }
    }
  }
`)

const ResolveProjectReferenceByIdQuery = gql(/* GraphQL */ `
  query ResolveProjectReferenceById($id: String!) {
    project(id: $id) {
      id
      slugId
      name
      url
    }
  }
`)

const ResolveProjectReferenceBySlugQuery = gql(/* GraphQL */ `
  query ResolveProjectReferenceBySlug($slugId: String!) {
    projects(filter: { slugId: { eq: $slugId } }) {
      nodes {
        id
        slugId
        name
        url
      }
    }
  }
`)

const ResolveIssueLabelReferenceQuery = gql(/* GraphQL */ `
  query ResolveIssueLabelReference($name: String!, $teamKey: String!) {
    issueLabels(
      filter: {
        name: { eqIgnoreCase: $name }
        or: [{ team: { key: { eq: $teamKey } } }, { team: { null: true } }]
      }
    ) {
      nodes {
        id
        name
        color
        team {
          id
          key
          name
        }
      }
    }
  }
`)

function isValidLinearIdentifier(id: string): boolean {
  return /^[a-zA-Z0-9]+-[1-9][0-9]*$/i.test(id)
}

function isPositiveIntegerString(value: string): boolean {
  return /^[1-9][0-9]*$/.test(value)
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  )
}

function buildResolvedPayload<TResolved>(
  options: {
    refType: ReferenceResolutionType
    input: string | null
    source: ReferenceResolutionSource
    matchedBy: string
    resolved: TResolved
    candidates?: TResolved[]
  },
): ReferenceResolutionPayload<TResolved> {
  const candidates = options.candidates ?? [options.resolved]
  return {
    kind: "reference_resolution",
    version: "v1",
    refType: options.refType,
    input: options.input,
    source: options.source,
    status: "resolved",
    matchedBy: options.matchedBy,
    ambiguous: candidates.length > 1,
    resolved: options.resolved,
    candidates,
    unresolvedReason: null,
  }
}

function buildUnresolvedPayload<TResolved>(
  options: {
    refType: ReferenceResolutionType
    input: string | null
    source: ReferenceResolutionSource
    code: ReferenceResolutionReasonCode
    message: string
  },
): ReferenceResolutionPayload<TResolved> {
  return {
    kind: "reference_resolution",
    version: "v1",
    refType: options.refType,
    input: options.input,
    source: options.source,
    status: "unresolved",
    matchedBy: null,
    ambiguous: false,
    resolved: null,
    candidates: [],
    unresolvedReason: {
      code: options.code,
      message: options.message,
    },
  }
}

export async function resolveIssueReference(
  input?: string,
): Promise<ReferenceResolutionPayload<ResolvedIssueReference>> {
  let identifier: string | undefined
  let source: ReferenceResolutionSource = "argument"

  if (input != null) {
    if (isValidLinearIdentifier(input)) {
      identifier = formatIssueIdentifier(input)
    } else if (isPositiveIntegerString(input)) {
      const teamKey = getTeamKey()
      if (teamKey == null) {
        return buildUnresolvedPayload({
          refType: "issue",
          input,
          source,
          code: "missing_context",
          message:
            "A numeric issue reference needs a configured team key. Set LINEAR_TEAM_ID or pass a full issue identifier like ENG-123.",
        })
      }

      identifier = `${teamKey}-${input}`
    } else {
      throw new ValidationError(
        `Could not resolve issue identifier: ${input}`,
        {
          suggestion:
            "Use a full issue identifier like ENG-123 or a numeric issue id with a configured LINEAR_TEAM_ID.",
        },
      )
    }
  } else {
    identifier = await getCurrentIssueFromVcs() ?? undefined
    source = "current_issue_context"
    if (identifier == null) {
      return buildUnresolvedPayload({
        refType: "issue",
        input: null,
        source,
        code: "missing_context",
        message:
          "No issue reference was provided and no current issue could be inferred from VCS context.",
      })
    }
  }

  const client = getGraphQLClient()
  const result = await client.request(ResolveIssueReferenceQuery, {
    id: identifier,
  })

  if (result.issue == null) {
    return buildUnresolvedPayload({
      refType: "issue",
      input: input ?? null,
      source,
      code: "not_found",
      message: `Issue not found: ${identifier}`,
    })
  }

  return buildResolvedPayload({
    refType: "issue",
    input: input ?? null,
    source,
    matchedBy: input == null
      ? "current_issue_context"
      : isPositiveIntegerString(input)
      ? "numeric_with_configured_team"
      : "identifier",
    resolved: result.issue,
  })
}

export async function resolveTeamReference(
  input?: string,
): Promise<ReferenceResolutionPayload<ResolvedTeamReference>> {
  const source: ReferenceResolutionSource = input == null
    ? "configured_team_context"
    : "argument"
  const resolvedInput = input ?? getTeamKey()
  const teamKey = resolvedInput == null
    ? undefined
    : isUuid(resolvedInput)
    ? resolvedInput
    : resolvedInput.toUpperCase()

  if (teamKey == null) {
    return buildUnresolvedPayload({
      refType: "team",
      input: null,
      source,
      code: "missing_context",
      message:
        "No team key was provided and no configured LINEAR_TEAM_ID is available.",
    })
  }

  const client = getGraphQLClient()
  const result = await client.request(ResolveTeamReferenceQuery, {
    id: teamKey,
  })

  if (result.team == null) {
    return buildUnresolvedPayload({
      refType: "team",
      input: input ?? null,
      source,
      code: "not_found",
      message: `Team not found: ${teamKey}`,
    })
  }

  return buildResolvedPayload({
    refType: "team",
    input: input ?? null,
    source,
    matchedBy: "team_key",
    resolved: result.team,
  })
}

export async function resolveWorkflowStateReference(
  input: string,
  teamInput?: string,
): Promise<ReferenceResolutionPayload<ResolvedWorkflowStateReference>> {
  const teamResolution = await resolveTeamReference(teamInput)
  const source: ReferenceResolutionSource = "argument"

  if (
    teamResolution.status === "unresolved" || teamResolution.resolved == null
  ) {
    return buildUnresolvedPayload({
      refType: "workflow_state",
      input,
      source,
      code: teamResolution.unresolvedReason?.code ?? "missing_context",
      message: teamResolution.unresolvedReason?.message ??
        "A team context is required to resolve workflow states.",
    })
  }

  return await resolveWorkflowStateReferenceForTeam(
    input,
    teamResolution.resolved,
  )
}

async function resolveWorkflowStateReferenceForTeam(
  input: string,
  team: ResolvedTeamReference,
): Promise<ReferenceResolutionPayload<ResolvedWorkflowStateReference>> {
  const source: ReferenceResolutionSource = "argument"

  if (isUuid(input)) {
    const states = await getWorkflowStates(team.key)
    const directMatch = states.find((state) => state.id === input)
    if (directMatch != null) {
      return buildResolvedPayload({
        refType: "workflow_state",
        input,
        source,
        matchedBy: "workflow_state_id",
        resolved: directMatch,
      })
    }
  }

  const states = await getWorkflowStates(team.key)
  const exactNameMatches = states.filter((state) =>
    state.name.toLowerCase() === input.toLowerCase()
  )

  if (exactNameMatches.length > 0) {
    return buildResolvedPayload({
      refType: "workflow_state",
      input,
      source,
      matchedBy: "state_name",
      resolved: exactNameMatches[0],
      candidates: exactNameMatches,
    })
  }

  const typeMatches = states.filter((state) =>
    state.type === input.toLowerCase()
  )
  if (typeMatches.length > 0) {
    return buildResolvedPayload({
      refType: "workflow_state",
      input,
      source,
      matchedBy: "state_type",
      resolved: typeMatches[0],
      candidates: typeMatches,
    })
  }

  return buildUnresolvedPayload({
    refType: "workflow_state",
    input,
    source,
    code: "not_found",
    message: `Workflow state not found for team ${team.key}: ${input}`,
  })
}

export async function resolveUserReference(
  input: string,
): Promise<ReferenceResolutionPayload<ResolvedUserReference>> {
  const client = getGraphQLClient()

  if (input === "self" || input === "@me") {
    const result = await client.request(ResolveViewerReferenceQuery, {})
    return buildResolvedPayload({
      refType: "user",
      input,
      source: "argument",
      matchedBy: "viewer",
      resolved: result.viewer,
    })
  }

  const result = await client.request(ResolveUserReferenceQuery, { input })
  const users = result.users?.nodes ?? []

  if (users.length === 0) {
    return buildUnresolvedPayload({
      refType: "user",
      input,
      source: "argument",
      code: "not_found",
      message: `User not found: ${input}`,
    })
  }

  const exactEmailMatches = users.filter((user) =>
    user.email?.toLowerCase() === input.toLowerCase()
  )
  if (exactEmailMatches.length > 0) {
    return buildResolvedPayload({
      refType: "user",
      input,
      source: "argument",
      matchedBy: "email",
      resolved: exactEmailMatches[0],
      candidates: exactEmailMatches,
    })
  }

  const exactDisplayNameMatches = users.filter((user) =>
    user.displayName.toLowerCase() === input.toLowerCase()
  )
  if (exactDisplayNameMatches.length > 0) {
    return buildResolvedPayload({
      refType: "user",
      input,
      source: "argument",
      matchedBy: "display_name",
      resolved: exactDisplayNameMatches[0],
      candidates: exactDisplayNameMatches,
    })
  }

  return buildResolvedPayload({
    refType: "user",
    input,
    source: "argument",
    matchedBy: "name_contains_first",
    resolved: users[0],
    candidates: users,
  })
}

export async function resolveProjectReference(
  input: string,
): Promise<ReferenceResolutionPayload<ResolvedProjectReference>> {
  const client = getGraphQLClient()

  if (isUuid(input)) {
    const result = await client.request(ResolveProjectReferenceByIdQuery, {
      id: input,
    })

    if (result.project == null) {
      return buildUnresolvedPayload({
        refType: "project",
        input,
        source: "argument",
        code: "not_found",
        message: `Project not found: ${input}`,
      })
    }

    return buildResolvedPayload({
      refType: "project",
      input,
      source: "argument",
      matchedBy: "project_id",
      resolved: result.project,
    })
  }

  const result = await client.request(ResolveProjectReferenceBySlugQuery, {
    slugId: input,
  })
  const projects = result.projects?.nodes ?? []

  if (projects.length === 0) {
    return buildUnresolvedPayload({
      refType: "project",
      input,
      source: "argument",
      code: "not_found",
      message: `Project not found: ${input}`,
    })
  }

  return buildResolvedPayload({
    refType: "project",
    input,
    source: "argument",
    matchedBy: "project_slug",
    resolved: projects[0],
    candidates: projects,
  })
}

export async function resolveIssueLabelReference(
  input: string,
  teamInput?: string,
): Promise<ReferenceResolutionPayload<ResolvedLabelReference>> {
  const teamResolution = await resolveTeamReference(teamInput)
  const source: ReferenceResolutionSource = "argument"

  if (
    teamResolution.status === "unresolved" || teamResolution.resolved == null
  ) {
    return buildUnresolvedPayload({
      refType: "label",
      input,
      source,
      code: teamResolution.unresolvedReason?.code ?? "missing_context",
      message: teamResolution.unresolvedReason?.message ??
        "A team context is required to resolve issue labels.",
    })
  }

  return await resolveIssueLabelReferenceForTeam(input, teamResolution.resolved)
}

async function resolveIssueLabelReferenceForTeam(
  input: string,
  team: ResolvedTeamReference,
): Promise<ReferenceResolutionPayload<ResolvedLabelReference>> {
  const source: ReferenceResolutionSource = "argument"
  const client = getGraphQLClient()
  const result = await client.request(ResolveIssueLabelReferenceQuery, {
    name: input,
    teamKey: team.key,
  })
  const labels = result.issueLabels?.nodes ?? []

  if (labels.length === 0) {
    return buildUnresolvedPayload({
      refType: "label",
      input,
      source,
      code: "not_found",
      message: `Label not found for team ${team.key}: ${input}`,
    })
  }

  return buildResolvedPayload({
    refType: "label",
    input,
    source,
    matchedBy: "label_name",
    resolved: {
      ...labels[0],
      team: labels[0].team ?? null,
    },
    candidates: labels.map((label) => ({
      ...label,
      team: label.team ?? null,
    })),
  })
}

function buildTeamScopedUnresolvedPayload<
  TResolved extends
    | ResolvedWorkflowStateReference
    | ResolvedLabelReference,
>(
  refType: "workflow_state" | "label",
  input: string,
  reason: ReferenceResolutionReason,
): ReferenceResolutionPayload<TResolved> {
  return buildUnresolvedPayload({
    refType,
    input,
    source: "argument",
    code: reason.code,
    message: reason.message,
  })
}

function buildContextPackTeamContext(
  options: {
    source: ContextPackTeamContextSource
    input: string | null
    resolved: ResolvedTeamReference | null
    unresolvedReason?: ReferenceResolutionReason | null
  },
): ContextPackTeamContext {
  return {
    source: options.source,
    input: options.input,
    resolved: options.resolved,
    unresolvedReason: options.unresolvedReason ?? null,
  }
}

export async function resolveContextPack(
  input: ResolveContextPackInput,
): Promise<ContextPackResolutionPayload> {
  const labels = input.labels ?? []
  const requested: ContextPackRequest = {
    issue: input.issue ?? null,
    team: input.team ?? null,
    workflowState: input.workflowState ?? null,
    user: input.user ?? null,
    project: input.project ?? null,
    labels,
  }

  const requestedCount = [
    requested.issue,
    requested.team,
    requested.workflowState,
    requested.user,
    requested.project,
  ].filter((value) => value != null).length + requested.labels.length

  if (requestedCount === 0) {
    throw new ValidationError(
      "At least one reference is required to build a context pack.",
      {
        suggestion:
          "Pass one or more of --issue, --team, --workflow-state, --user, --project, or --label.",
      },
    )
  }

  const entities: ContextPackEntities = {
    issue: null,
    team: null,
    workflowState: null,
    user: null,
    project: null,
    labels: [],
  }

  if (requested.issue != null) {
    entities.issue = await resolveIssueReference(requested.issue)
  }
  if (requested.team != null) {
    entities.team = await resolveTeamReference(requested.team)
  }
  if (requested.user != null) {
    entities.user = await resolveUserReference(requested.user)
  }
  if (requested.project != null) {
    entities.project = await resolveProjectReference(requested.project)
  }

  let teamContext = buildContextPackTeamContext({
    source: "none",
    input: null,
    resolved: null,
  })

  if (requested.team != null) {
    teamContext = buildContextPackTeamContext({
      source: "explicit_team_argument",
      input: requested.team,
      resolved: entities.team?.resolved ?? null,
      unresolvedReason: entities.team?.unresolvedReason ?? null,
    })
  } else if (
    entities.issue?.status === "resolved" && entities.issue.resolved != null
  ) {
    teamContext = buildContextPackTeamContext({
      source: "resolved_issue_team",
      input: entities.issue.resolved.team.key,
      resolved: entities.issue.resolved.team,
    })
  } else if (requested.workflowState != null || requested.labels.length > 0) {
    const configuredTeam = await resolveTeamReference()
    teamContext = buildContextPackTeamContext({
      source: "configured_team_context",
      input: null,
      resolved: configuredTeam.resolved,
      unresolvedReason: configuredTeam.unresolvedReason,
    })
  }

  if (requested.workflowState != null) {
    if (teamContext.resolved != null) {
      entities.workflowState = await resolveWorkflowStateReferenceForTeam(
        requested.workflowState,
        teamContext.resolved,
      )
    } else {
      const unresolvedReason = teamContext.unresolvedReason ?? {
        code: "missing_context" as const,
        message: "A team context is required to resolve workflow states.",
      }
      entities.workflowState = buildTeamScopedUnresolvedPayload(
        "workflow_state",
        requested.workflowState,
        unresolvedReason,
      )
    }
  }

  if (requested.labels.length > 0) {
    for (const label of requested.labels) {
      if (teamContext.resolved != null) {
        entities.labels.push(
          await resolveIssueLabelReferenceForTeam(label, teamContext.resolved),
        )
      } else {
        const unresolvedReason = teamContext.unresolvedReason ?? {
          code: "missing_context" as const,
          message: "A team context is required to resolve issue labels.",
        }
        entities.labels.push(
          buildTeamScopedUnresolvedPayload("label", label, unresolvedReason),
        )
      }
    }
  }

  const payloads: AnyReferenceResolutionPayload[] = []
  for (
    const payload of [
      entities.issue,
      entities.team,
      entities.workflowState,
      entities.user,
      entities.project,
    ]
  ) {
    if (payload != null) {
      payloads.push(payload)
    }
  }
  for (const label of entities.labels) {
    payloads.push(label)
  }

  const resolvedCount =
    payloads.filter((payload) => payload.status === "resolved")
      .length
  const unresolvedCount = payloads.length - resolvedCount
  const ambiguousCount = payloads.filter((payload) => payload.ambiguous).length

  const status: ContextPackResolutionStatus = unresolvedCount === 0
    ? "resolved"
    : resolvedCount === 0
    ? "unresolved"
    : "partially_resolved"

  return {
    kind: "context_pack_resolution",
    version: "v1",
    requested,
    status,
    teamContext,
    entities,
    summary: {
      requestedCount,
      resolvedCount,
      unresolvedCount,
      ambiguousCount,
    },
  }
}

function formatCandidateSummary(
  refType: ReferenceResolutionType,
  candidate: AnyResolvedReference,
): string {
  switch (refType) {
    case "issue": {
      const issue = candidate as ResolvedIssueReference
      return `${issue.identifier} (${issue.id})`
    }
    case "team": {
      const team = candidate as ResolvedTeamReference
      return `${team.key} (${team.id})`
    }
    case "workflow_state": {
      const state = candidate as ResolvedWorkflowStateReference
      return `${state.name} [${state.type}] (${state.id})`
    }
    case "user": {
      const user = candidate as ResolvedUserReference
      return `${user.displayName} <${user.email ?? "no-email"}> (${user.id})`
    }
    case "project": {
      const project = candidate as ResolvedProjectReference
      return `${project.name} (${project.slugId})`
    }
    case "label": {
      const label = candidate as ResolvedLabelReference
      return `${label.name} (${label.team?.key ?? "workspace"})`
    }
  }
}

export function printReferenceResolution(
  payload: AnyReferenceResolutionPayload,
): void {
  if (payload.status === "unresolved" || payload.resolved == null) {
    console.log(
      `${yellow("!")} ${
        payload.unresolvedReason?.message ?? "Reference could not be resolved."
      }`,
    )
    return
  }

  console.log(
    `Resolved ${payload.refType}: ${
      formatCandidateSummary(payload.refType, payload.resolved)
    }`,
  )

  if (payload.ambiguous && payload.candidates.length > 1) {
    console.log(
      gray(
        `Runtime would currently use ${payload.matchedBy}; additional candidates:`,
      ),
    )
    for (const candidate of payload.candidates.slice(1)) {
      console.log(
        gray(`- ${formatCandidateSummary(payload.refType, candidate)}`),
      )
    }
  }
}

export function printContextPackResolution(
  payload: ContextPackResolutionPayload,
): void {
  console.log(
    `Context pack: ${payload.summary.resolvedCount}/${payload.summary.requestedCount} resolved`,
  )

  if (payload.teamContext.source !== "none") {
    if (payload.teamContext.resolved != null) {
      console.log(
        gray(
          `Team context (${payload.teamContext.source}): ${payload.teamContext.resolved.key} (${payload.teamContext.resolved.id})`,
        ),
      )
    } else if (payload.teamContext.unresolvedReason != null) {
      console.log(
        gray(
          `Team context (${payload.teamContext.source}): ${payload.teamContext.unresolvedReason.message}`,
        ),
      )
    }
  }

  for (
    const resolution of [
      payload.entities.issue,
      payload.entities.team,
      payload.entities.workflowState,
      payload.entities.user,
      payload.entities.project,
    ]
  ) {
    if (resolution != null) {
      printReferenceResolution(resolution)
    }
  }

  for (const label of payload.entities.labels) {
    printReferenceResolution(label)
  }
}
