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

Deno.test("buildOperationReceipt preserves source provenance when provided", () => {
  const receipt = buildOperationReceipt({
    operationId: "issue.update",
    resource: "issue",
    action: "update",
    resolvedRefs: {
      issueIdentifier: "ENG-123",
    },
    appliedChanges: ["state", "comment"],
    nextSafeAction: "read_before_retry",
    sourceProvenance: {
      version: "v1",
      target: "comment",
      source: {
        system: "slack",
        ref: "thread-1",
        url: "https://example.slack.com/archives/C1/p1",
        title: "Auth incident",
        capturedAt: "2026-04-13T00:00:00Z",
      },
      contextIds: {
        customerId: "cust_123",
      },
      evidenceRefs: ["https://example.com/auth-refresh.log"],
      relatedUrls: [
        "https://example.slack.com/archives/C1/p1",
        "https://example.com/auth-refresh.log",
      ],
      participantHandles: ["alice"],
      metadataKeys: ["customerId"],
      triage: {
        applied: true,
        team: "ENG",
        state: "triage",
        labels: ["incident"],
        duplicateIssueRefs: ["ENG-88"],
        relatedIssueRefs: ["ENG-42"],
      },
    },
  })

  assertEquals(receipt.sourceProvenance?.source.system, "slack")
  assertEquals(receipt.sourceProvenance?.contextIds.customerId, "cust_123")
  assertEquals(receipt.sourceProvenance?.triage?.applied, true)
})

Deno.test("buildOperationReceipt preserves autonomy policy when provided", () => {
  const receipt = buildOperationReceipt({
    operationId: "issue.create",
    resource: "issue",
    action: "create",
    resolvedRefs: {
      teamKey: "ENG",
    },
    appliedChanges: ["title"],
    autonomyPolicy: {
      family: "source_intake_autonomy_policy",
      version: "v1",
      selected: "apply-allowed",
      semantics: {
        requiresDryRun: false,
        allowsMutation: true,
        allowsTriageApply: true,
      },
    },
  })

  assertEquals(receipt.autonomyPolicy?.selected, "apply-allowed")
  assertEquals(receipt.autonomyPolicy?.semantics.allowsMutation, true)
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
