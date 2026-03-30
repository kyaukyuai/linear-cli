import {
  getWebhookDisplayLabel,
  getWebhookScope,
  getWebhookStatus,
} from "./webhook-utils.ts"

type WebhookTeamLike = {
  id: string
  key: string
  name: string
}

type WebhookCreatorLike = {
  id: string
  name: string
  displayName?: string | null
}

type WebhookLike = {
  id: string
  label?: string | null
  url?: string | null
  enabled: boolean
  archivedAt?: string | null
  allPublicTeams: boolean
  resourceTypes: string[]
  createdAt: string
  updatedAt: string
  team?: WebhookTeamLike | null
  creator?: WebhookCreatorLike | null
}

function buildWebhookTeamPayload(team: WebhookTeamLike | null | undefined) {
  if (team == null) {
    return null
  }

  return {
    id: team.id,
    key: team.key,
    name: team.name,
  }
}

function buildWebhookCreatorPayload(
  creator: WebhookCreatorLike | null | undefined,
) {
  if (creator == null) {
    return null
  }

  return {
    id: creator.id,
    name: creator.name,
    displayName: creator.displayName ?? null,
  }
}

export function buildWebhookJsonPayload(webhook: WebhookLike) {
  return {
    id: webhook.id,
    label: webhook.label ?? null,
    displayLabel: getWebhookDisplayLabel(webhook.label),
    url: webhook.url ?? null,
    status: getWebhookStatus(webhook),
    scope: getWebhookScope(webhook),
    enabled: webhook.enabled,
    archivedAt: webhook.archivedAt ?? null,
    allPublicTeams: webhook.allPublicTeams,
    resourceTypes: webhook.resourceTypes,
    createdAt: webhook.createdAt,
    updatedAt: webhook.updatedAt,
    team: buildWebhookTeamPayload(webhook.team),
    creator: buildWebhookCreatorPayload(webhook.creator),
  }
}
