type DocumentCreatorLike = {
  name: string
  displayName?: string | null
  email?: string | null
}

type DocumentProjectLike = {
  id?: string | null
  name: string
  slugId: string
  url?: string | null
}

type DocumentIssueLike = {
  id?: string | null
  identifier: string
  title: string
  url?: string | null
}

type DocumentLike = {
  id: string
  title: string
  slugId: string
  content?: string | null
  url: string
  createdAt?: string | null
  updatedAt: string
  creator?: DocumentCreatorLike | null
  project?: DocumentProjectLike | null
  issue?: DocumentIssueLike | null
}

function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  if (value == null || value === "") {
    return null
  }
  return value
}

function buildDocumentCreatorPayload(
  creator: DocumentCreatorLike | null | undefined,
) {
  if (creator == null) {
    return null
  }

  return {
    name: creator.name,
    displayName: creator.displayName ?? null,
    email: creator.email ?? null,
  }
}

function buildDocumentProjectPayload(
  project: DocumentProjectLike | null | undefined,
) {
  if (project == null) {
    return null
  }

  return {
    id: project.id ?? null,
    name: project.name,
    slugId: project.slugId,
    url: project.url ?? null,
  }
}

function buildDocumentIssuePayload(
  issue: DocumentIssueLike | null | undefined,
) {
  if (issue == null) {
    return null
  }

  return {
    id: issue.id ?? null,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url ?? null,
  }
}

export function buildDocumentListJsonPayload(document: DocumentLike) {
  return {
    id: document.id,
    title: document.title,
    slugId: document.slugId,
    url: document.url,
    createdAt: document.createdAt ?? null,
    updatedAt: document.updatedAt,
    creator: buildDocumentCreatorPayload(document.creator),
    project: buildDocumentProjectPayload(document.project),
    issue: buildDocumentIssuePayload(document.issue),
  }
}

export function buildDocumentDetailJsonPayload(document: DocumentLike) {
  return {
    ...buildDocumentListJsonPayload(document),
    content: normalizeOptionalText(document.content),
  }
}
