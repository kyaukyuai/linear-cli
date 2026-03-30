type ProjectUpdateAuthorLike = {
  name?: string | null
  displayName?: string | null
}

type ProjectUpdateLike = {
  id: string
  body?: string | null
  health?: string | null
  url: string
  createdAt: string
  user?: ProjectUpdateAuthorLike | null
}

type ProjectUpdateProjectLike = {
  id?: string | null
  name: string
  slugId: string
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") {
    return null
  }
  return value
}

function buildProjectUpdateAuthorPayload(
  user: ProjectUpdateAuthorLike | null | undefined,
) {
  if (user == null) {
    return null
  }

  return {
    name: user.name ?? null,
    displayName: user.displayName ?? null,
  }
}

export function buildProjectUpdateJsonPayload(update: ProjectUpdateLike) {
  return {
    id: update.id,
    body: normalizeOptionalText(update.body),
    health: update.health ?? null,
    url: update.url,
    createdAt: update.createdAt,
    author: buildProjectUpdateAuthorPayload(update.user),
  }
}

export function buildProjectUpdateListJsonPayload(
  project: ProjectUpdateProjectLike,
  updates: ProjectUpdateLike[],
) {
  return {
    project: {
      id: project.id ?? null,
      name: project.name,
      slugId: project.slugId,
    },
    updates: updates.map(buildProjectUpdateJsonPayload),
  }
}
