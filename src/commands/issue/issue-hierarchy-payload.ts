type IssueHierarchyRef = {
  id: string
  identifier: string
  title: string
  url: string
  dueDate?: string | null
  state: {
    name: string
    color: string
  }
}

export function toIssueHierarchyRef(issue: IssueHierarchyRef) {
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    url: issue.url,
    dueDate: issue.dueDate ?? null,
    state: issue.state,
  }
}
