export type IssueWritePayloadIssue = {
  id: string
  identifier: string
  title: string
  url: string
  dueDate?: string | null
  assignee?: {
    id: string
    name: string
    displayName: string
    initials?: string | null
  } | null
  parent?: {
    id: string
    identifier: string
    title: string
    url: string
    dueDate?: string | null
    state?: {
      name: string
      color: string
    } | null
  } | null
  state?: {
    name: string
    color: string
  } | null
}

export function buildIssueWritePayload(issue: IssueWritePayloadIssue) {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    dueDate: issue.dueDate ?? null,
    assignee: issue.assignee == null ? null : {
      id: issue.assignee.id,
      name: issue.assignee.name,
      displayName: issue.assignee.displayName,
      initials: issue.assignee.initials ?? null,
    },
    parent: issue.parent == null ? null : {
      id: issue.parent.id,
      identifier: issue.parent.identifier,
      title: issue.parent.title,
      url: issue.parent.url,
      dueDate: issue.parent.dueDate ?? null,
      state: issue.parent.state ?? null,
    },
    state: issue.state ?? null,
  }
}
