import { assertEquals } from "@std/assert"
import { buildPartialSuccessDetails } from "../../src/utils/retry_semantics.ts"

Deno.test("buildPartialSuccessDetails returns the shared partial-success shape", () => {
  assertEquals(
    buildPartialSuccessDetails(
      {
        issueUpdated: true,
      },
      {
        failureStage: "comment_create",
        retryable: true,
        retryCommand: 'linear issue comment add ENG-123 --body "hi"',
        extraDetails: {
          failureMode: "timeout",
        },
      },
    ),
    {
      failureStage: "comment_create",
      retryable: true,
      retryCommand: 'linear issue comment add ENG-123 --body "hi"',
      partialSuccess: {
        issueUpdated: true,
      },
      failureMode: "timeout",
    },
  )
})
