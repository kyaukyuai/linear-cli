import type { GraphQLClient } from "graphql-request"
import { gql } from "../../__codegen__/gql.ts"
import type { IssueCommentPayloadIssue } from "./issue-comment-payload.ts"
import { buildIssueCommentPayload } from "./issue-comment-payload.ts"
import type { IssueWritePayloadIssue } from "./issue-write-payload.ts"
import { buildIssueWritePayload } from "./issue-write-payload.ts"
import type { WriteReconciliationResult } from "../../utils/write_reconciliation.ts"

export type IssueUpdateReconciliationInput = {
  title?: string
  assigneeId?: string
  dueDate?: string | null
  parentId?: string
  priority?: number
  estimate?: number
  description?: string
  labelIds?: string[]
  teamId?: string
  projectId?: string
  projectMilestoneId?: string
  cycleId?: string
  stateId?: string
}

const GetIssueForTimeoutReconciliation = gql(`
  query GetIssueForTimeoutReconciliation($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      url
      dueDate
      priority
      estimate
      description
      assignee {
        id
        name
        displayName
        initials
      }
      parent {
        id
        identifier
        title
        url
        dueDate
        state {
          name
          color
        }
      }
      state {
        id
        name
        color
      }
      labels {
        nodes {
          id
        }
      }
      team {
        id
      }
      project {
        id
      }
      projectMilestone {
        id
      }
      cycle {
        id
      }
    }
  }
`)

const GetIssueCommentsForTimeoutReconciliation = gql(`
  query GetIssueCommentsForTimeoutReconciliation($id: String!) {
    issue(id: $id) {
      id
      identifier
      title
      url
      comments(first: 50, orderBy: createdAt) {
        nodes {
          id
          body
          createdAt
          url
          parent {
            id
          }
          user {
            name
            displayName
          }
        }
      }
    }
  }
`)

export async function reconcileIssueUpdateTimeout(
  client: GraphQLClient,
  issueIdentifier: string,
  input: IssueUpdateReconciliationInput,
): Promise<WriteReconciliationResult | null> {
  const data = await client.request(GetIssueForTimeoutReconciliation, {
    id: issueIdentifier,
  })
  const issue = data.issue
  if (issue == null) {
    return null
  }

  const matchedFields: string[] = []
  const unmatchedFields: string[] = []

  evaluateFieldMatch(
    input.title,
    issue.title,
    "title",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.assigneeId,
    issue.assignee?.id,
    "assignee",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.dueDate,
    issue.dueDate ?? null,
    "dueDate",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.parentId,
    issue.parent?.id,
    "parent",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.priority,
    issue.priority ?? undefined,
    "priority",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.estimate,
    issue.estimate ?? undefined,
    "estimate",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.description,
    issue.description ?? undefined,
    "description",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.teamId,
    issue.team?.id,
    "team",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.projectId,
    issue.project?.id,
    "project",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.projectMilestoneId,
    issue.projectMilestone?.id,
    "milestone",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.cycleId,
    issue.cycle?.id,
    "cycle",
    matchedFields,
    unmatchedFields,
  )
  evaluateFieldMatch(
    input.stateId,
    issue.state?.id,
    "state",
    matchedFields,
    unmatchedFields,
  )

  if (input.labelIds != null) {
    const expected = [...input.labelIds].sort()
    const actual = [...(issue.labels?.nodes ?? []).map((label) => label.id)]
      .sort()
    if (arraysEqual(expected, actual)) {
      matchedFields.push("labels")
    } else {
      unmatchedFields.push("labels")
    }
  }

  const observedIssue = buildIssueWritePayload(issue as IssueWritePayloadIssue)

  if (matchedFields.length === 0 && unmatchedFields.length === 0) {
    return null
  }

  if (unmatchedFields.length === 0) {
    return {
      outcome: "probably_succeeded",
      suggestion:
        "Linear now shows the requested issue state. Treat this write as succeeded unless you need stronger confirmation.",
      details: {
        matchedFields,
        observedIssue,
      },
    }
  }

  if (matchedFields.length === 0) {
    return {
      outcome: "definitely_failed",
      suggestion:
        "Linear does not yet show the requested issue state. Re-check the issue before retrying this write.",
      details: {
        unmatchedFields,
        observedIssue,
      },
    }
  }

  return {
    outcome: "partial_success",
    suggestion:
      "Linear shows some requested issue changes, but not all. Inspect the matched and unmatched fields before retrying.",
    details: {
      matchedFields,
      unmatchedFields,
      partialSuccess: {
        issueUpdated: true,
        issue: observedIssue,
        matchedFields,
        unmatchedFields,
      },
    },
  }
}

export async function findIssueCommentForTimeoutReconciliation(
  client: GraphQLClient,
  issueIdentifier: string,
  body: string,
  options: {
    parentId?: string
    fallbackIssue?: IssueCommentPayloadIssue
  } = {},
) {
  const data = await client.request(GetIssueCommentsForTimeoutReconciliation, {
    id: issueIdentifier,
  })
  const issue = data.issue
  if (issue == null) {
    return null
  }

  const comment = (issue.comments?.nodes ?? []).find((candidate) => {
    if (candidate.body !== body) {
      return false
    }

    if (options.parentId != null) {
      return candidate.parent?.id === options.parentId
    }

    return candidate.parent == null
  })

  if (comment == null) {
    return null
  }

  return buildIssueCommentPayload(
    comment,
    options.fallbackIssue ?? {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      url: issue.url,
    },
  )
}

function evaluateFieldMatch<T>(
  expected: T | undefined,
  actual: T | undefined | null,
  field: string,
  matchedFields: string[],
  unmatchedFields: string[],
): void {
  if (expected === undefined) {
    return
  }

  if (expected === actual) {
    matchedFields.push(field)
    return
  }

  unmatchedFields.push(field)
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false
  }

  return a.every((value, index) => value === b[index])
}
