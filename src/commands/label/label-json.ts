type IssueLabelTeamLike = {
  id: string
  key: string
  name: string
}

type IssueLabelLike = {
  id: string
  name: string
  description?: string | null
  color: string
  team?: IssueLabelTeamLike | null
}

type ProjectLabelParentLike = {
  id: string
  name: string
}

type ProjectLabelLike = {
  id: string
  name: string
  description?: string | null
  color: string
  isGroup: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  retiredAt?: string | null
  parent?: ProjectLabelParentLike | null
}

export function buildIssueLabelJsonPayload(label: IssueLabelLike) {
  return {
    id: label.id,
    name: label.name,
    description: label.description ?? null,
    color: label.color,
    team: label.team
      ? {
        id: label.team.id,
        key: label.team.key,
        name: label.team.name,
      }
      : null,
  }
}

export function buildProjectLabelJsonPayload(label: ProjectLabelLike) {
  return {
    id: label.id,
    name: label.name,
    description: label.description ?? null,
    color: label.color,
    isGroup: label.isGroup,
    createdAt: label.createdAt,
    updatedAt: label.updatedAt,
    archivedAt: label.archivedAt ?? null,
    retiredAt: label.retiredAt ?? null,
    parent: label.parent
      ? {
        id: label.parent.id,
        name: label.parent.name,
      }
      : null,
  }
}
