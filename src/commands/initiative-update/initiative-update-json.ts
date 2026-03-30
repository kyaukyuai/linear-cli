type InitiativeUpdateAuthorLike = {
  name?: string | null
}

type InitiativeUpdateLike = {
  id: string
  body?: string | null
  health?: string | null
  url: string
  createdAt: string
  user?: InitiativeUpdateAuthorLike | null
}

type InitiativeUpdateInitiativeLike = {
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

export function buildInitiativeUpdateJsonPayload(update: InitiativeUpdateLike) {
  return {
    id: update.id,
    body: normalizeOptionalText(update.body),
    health: update.health ?? null,
    url: update.url,
    createdAt: update.createdAt,
    author: update.user?.name ?? null,
  }
}

export function buildInitiativeUpdateListJsonPayload(
  initiative: InitiativeUpdateInitiativeLike,
  updates: InitiativeUpdateLike[],
) {
  return {
    initiative: {
      id: initiative.id ?? null,
      name: initiative.name,
      slugId: initiative.slugId,
    },
    updates: updates.map(buildInitiativeUpdateJsonPayload),
  }
}
