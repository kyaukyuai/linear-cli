type InitiativeOwnerLike = {
  id: string
  name?: string | null
  displayName?: string | null
  initials?: string | null
}

type InitiativeProjectLike = {
  id: string
  slugId?: string | null
  name: string
  status?: {
    name?: string | null
    type?: string | null
  } | null
}

type InitiativeLike = {
  id: string
  slugId: string
  name: string
  description?: string | null
  status: string
  targetDate?: string | null
  health?: string | null
  color?: string | null
  icon?: string | null
  url: string
  archivedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  owner?: InitiativeOwnerLike | null
  projects?: {
    nodes: InitiativeProjectLike[]
  } | null
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") {
    return null
  }
  return value
}

function buildInitiativeOwnerPayload(
  owner: InitiativeOwnerLike | null | undefined,
) {
  if (owner == null) {
    return null
  }

  return {
    id: owner.id,
    name: owner.name ?? null,
    displayName: owner.displayName ?? null,
    initials: owner.initials ?? null,
  }
}

export function buildInitiativeListJsonPayload(initiative: InitiativeLike) {
  return {
    id: initiative.id,
    slugId: initiative.slugId,
    name: initiative.name,
    description: normalizeOptionalText(initiative.description),
    status: initiative.status,
    targetDate: initiative.targetDate ?? null,
    health: initiative.health ?? null,
    color: initiative.color ?? null,
    icon: initiative.icon ?? null,
    url: initiative.url,
    archivedAt: initiative.archivedAt ?? null,
    owner: buildInitiativeOwnerPayload(initiative.owner),
    projectCount: initiative.projects?.nodes.length ?? 0,
  }
}

export function buildInitiativeDetailJsonPayload(initiative: InitiativeLike) {
  return {
    ...buildInitiativeListJsonPayload(initiative),
    createdAt: initiative.createdAt ?? null,
    updatedAt: initiative.updatedAt ?? null,
    projects: (initiative.projects?.nodes ?? []).map((project) => ({
      id: project.id,
      slugId: project.slugId ?? null,
      name: project.name,
      status: {
        name: project.status?.name ?? null,
        type: project.status?.type ?? null,
      },
    })),
  }
}
