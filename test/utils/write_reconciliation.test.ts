import { assertEquals, assertRejects } from "@std/assert"
import { CliError, WriteTimeoutError } from "../../src/utils/errors.ts"
import {
  buildReconciledTimeoutError,
  reconcileWriteTimeoutError,
} from "../../src/utils/write_reconciliation.ts"

Deno.test("buildReconciledTimeoutError updates timeout outcome", () => {
  const error = buildReconciledTimeoutError(
    new WriteTimeoutError("issue update", 30_000),
    {
      outcome: "probably_succeeded",
      details: {
        matchedFields: ["assignee"],
      },
    },
  )

  if (!(error instanceof WriteTimeoutError)) {
    throw new Error("Expected WriteTimeoutError")
  }

  assertEquals(error.details, {
    failureMode: "timeout_waiting_for_confirmation",
    timeoutMs: 30000,
    operation: "issue update",
    outcome: "probably_succeeded",
    appliedState: "applied",
    callerGuidance: {
      nextAction: "treat_as_applied",
      readBeforeRetry: false,
    },
    reconciliationAttempted: true,
    matchedFields: ["assignee"],
  })
})

Deno.test("buildReconciledTimeoutError preserves wrapped CliError message", () => {
  const error = buildReconciledTimeoutError(
    new CliError(
      "Issue ENG-123 was updated, but adding the comment timed out.",
      {
        cause: new WriteTimeoutError("issue comment creation", 45_000),
        details: {
          partialSuccess: {
            issueUpdated: true,
          },
        },
      },
    ),
    {
      outcome: "partial_success",
      details: {
        commentObserved: false,
      },
    },
  )

  if (!(error instanceof CliError)) {
    throw new Error("Expected CliError")
  }

  assertEquals(
    error.userMessage,
    "Issue ENG-123 was updated, but adding the comment timed out.",
  )
  assertEquals(error.details, {
    partialSuccess: {
      issueUpdated: true,
    },
    failureMode: "timeout_waiting_for_confirmation",
    timeoutMs: 45000,
    operation: "issue comment creation",
    outcome: "partial_success",
    appliedState: "partially_applied",
    callerGuidance: {
      nextAction: "resume_partial_write",
      readBeforeRetry: false,
    },
    reconciliationAttempted: true,
    commentObserved: false,
  })
})

Deno.test("reconcileWriteTimeoutError falls back to the original timeout error", async () => {
  const error = new WriteTimeoutError("issue relation creation", 10)

  const thrown = await assertRejects(
    () =>
      reconcileWriteTimeoutError(error, () => {
        throw new Error("reconciliation failed")
      }),
    WriteTimeoutError,
  )

  assertEquals(thrown.details, {
    failureMode: "timeout_waiting_for_confirmation",
    timeoutMs: 10,
    operation: "issue relation creation",
    outcome: "unknown",
    appliedState: "unknown",
    callerGuidance: {
      nextAction: "reconcile_before_retry",
      readBeforeRetry: true,
    },
  })
})
