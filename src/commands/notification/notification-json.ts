type NotificationActorLike = {
  name: string
  displayName?: string | null
}

type NotificationLike = {
  id: string
  type: string
  title: string
  subtitle?: string | null
  url?: string | null
  inboxUrl?: string | null
  createdAt: string
  readAt?: string | null
  archivedAt?: string | null
  snoozedUntilAt?: string | null
  actor?: NotificationActorLike | null
}

function buildNotificationActorPayload(
  actor: NotificationActorLike | null | undefined,
) {
  if (actor == null) {
    return null
  }

  return {
    name: actor.name,
    displayName: actor.displayName ?? null,
  }
}

export function getNotificationStatus(notification: {
  readAt?: string | null
  archivedAt?: string | null
  snoozedUntilAt?: string | null
}): string {
  if (notification.archivedAt != null) {
    return "archived"
  }
  if (notification.snoozedUntilAt != null) {
    return "snoozed"
  }
  if (notification.readAt != null) {
    return "read"
  }
  return "unread"
}

export function getNotificationActorName(notification: {
  actor?: NotificationActorLike | null
}): string | null {
  return notification.actor?.displayName || notification.actor?.name || null
}

export function buildNotificationJsonPayload(notification: NotificationLike) {
  return {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    subtitle: notification.subtitle ?? null,
    status: getNotificationStatus(notification),
    actor: buildNotificationActorPayload(notification.actor),
    createdAt: notification.createdAt,
    readAt: notification.readAt ?? null,
    archivedAt: notification.archivedAt ?? null,
    snoozedUntilAt: notification.snoozedUntilAt ?? null,
    url: notification.url ?? null,
    inboxUrl: notification.inboxUrl ?? null,
  }
}
