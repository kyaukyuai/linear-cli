import type { IssueCreateInput } from "../../__codegen__/graphql.ts"

type IssueIdentifierRef = {
  id: string
  identifier: string
}

type IssueDraftParentRef = {
  id: string
  identifier: string
  title?: string | null
} | null

type IssueDraftTeamRef = {
  id: string
  key: string
}

type IssueDraftProjectRef = {
  id: string | null
  nameOrSlug: string | null
}

type IssueDraftAttachmentRef = {
  path: string
  filename: string
}

export function buildIssueCreateDryRunPayload(options: {
  input: IssueCreateInput
  team: IssueDraftTeamRef
  project: IssueDraftProjectRef
  parent: IssueDraftParentRef
  start: boolean
}) {
  return {
    command: "issue.create",
    start: options.start,
    team: options.team,
    project: options.project,
    input: normalizeIssueCreateInput(options.input, options.parent),
  }
}

export function buildIssueUpdateDryRunPayload(options: {
  issue: { identifier: string }
  input: Record<string, string | number | string[] | null | undefined>
  parent: IssueDraftParentRef
  comment?: string | null
}) {
  const { parentId: _parentId, ...rest } = options.input

  return {
    command: "issue.update",
    issue: options.issue,
    changes: compactRecord({
      ...rest,
      parent: options.parent,
    }),
    comment: options.comment ?? null,
  }
}

export function buildIssueCommentDryRunPayload(options: {
  issue: IssueIdentifierRef
  body: string
  parentId?: string
  attachments: IssueDraftAttachmentRef[]
}) {
  return {
    command: "issue.comment.add",
    issue: options.issue,
    body: options.body,
    parentId: options.parentId ?? null,
    attachments: options.attachments,
  }
}

export function buildIssueRelationDryRunPayload(options: {
  command: "issue.relation.add" | "issue.relation.delete"
  direction: "outgoing" | "incoming"
  relationType: string
  issue: IssueIdentifierRef
  relatedIssue: IssueIdentifierRef
}) {
  return {
    command: options.command,
    direction: options.direction,
    relationType: options.relationType,
    issue: options.issue,
    relatedIssue: options.relatedIssue,
  }
}

export function buildIssueCreateBatchDryRunPayload(options: {
  team: IssueDraftTeamRef
  project: IssueDraftProjectRef
  parent: IssueCreateInput
  children: IssueCreateInput[]
}) {
  return {
    command: "issue.create-batch",
    team: options.team,
    project: options.project,
    parent: normalizeIssueCreateInput(options.parent, null),
    children: options.children.map((child) =>
      normalizeIssueCreateInput(child, {
        id: "(created parent issue id)",
        identifier: "(parent issue created in batch)",
      })
    ),
    counts: {
      totalPlanned: options.children.length + 1,
      childCount: options.children.length,
    },
  }
}

function normalizeIssueCreateInput(
  input: IssueCreateInput,
  parent: IssueDraftParentRef,
) {
  return compactRecord({
    title: input.title,
    description: input.description ?? null,
    assigneeId: input.assigneeId ?? null,
    dueDate: input.dueDate ?? null,
    parent,
    priority: input.priority ?? null,
    estimate: input.estimate ?? null,
    labelIds: input.labelIds ?? [],
    teamId: input.teamId,
    projectId: input.projectId ?? null,
    projectMilestoneId: input.projectMilestoneId ?? null,
    cycleId: input.cycleId ?? null,
    stateId: input.stateId ?? null,
    useDefaultTemplate: input.useDefaultTemplate ?? true,
  })
}

function compactRecord<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  )
}
