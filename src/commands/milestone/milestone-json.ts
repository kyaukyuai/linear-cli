type MilestoneStateLike = {
  name: string
  type?: string | null
  color?: string | null
}

type MilestoneIssueLike = {
  id: string
  identifier: string
  title: string
  state: MilestoneStateLike
}

type MilestoneProjectLike = {
  id: string
  name: string
  slugId: string
  url: string
}

type MilestoneLike = {
  id: string
  name: string
  description?: string | null
  targetDate?: string | null
  sortOrder: number
  createdAt?: string | null
  updatedAt?: string | null
  project: MilestoneProjectLike
  issues?: {
    nodes: MilestoneIssueLike[]
  } | null
}

type MilestoneIssueSummary = {
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

function buildMilestoneProjectPayload(project: MilestoneProjectLike) {
  return {
    id: project.id,
    name: project.name,
    slugId: project.slugId,
    url: project.url,
  }
}

function buildMilestoneIssueSummary(
  issues: MilestoneIssueLike[],
): MilestoneIssueSummary {
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

function buildMilestoneIssuePayload(issue: MilestoneIssueLike) {
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

export function buildMilestoneListJsonPayload(milestone: MilestoneLike) {
  return {
    id: milestone.id,
    name: milestone.name,
    description: normalizeOptionalText(milestone.description),
    targetDate: milestone.targetDate ?? null,
    sortOrder: milestone.sortOrder,
    createdAt: milestone.createdAt ?? null,
    updatedAt: milestone.updatedAt ?? null,
    project: buildMilestoneProjectPayload(milestone.project),
  }
}

export function buildMilestoneDetailJsonPayload(milestone: MilestoneLike) {
  const issues = milestone.issues?.nodes ?? []

  return {
    ...buildMilestoneListJsonPayload(milestone),
    issueSummary: buildMilestoneIssueSummary(issues),
    issues: issues.map(buildMilestoneIssuePayload),
  }
}
