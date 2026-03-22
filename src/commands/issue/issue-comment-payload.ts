export type IssueCommentPayloadIssue = {
  id: string
  identifier: string
  title: string | null
  url: string | null
}

export type IssueCommentPayloadComment = {
  id: string
  body: string
  createdAt: string
  url: string
  parent?: {
    id: string
  } | null
  issue?: IssueCommentPayloadIssue | null
  user?: {
    name: string
    displayName: string
  } | null
}

export function buildIssueCommentPayload(
  comment: IssueCommentPayloadComment,
  fallbackIssue: IssueCommentPayloadIssue,
) {
  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    url: comment.url,
    parentId: comment.parent?.id ?? null,
    issue: comment.issue
      ? {
        id: comment.issue.id,
        identifier: comment.issue.identifier,
        title: comment.issue.title,
        url: comment.issue.url,
      }
      : fallbackIssue,
    user: comment.user
      ? {
        name: comment.user.name,
        displayName: comment.user.displayName,
      }
      : null,
  }
}
