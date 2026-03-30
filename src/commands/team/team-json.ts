type TeamOrganizationLike = {
  id: string
  name: string
}

type TeamLike = {
  id: string
  name: string
  key: string
  description?: string | null
  icon?: string | null
  color?: string | null
  cyclesEnabled: boolean
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  organization?: TeamOrganizationLike | null
}

export function buildTeamJsonPayload(team: TeamLike) {
  return {
    id: team.id,
    name: team.name,
    key: team.key,
    description: team.description ?? null,
    icon: team.icon ?? null,
    color: team.color ?? null,
    cyclesEnabled: team.cyclesEnabled,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
    archivedAt: team.archivedAt ?? null,
    organization: team.organization
      ? {
        id: team.organization.id,
        name: team.organization.name,
      }
      : null,
  }
}
