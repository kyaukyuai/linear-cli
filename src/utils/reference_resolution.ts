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
  | ResolvedLabelReference

export type AnyReferenceResolutionPayload = ReferenceResolutionPayload<
  AnyResolvedReference
>

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

  if (isUuid(input)) {
    const states = await getWorkflowStates(teamResolution.resolved.key)
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

  const states = await getWorkflowStates(teamResolution.resolved.key)
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
    message:
      `Workflow state not found for team ${teamResolution.resolved.key}: ${input}`,
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

  const client = getGraphQLClient()
  const result = await client.request(ResolveIssueLabelReferenceQuery, {
    name: input,
    teamKey: teamResolution.resolved.key,
  })
  const labels = result.issueLabels?.nodes ?? []

  if (labels.length === 0) {
    return buildUnresolvedPayload({
      refType: "label",
      input,
      source,
      code: "not_found",
      message:
        `Label not found for team ${teamResolution.resolved.key}: ${input}`,
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
