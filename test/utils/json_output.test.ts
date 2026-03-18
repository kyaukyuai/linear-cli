import { assertEquals } from "@std/assert"
import { fromFileUrl } from "@std/path"
import { ClientError, type GraphQLResponse } from "graphql-request"
import {
  AuthError,
  CliError,
  NotFoundError,
  ValidationError,
} from "../../src/utils/errors.ts"
import { buildJsonErrorEnvelope } from "../../src/utils/json_output.ts"

function createClientError(
  message: string,
  options?: {
    status?: number
    userPresentableMessage?: string
  },
): ClientError {
  const response = {
    status: options?.status ?? 200,
    errors: [{
      message,
      extensions: options?.userPresentableMessage == null
        ? undefined
        : { userPresentableMessage: options.userPresentableMessage },
    }],
  } as unknown as GraphQLResponse<unknown>

  return new ClientError(response, { query: "query {}", variables: {} })
}

Deno.test("buildJsonErrorEnvelope maps ValidationError", () => {
  const envelope = buildJsonErrorEnvelope(
    new ValidationError("Invalid team", {
      suggestion: "Use `linear team list`.",
    }),
    "Failed to fetch team members",
  )

  assertEquals(envelope, {
    success: false,
    error: {
      type: "validation_error",
      message: "Invalid team",
      suggestion: "Use `linear team list`.",
      context: "Failed to fetch team members",
    },
  })
})

Deno.test("buildJsonErrorEnvelope maps NotFoundError", () => {
  const envelope = buildJsonErrorEnvelope(
    new NotFoundError("Issue", "ENG-999"),
    "Failed to view issue",
  )

  assertEquals(envelope.error.type, "not_found")
  assertEquals(envelope.error.message, "Issue not found: ENG-999")
  assertEquals(envelope.error.suggestion, null)
  assertEquals(envelope.error.context, "Failed to view issue")
})

Deno.test("buildJsonErrorEnvelope maps AuthError", () => {
  const envelope = buildJsonErrorEnvelope(
    new AuthError("Authentication required"),
  )

  assertEquals(envelope.error.type, "auth_error")
  assertEquals(envelope.error.message, "Authentication required")
  assertEquals(
    envelope.error.suggestion,
    "Run `linear auth login` to authenticate.",
  )
  assertEquals(envelope.error.context, null)
})

Deno.test("buildJsonErrorEnvelope maps generic CliError", () => {
  const envelope = buildJsonErrorEnvelope(new CliError("Something went wrong"))

  assertEquals(envelope.error.type, "cli_error")
  assertEquals(envelope.error.message, "Something went wrong")
  assertEquals(envelope.error.suggestion, null)
})

Deno.test("buildJsonErrorEnvelope maps GraphQL not found errors", () => {
  const envelope = buildJsonErrorEnvelope(
    createClientError("Issue not found: ENG-999"),
    "Failed to view issue",
  )

  assertEquals(envelope.error.type, "not_found")
  assertEquals(envelope.error.message, "Issue not found: ENG-999")
  assertEquals(envelope.error.suggestion, null)
  assertEquals(envelope.error.context, "Failed to view issue")
})

Deno.test("buildJsonErrorEnvelope maps GraphQL auth errors", () => {
  const envelope = buildJsonErrorEnvelope(
    createClientError("Authentication required", { status: 401 }),
  )

  assertEquals(envelope.error.type, "auth_error")
  assertEquals(envelope.error.message, "Authentication required")
  assertEquals(
    envelope.error.suggestion,
    "Run `linear auth login` to authenticate.",
  )
})

Deno.test("buildJsonErrorEnvelope maps generic GraphQL errors", () => {
  const envelope = buildJsonErrorEnvelope(
    createClientError("Mutation failed"),
    "Failed to update issue",
  )

  assertEquals(envelope.error.type, "graphql_error")
  assertEquals(envelope.error.message, "Mutation failed")
  assertEquals(envelope.error.suggestion, null)
})

Deno.test("buildJsonErrorEnvelope maps unknown errors", () => {
  const envelope = buildJsonErrorEnvelope("bad input")

  assertEquals(envelope.error.type, "unknown_error")
  assertEquals(envelope.error.message, "bad input")
  assertEquals(envelope.error.suggestion, null)
  assertEquals(envelope.error.context, null)
})

Deno.test("buildJsonErrorEnvelope maps Cliffy ValidationError by name", () => {
  const error = new Error('Missing value for option "--query".')
  error.name = "ValidationError"

  const envelope = buildJsonErrorEnvelope(error, "Failed to list issues")

  assertEquals(envelope.error.type, "validation_error")
  assertEquals(envelope.error.message, 'Missing value for option "--query".')
  assertEquals(envelope.error.suggestion, null)
  assertEquals(envelope.error.context, "Failed to list issues")
})

Deno.test("handleJsonError exits non-zero and writes one JSON document to stdout", async () => {
  const scriptPath = await Deno.makeTempFile({ suffix: ".ts" })
  const repoRoot = fromFileUrl(new URL("../../", import.meta.url))
  const denoJsonPath = fromFileUrl(new URL("../../deno.json", import.meta.url))
  const jsonOutputPath = new URL(
    "../../src/utils/json_output.ts",
    import.meta.url,
  ).href
  const errorsPath = new URL("../../src/utils/errors.ts", import.meta.url).href

  await Deno.writeTextFile(
    scriptPath,
    `import { handleJsonError } from "${jsonOutputPath}"
import { ValidationError } from "${errorsPath}"

handleJsonError(
  new ValidationError("Query cannot be empty", {
    suggestion: "Provide --query with at least one non-whitespace character.",
  }),
  "Failed to list issues",
)`,
  )

  try {
    const output = await new Deno.Command("deno", {
      args: ["run", "-c", denoJsonPath, "--allow-all", scriptPath],
      cwd: repoRoot,
      stdout: "piped",
      stderr: "piped",
    }).output()

    assertEquals(output.success, false)
    assertEquals(output.code, 1)
    assertEquals(new TextDecoder().decode(output.stderr), "")
    assertEquals(
      JSON.parse(new TextDecoder().decode(output.stdout)),
      {
        success: false,
        error: {
          type: "validation_error",
          message: "Query cannot be empty",
          suggestion:
            "Provide --query with at least one non-whitespace character.",
          context: "Failed to list issues",
        },
      },
    )
  } finally {
    await Deno.remove(scriptPath)
  }
})
