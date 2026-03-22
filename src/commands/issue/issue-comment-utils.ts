import type { CommentCreateInput } from "../../__codegen__/graphql.ts"
import { CliError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { withSpinner } from "../../utils/spinner.ts"
import type { IssueCommentPayloadComment } from "./issue-comment-payload.ts"

const addCommentMutation = `
  mutation AddComment($input: CommentCreateInput!) {
    commentCreate(input: $input) {
      success
      comment {
        id
        body
        createdAt
        url
        parent {
          id
        }
        issue {
          id
          identifier
          title
          url
        }
        user {
          name
          displayName
        }
      }
    }
  }
`

type AddCommentMutationResponse = {
  commentCreate: {
    success: boolean
    comment: IssueCommentPayloadComment | null
  }
}

export async function createIssueComment(
  input: CommentCreateInput,
  options?: { spinnerEnabled?: boolean },
): Promise<IssueCommentPayloadComment> {
  const client = getGraphQLClient()
  const data = await withSpinner(
    () =>
      client.request<AddCommentMutationResponse, { input: CommentCreateInput }>(
        addCommentMutation,
        { input },
      ),
    { enabled: options?.spinnerEnabled ?? true },
  )

  if (!data.commentCreate.success) {
    throw new CliError("Failed to create comment")
  }

  const comment = data.commentCreate.comment
  if (!comment) {
    throw new CliError("Comment creation failed - no comment returned")
  }

  return comment
}
