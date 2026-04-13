import { assertEquals } from "@std/assert"
import {
  buildWriteApplyOperationFromReceipt,
  buildWritePreviewOperation,
  buildWritePreviewOperationFromPayload,
  withWriteOperationContract,
} from "../../src/utils/write_operation.ts"

Deno.test("buildWritePreviewOperation normalizes refs and defaults to apply", () => {
  assertEquals(
    buildWritePreviewOperation({
      command: "issue.update",
      resource: "issue",
      action: "update",
      summary: "Would update issue ENG-123",
      autonomyPolicy: {
        family: "source_intake_autonomy_policy",
        version: "v1",
        selected: "preview-required",
        semantics: {
          requiresDryRun: true,
          allowsMutation: false,
          allowsTriageApply: true,
        },
      },
      refs: {
        issueIdentifier: "ENG-123",
        state: null,
        teamKey: undefined,
      },
      changes: ["state", "comment"],
    }),
    {
      family: "write_operation",
      version: "v1",
      phase: "preview",
      command: "issue.update",
      resource: "issue",
      action: "update",
      summary: "Would update issue ENG-123",
      refs: {
        issueIdentifier: "ENG-123",
        state: null,
      },
      changes: ["state", "comment"],
      noOp: false,
      partialSuccess: false,
      nextSafeAction: "apply",
      autonomyPolicy: {
        family: "source_intake_autonomy_policy",
        version: "v1",
        selected: "preview-required",
        semantics: {
          requiresDryRun: true,
          allowsMutation: false,
          allowsTriageApply: true,
        },
      },
    },
  )
})

Deno.test("buildWritePreviewOperationFromPayload derives refs and changes", () => {
  assertEquals(
    buildWritePreviewOperationFromPayload(
      "Would create webhook for https://example.com",
      {
        command: "webhook.create",
        operation: "create",
        target: {
          resource: "webhook",
          url: "https://example.com",
        },
        changes: {
          input: {
            enabled: true,
          },
        },
      },
    ),
    {
      family: "write_operation",
      version: "v1",
      phase: "preview",
      command: "webhook.create",
      resource: "webhook",
      action: "create",
      summary: "Would create webhook for https://example.com",
      refs: {
        url: "https://example.com",
      },
      changes: ["input"],
      noOp: false,
      partialSuccess: false,
      nextSafeAction: "apply",
    },
  )
})

Deno.test("buildWriteApplyOperationFromReceipt mirrors receipt semantics", () => {
  assertEquals(
    buildWriteApplyOperationFromReceipt("Updated issue ENG-123", {
      operationId: "issue.update",
      resource: "issue",
      action: "update",
      resolvedRefs: {
        issueIdentifier: "ENG-123",
      },
      appliedChanges: ["state", "comment"],
      noOp: false,
      partialSuccess: false,
      nextSafeAction: "read_before_retry",
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
    }),
    {
      family: "write_operation",
      version: "v1",
      phase: "apply",
      command: "issue.update",
      resource: "issue",
      action: "update",
      summary: "Updated issue ENG-123",
      refs: {
        issueIdentifier: "ENG-123",
      },
      changes: ["state", "comment"],
      noOp: false,
      partialSuccess: false,
      nextSafeAction: "read_before_retry",
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
    },
  )
})

Deno.test("withWriteOperationContract appends operation metadata", () => {
  const operation = buildWritePreviewOperation({
    command: "issue.create",
    resource: "issue",
    action: "create",
    summary: "Would create issue in ENG",
  })

  assertEquals(
    withWriteOperationContract(
      {
        id: "issue-1",
      },
      operation,
    ),
    {
      id: "issue-1",
      operation,
    },
  )
})
