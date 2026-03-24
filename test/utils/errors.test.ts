import { assertEquals } from "@std/assert"
import {
  AuthError,
  CliError,
  extractGraphQLMessage,
  getExitCode,
  isClientError,
  isDebugMode,
  isNotFoundError,
  NotFoundError,
  PlanLimitError,
  ValidationError,
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
    status?: number
    userPresentableMessage?: string
  },
): ClientError {
  const response = {
    status: options?.status ?? 200,
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
