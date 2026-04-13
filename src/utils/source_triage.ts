import type { ExternalContextEnvelope } from "./external_context.ts"
import {
  fetchIssueDetails,
  getAllTeams,
  getIssueId,
  getIssueIdentifier,
  getLabelsForTeam,
  getWorkflowStates,
} from "./linear.ts"

type TriageDecisionStatus = "not_provided" | "resolved" | "unresolved"
type TriageCandidateStatus = "resolved" | "unresolved"

type ResolvedTeam = {
  id: string
  key: string
  name: string
}

type ResolvedState = {
  id: string
  name: string
  type: string
  color: string
}

type ResolvedLabel = {
  id: string
  name: string
  color: string
}

type ResolvedIssueCandidate = {
  id: string
  identifier: string
  title: string
  url: string
  state: {
    name: string
    color: string
  } | null
}

type TriageTeamDecision = {
  requested: string | null
  status: TriageDecisionStatus
  resolved: ResolvedTeam | null
  applied: boolean
  reason: string | null
}

type TriageStateDecision = {
  requested: string | null
  status: TriageDecisionStatus
  resolved: ResolvedState | null
  applied: boolean
  reason: string | null
}

type TriageLabelDecision = {
  requested: string
  status: TriageCandidateStatus
  resolved: ResolvedLabel | null
  applied: boolean
  reason: string | null
}

type TriageIssueCandidate = {
  requested: string
  status: TriageCandidateStatus
  resolved: ResolvedIssueCandidate | null
  reason: string | null
}

export type SourceTriageContract = {
  family: "source_intake_triage"
  version: "v1"
  target: "issue.create" | "issue.update"
  applyRequested: boolean
  appliedChanges: string[]
  suggestions: {
    team: TriageTeamDecision
    state: TriageStateDecision
    labels: TriageLabelDecision[]
    duplicateCandidates: TriageIssueCandidate[]
    relatedIssues: TriageIssueCandidate[]
  }
}

export type SourceTriageResult = {
  triage: SourceTriageContract
  resolved: {
    team: ResolvedTeam | null
    state: ResolvedState | null
    labels: ResolvedLabel[]
  }
}

function toLower(value: string): string {
  return value.toLowerCase()
}

async function resolveTeamSuggestion(
  requested: string | null,
): Promise<
  {
    status: TriageDecisionStatus
    resolved: ResolvedTeam | null
    reason: string | null
  }
> {
  if (requested == null) {
    return { status: "not_provided", resolved: null, reason: null }
  }

  const teams = await getAllTeams()
  const exactKey = teams.find((team) =>
    toLower(team.key) === toLower(requested)
  )
  const exactName = teams.find((team) =>
    toLower(team.name) === toLower(requested)
  )
  const resolved = exactKey ?? exactName ?? null

  if (resolved == null) {
    return {
      status: "unresolved",
      resolved: null,
      reason: `No team matched triage hint: ${requested}`,
    }
  }

  return { status: "resolved", resolved, reason: null }
}

async function resolveStateSuggestion(
  requested: string | null,
  teamKey: string | null,
): Promise<
  {
    status: TriageDecisionStatus
    resolved: ResolvedState | null
    reason: string | null
  }
> {
  if (requested == null) {
    return { status: "not_provided", resolved: null, reason: null }
  }

  if (teamKey == null) {
    return {
      status: "unresolved",
      resolved: null,
      reason: "Team context is required to resolve triage state hints.",
    }
  }

  const states = await getWorkflowStates(teamKey)
  const nameMatch = states.find((state) =>
    toLower(state.name) === toLower(requested)
  )
  const typeMatch = states.find((state) =>
    toLower(state.type) === toLower(requested)
  )
  const resolved = nameMatch ?? typeMatch ?? null

  if (resolved == null) {
    return {
      status: "unresolved",
      resolved: null,
      reason:
        `No workflow state matched triage hint '${requested}' for team ${teamKey}.`,
    }
  }

  return {
    status: "resolved",
    resolved: {
      id: resolved.id,
      name: resolved.name,
      type: resolved.type,
      color: resolved.color,
    },
    reason: null,
  }
}

async function resolveLabelSuggestions(
  requested: string[],
  teamKey: string | null,
): Promise<TriageLabelDecision[]> {
  if (requested.length === 0) {
    return []
  }

  if (teamKey == null) {
    return requested.map((name) => ({
      requested: name,
      status: "unresolved" as const,
      resolved: null,
      applied: false,
      reason: "Team context is required to resolve triage label hints.",
    }))
  }

  const labels = await getLabelsForTeam(teamKey)
  return requested.map((name) => {
    const resolved = labels.find((label) =>
      toLower(label.name) === toLower(name)
    ) ?? null

    if (resolved == null) {
      return {
        requested: name,
        status: "unresolved" as const,
        resolved: null,
        applied: false,
        reason: `No label matched triage hint '${name}' for team ${teamKey}.`,
      }
    }

    return {
      requested: name,
      status: "resolved" as const,
      resolved,
      applied: false,
      reason: null,
    }
  })
}

async function resolveIssueCandidates(
  requested: string[],
): Promise<TriageIssueCandidate[]> {
  const candidates: TriageIssueCandidate[] = []

  for (const rawRef of requested) {
    try {
      const identifier = await getIssueIdentifier(rawRef)
      if (identifier == null) {
        candidates.push({
          requested: rawRef,
          status: "unresolved",
          resolved: null,
          reason: `Could not resolve triage issue reference: ${rawRef}`,
        })
        continue
      }

      const issueId = await getIssueId(identifier)
      if (issueId == null) {
        candidates.push({
          requested: rawRef,
          status: "unresolved",
          resolved: null,
          reason: `Issue not found for triage hint: ${identifier}`,
        })
        continue
      }

      const issue = await fetchIssueDetails(identifier, false, false)
      candidates.push({
        requested: rawRef,
        status: "resolved",
        resolved: {
          id: issue.id,
          identifier: issue.identifier,
          title: issue.title,
          url: issue.url,
          state: issue.state ?? null,
        },
        reason: null,
      })
    } catch (error) {
      candidates.push({
        requested: rawRef,
        status: "unresolved",
        resolved: null,
        reason: error instanceof Error
          ? error.message
          : `Failed to resolve triage issue reference: ${rawRef}`,
      })
    }
  }

  return candidates
}

export async function buildSourceTriageContract(options: {
  context: ExternalContextEnvelope
  target: "issue.create" | "issue.update"
  applyRequested: boolean
  fallbackTeamKey?: string | null
  preferTriageTeamForResolution?: boolean
  explicitTeam?: string | null
  explicitState?: string | null
  explicitLabels?: string[] | null
  supportsTeamApply?: boolean
}): Promise<SourceTriageResult | null> {
  const triageInput = options.context.triage
  if (triageInput == null) {
    return null
  }

  const teamSuggestion = await resolveTeamSuggestion(triageInput.team)
  const resolutionTeamKey = options.preferTriageTeamForResolution === false
    ? options.fallbackTeamKey ?? teamSuggestion.resolved?.key ?? null
    : teamSuggestion.resolved?.key ?? options.fallbackTeamKey ?? null

  const [
    stateSuggestion,
    labelSuggestions,
    duplicateCandidates,
    relatedIssues,
  ] = await Promise.all([
    resolveStateSuggestion(triageInput.state, resolutionTeamKey),
    resolveLabelSuggestions(triageInput.labels, resolutionTeamKey),
    resolveIssueCandidates(triageInput.duplicateIssueRefs),
    resolveIssueCandidates(triageInput.relatedIssueRefs),
  ])

  const explicitLabelNames = new Set(
    (options.explicitLabels ?? []).map((name) => toLower(name)),
  )

  const teamApplied = options.applyRequested &&
    (options.supportsTeamApply ?? true) &&
    options.explicitTeam == null &&
    teamSuggestion.status === "resolved"
  const stateApplied = options.applyRequested &&
    options.explicitState == null &&
    stateSuggestion.status === "resolved"

  const labelsWithApply = labelSuggestions.map((label) => {
    if (!options.applyRequested) {
      return {
        ...label,
        reason: label.reason ?? "Pass --apply-triage to apply this suggestion.",
      }
    }

    if (label.status !== "resolved" || label.resolved == null) {
      return label
    }

    const resolvedLabel = label.resolved

    if (explicitLabelNames.has(toLower(resolvedLabel.name))) {
      return {
        ...label,
        applied: false,
        reason: "Explicit label input already covers this triage suggestion.",
      }
    }

    return {
      ...label,
      applied: true,
      reason: null,
    }
  })

  const teamReason = (() => {
    if (teamSuggestion.status === "not_provided") {
      return null
    }
    if (teamSuggestion.status === "unresolved") {
      return teamSuggestion.reason
    }
    if (options.explicitTeam != null) {
      return "Explicit --team overrides the triage team suggestion."
    }
    if (!(options.supportsTeamApply ?? true)) {
      return "This command previews team routing but does not apply it."
    }
    if (!options.applyRequested) {
      return "Pass --apply-triage to apply this suggestion."
    }
    return null
  })()

  const stateReason = (() => {
    if (stateSuggestion.status === "not_provided") {
      return null
    }
    if (stateSuggestion.status === "unresolved") {
      return stateSuggestion.reason
    }
    if (options.explicitState != null) {
      return "Explicit --state overrides the triage workflow state suggestion."
    }
    if (!options.applyRequested) {
      return "Pass --apply-triage to apply this suggestion."
    }
    return null
  })()

  const appliedChanges = [
    ...(teamApplied ? ["team"] : []),
    ...(stateApplied ? ["state"] : []),
    ...(labelsWithApply.some((label) => label.applied) ? ["labels"] : []),
  ]

  return {
    triage: {
      family: "source_intake_triage",
      version: "v1",
      target: options.target,
      applyRequested: options.applyRequested,
      appliedChanges,
      suggestions: {
        team: {
          requested: triageInput.team,
          status: teamSuggestion.status,
          resolved: teamSuggestion.resolved,
          applied: teamApplied,
          reason: teamReason,
        },
        state: {
          requested: triageInput.state,
          status: stateSuggestion.status,
          resolved: stateSuggestion.resolved,
          applied: stateApplied,
          reason: stateReason,
        },
        labels: labelsWithApply,
        duplicateCandidates,
        relatedIssues,
      },
    },
    resolved: {
      team: teamSuggestion.resolved,
      state: stateSuggestion.resolved,
      labels: labelsWithApply.flatMap((label) =>
        label.resolved != null ? [label.resolved] : []
      ),
    },
  }
}
