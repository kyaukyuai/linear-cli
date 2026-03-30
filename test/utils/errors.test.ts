import { assertEquals } from "@std/assert"
import {
  AuthError,
  CliError,
  extractGraphQLMessage,
  getErrorSuggestion,
  getExitCode,
  getRateLimitDetails,
  isClientError,
  isDebugMode,
  isNotFoundError,
  NotFoundError,
  PlanLimitError,
  ValidationError,
  WriteTimeoutError,
} from "../../src/utils/errors.ts"
import { ClientError, type GraphQLResponse } from "graphql-request"

Deno.test("isDebugMode - returns false when LINEAR_DEBUG is not set", () => {
  Deno.env.delete("LINEAR_DEBUG")
  assertEquals(isDebugMode(), false)
})

Deno.test("isDebugMode - returns true when LINEAR_DEBUG is '1'", () => {
  Deno.env.set("LINEAR_DEBUG", "1")
  try {
    assertEquals(isDebugMode(), true)
  } finally {
    Deno.env.delete("LINEAR_DEBUG")
  }
})

Deno.test("isDebugMode - returns true when LINEAR_DEBUG is 'true'", () => {
  Deno.env.set("LINEAR_DEBUG", "true")
  try {
    assertEquals(isDebugMode(), true)
  } finally {
    Deno.env.delete("LINEAR_DEBUG")
  }
})

Deno.test("CliError - stores user message", () => {
  const error = new CliError("Something went wrong")
  assertEquals(error.userMessage, "Something went wrong")
  assertEquals(error.message, "Something went wrong")
})

Deno.test("CliError - stores suggestion", () => {
  const error = new CliError("Something went wrong", {
    suggestion: "Try running with --force",
  })
  assertEquals(error.suggestion, "Try running with --force")
})

Deno.test("NotFoundError - formats message correctly", () => {
  const error = new NotFoundError("Issue", "ENG-123")
  assertEquals(error.userMessage, "Issue not found: ENG-123")
  assertEquals(error.entityType, "Issue")
  assertEquals(error.identifier, "ENG-123")
})

Deno.test("ValidationError - stores message and suggestion", () => {
  const error = new ValidationError("Invalid relation type: foo", {
    suggestion: "Must be one of: blocks, related",
  })
  assertEquals(error.userMessage, "Invalid relation type: foo")
  assertEquals(error.suggestion, "Must be one of: blocks, related")
})

// Helper to create test ClientError instances
function createClientError(
  message: string,
  options?: {
    headers?: Headers
    status?: number
    userPresentableMessage?: string
  },
): ClientError {
  const response = {
    status: options?.status ?? 200,
    headers: options?.headers ?? new Headers(),
    body: JSON.stringify({ errors: [{ message }] }),
    errors: [
      {
        message,
        extensions: options?.userPresentableMessage
          ? { userPresentableMessage: options.userPresentableMessage }
          : undefined,
      },
    ],
  } as unknown as GraphQLResponse<unknown>
  return new ClientError(response, { query: "query {}" })
}

Deno.test("extractGraphQLMessage - extracts userPresentableMessage", () => {
  const error = createClientError("Internal error", {
    userPresentableMessage: "Issue not found",
  })
  assertEquals(extractGraphQLMessage(error), "Issue not found")
})

Deno.test("extractGraphQLMessage - falls back to error message", () => {
  const error = createClientError("Entity not found: Issue")
  assertEquals(extractGraphQLMessage(error), "Entity not found: Issue")
})

Deno.test("isNotFoundError - returns true for 'not found' messages", () => {
  const error = createClientError("Entity not found: Issue")
  assertEquals(isNotFoundError(error), true)
})

Deno.test("isNotFoundError - returns false for other errors", () => {
  const error = createClientError("Authentication required")
  assertEquals(isNotFoundError(error), false)
})

Deno.test("isClientError - returns true for ClientError", () => {
  const error = createClientError("Some error")
  assertEquals(isClientError(error), true)
})

Deno.test("isClientError - returns false for other errors", () => {
  const error = new Error("Some error")
  assertEquals(isClientError(error), false)
})

Deno.test("getExitCode - returns 4 for auth errors", () => {
  assertEquals(getExitCode(new AuthError("Authentication required")), 4)
  assertEquals(
    getExitCode(createClientError("Authentication required", { status: 401 })),
    4,
  )
})

Deno.test("getExitCode - returns 5 for plan limit errors", () => {
  const error = createClientError("Internal error", {
    userPresentableMessage:
      "You've reached the issue limit for the free plan. Upgrade or archive issues to continue.",
  })

  assertEquals(getExitCode(error), 5)
  assertEquals(getExitCode(new PlanLimitError("Issue limit reached")), 5)
  assertEquals(
    getExitCode(new CliError("Create failed", { cause: error })),
    5,
  )
})

Deno.test("getExitCode - returns 1 for generic errors", () => {
  assertEquals(getExitCode(new Error("boom")), 1)
  assertEquals(getExitCode(new CliError("Something went wrong")), 1)
})

Deno.test("getExitCode - returns 6 for write timeout errors", () => {
  assertEquals(getExitCode(new WriteTimeoutError("issue update", 30_000)), 6)
  assertEquals(
    getExitCode(
      new CliError("Wrapped timeout", {
        cause: new WriteTimeoutError("issue update", 30_000),
      }),
    ),
    6,
  )
})

Deno.test("getRateLimitDetails - extracts rate limit headers", () => {
  const error = createClientError("Too many requests", {
    status: 429,
    headers: new Headers({
      "Retry-After": "60",
      "X-RateLimit-Limit": "5",
      "X-RateLimit-Remaining": "0",
      "X-RateLimit-Reset": "1711260000",
    }),
  })

  assertEquals(getRateLimitDetails(error), {
    retryAfter: "60",
    limit: "5",
    remaining: "0",
    reset: "1711260000",
  })
})

Deno.test("getErrorSuggestion - uses Retry-After for rate limits", () => {
  const error = createClientError("Too many requests", {
    status: 429,
    headers: new Headers({
      "Retry-After": "60",
    }),
  })

  assertEquals(
    getErrorSuggestion(error),
    "Retry after 60 seconds before creating more issues.",
  )
})
