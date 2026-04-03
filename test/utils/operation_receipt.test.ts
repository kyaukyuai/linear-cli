import { assertEquals } from "@std/assert"
import {
  buildOperationReceipt,
  withOperationReceipt,
} from "../../src/utils/operation_receipt.ts"

Deno.test("buildOperationReceipt drops undefined refs and preserves nulls", () => {
  const receipt = buildOperationReceipt({
    operationId: "issue.update",
    resource: "issue",
    action: "update",
    resolvedRefs: {
      issueIdentifier: "ENG-123",
      state: null,
      teamKey: undefined,
    },
    appliedChanges: ["state"],
    nextSafeAction: "continue",
  })

  assertEquals(receipt, {
    operationId: "issue.update",
    resource: "issue",
    action: "update",
    resolvedRefs: {
      issueIdentifier: "ENG-123",
      state: null,
    },
    appliedChanges: ["state"],
    noOp: false,
    partialSuccess: false,
    nextSafeAction: "continue",
  })
})

Deno.test("withOperationReceipt appends receipt without changing payload fields", () => {
  const receipt = buildOperationReceipt({
    operationId: "issue.comment.add",
    resource: "comment",
    action: "add",
    resolvedRefs: {
      issueIdentifier: "ENG-123",
    },
    appliedChanges: ["comment"],
    nextSafeAction: "read_before_retry",
  })

  assertEquals(
    withOperationReceipt(
      {
        id: "comment-1",
        body: "Ready",
      },
      receipt,
    ),
    {
      id: "comment-1",
      body: "Ready",
      receipt,
    },
  )
})
