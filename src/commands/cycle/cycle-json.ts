type CycleStatus = "active" | "upcoming" | "completed" | "past" | "unknown"

type CycleStateLike = {
  name: string
  type?: string | null
  color?: string | null
}

type CycleIssueLike = {
  id: string
  identifier: string
  title: string
  state: CycleStateLike
}

type CycleTeamLike = {
  id: string
  key: string
  name: string
}

type CycleLike = {
  id: string
  number: number
  name?: string | null
  description?: string | null
  startsAt: string
  endsAt: string
  completedAt?: string | null
  isActive: boolean
  isFuture: boolean
  isPast: boolean
  createdAt?: string | null
  updatedAt?: string | null
  progress?: number | null
  issues?: {
    nodes: CycleIssueLike[]
  } | null
}

type CycleIssueSummary = {
  total: number
  completed: number
  started: number
  unstarted: number
  backlog: number
  triage: number
  canceled: number
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") {
    return null
  }
  return value
}

export function getCycleStatus(cycle: {
  isActive: boolean
  isFuture: boolean
  isPast: boolean
  completedAt?: string | null
}): CycleStatus {
  if (cycle.isActive) return "active"
  if (cycle.isFuture) return "upcoming"
  if (cycle.completedAt != null) return "completed"
  if (cycle.isPast) return "past"
  return "unknown"
}

export function getCycleStatusLabel(status: CycleStatus): string {
  switch (status) {
    case "active":
      return "Active"
    case "upcoming":
      return "Upcoming"
    case "completed":
      return "Completed"
    case "past":
      return "Past"
    default:
      return "Unknown"
  }
}

function buildCycleIssueSummary(issues: CycleIssueLike[]): CycleIssueSummary {
  const issuesByState = issues.reduce((acc: Record<string, number>, issue) => {
    const stateType = issue.state.type
    if (stateType == null) {
      return acc
    }
    if (acc[stateType] == null) {
      acc[stateType] = 0
    }
    acc[stateType]++
    return acc
  }, {})

  return {
    total: issues.length,
    completed: issuesByState.completed || 0,
    started: issuesByState.started || 0,
    unstarted: issuesByState.unstarted || 0,
    backlog: issuesByState.backlog || 0,
    triage: issuesByState.triage || 0,
    canceled: issuesByState.canceled || 0,
  }
}

function buildCycleIssuePayload(issue: CycleIssueLike) {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    state: {
      name: issue.state.name,
      type: issue.state.type ?? null,
      color: issue.state.color ?? null,
    },
  }
}

export function buildCycleListJsonPayload(cycle: CycleLike) {
  return {
    id: cycle.id,
    number: cycle.number,
    name: cycle.name ?? `Cycle ${cycle.number}`,
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    completedAt: cycle.completedAt ?? null,
    status: getCycleStatus(cycle),
    isActive: cycle.isActive,
    isFuture: cycle.isFuture,
    isPast: cycle.isPast,
  }
}

export function buildCycleDetailJsonPayload(
  cycle: CycleLike,
  team: CycleTeamLike,
) {
  const issues = cycle.issues?.nodes ?? []

  return {
    id: cycle.id,
    number: cycle.number,
    name: cycle.name ?? `Cycle ${cycle.number}`,
    description: normalizeOptionalText(cycle.description),
    startsAt: cycle.startsAt,
    endsAt: cycle.endsAt,
    completedAt: cycle.completedAt ?? null,
    status: getCycleStatus(cycle),
    isActive: cycle.isActive,
    isFuture: cycle.isFuture,
    isPast: cycle.isPast,
    progress: cycle.progress ?? null,
    createdAt: cycle.createdAt ?? null,
    updatedAt: cycle.updatedAt ?? null,
    team: {
      id: team.id,
      key: team.key,
      name: team.name,
    },
    issueSummary: buildCycleIssueSummary(issues),
    issues: issues.map(buildCycleIssuePayload),
  }
}
