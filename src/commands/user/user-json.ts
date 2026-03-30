type UserOrganizationLike = {
  name: string
  urlKey: string
}

type UserLike = {
  id: string
  name: string
  displayName: string
  email: string
  active: boolean
  guest: boolean
  app: boolean
  isAssignable: boolean
  isMentionable: boolean
  description?: string | null
  statusEmoji?: string | null
  statusLabel?: string | null
  timezone?: string | null
  lastSeen?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  archivedAt?: string | null
  url?: string | null
  organization?: UserOrganizationLike | null
}

export function buildUserListJsonPayload(user: UserLike) {
  return {
    id: user.id,
    name: user.name,
    displayName: user.displayName,
    email: user.email,
    active: user.active,
    guest: user.guest,
    app: user.app,
    isAssignable: user.isAssignable,
    isMentionable: user.isMentionable,
    description: user.description ?? null,
    statusEmoji: user.statusEmoji ?? null,
    statusLabel: user.statusLabel ?? null,
    timezone: user.timezone ?? null,
  }
}

export function buildUserDetailJsonPayload(user: UserLike) {
  return {
    ...buildUserListJsonPayload(user),
    lastSeen: user.lastSeen ?? null,
    createdAt: user.createdAt ?? null,
    updatedAt: user.updatedAt ?? null,
    archivedAt: user.archivedAt ?? null,
    url: user.url ?? null,
    organization: user.organization
      ? {
        name: user.organization.name,
        urlKey: user.organization.urlKey,
      }
      : null,
  }
}
