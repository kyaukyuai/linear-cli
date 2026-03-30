import type { GraphQLClient } from "graphql-request"
import type { CommentCreateInput } from "../../__codegen__/graphql.ts"
import { CliError } from "../../utils/errors.ts"
import { getGraphQLClient } from "../../utils/graphql.ts"
import { withSpinner } from "../../utils/spinner.ts"
import {
  buildWriteTimeoutSuggestion,
  withWriteTimeout,
} from "../../utils/write_timeout.ts"
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

export type CreateIssueCommentOptions = {
  spinnerEnabled?: boolean
  client?: GraphQLClient
  timeoutMs?: number
}

export async function createIssueComment(
  input: CommentCreateInput,
  options?: CreateIssueCommentOptions,
): Promise<IssueCommentPayloadComment> {
  const client = options?.client ?? getGraphQLClient()
  const data = await withSpinner(
    () => {
      if (options?.timeoutMs == null) {
        return client.request<
          AddCommentMutationResponse,
          { input: CommentCreateInput }
        >(
          addCommentMutation,
          { input },
        )
      }

      return withWriteTimeout(
        (signal) =>
          client.request<
            AddCommentMutationResponse,
            { input: CommentCreateInput }
          >({
            document: addCommentMutation,
            variables: { input },
            signal,
          }),
        {
          operation: "issue comment creation",
          timeoutMs: options.timeoutMs,
          suggestion: buildWriteTimeoutSuggestion(),
        },
      )
    },
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
